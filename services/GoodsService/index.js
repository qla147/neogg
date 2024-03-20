const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const {GoodsDetail, GoodsInfo} = require("../../models/mongo/GoodsInfo");
const {GoodsNumRedisModel} = require("../../models/redis/GoodsInfo")
const  GoodInfoEsModel= require("../../models/es/GoodsInfo")()
const {GoodsLockRedisModel} = require("../../models/redis/GoodsInfo")
const mongoose = require("../../common/db/mongo")
const {multipart} = require("formidable/src/plugins");

const service  = {}


/**
 * @desc  检测商品名称是否已经存在
 * @param goodsName {type: String, required : true } 商品名称
 * @param goodsId {type : Mongoose.Type.ObjectId, required : false }  商品ID
 * @param session {type : mongoose.sessionClient} mongo session
 * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
async function checkGoodsName (goodsName , goodsId , session ) {
    try{
        let search  = {goodsName}
        if ( goodsId ){
            search._id =  {$ne: goodsId}
        }

        let rs = await GoodsInfo.findOne(search , null ,{session})
        if (rs){
            return utils.Error(null , ErrorCode.GOODS_INFO_EXIST)
        }
        return utils.Success()

    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


/**
 *  @description 更新商品详情和商品信息
 *  @param goodsId {Mongoose.Type.ObjectId} 商品ID
 *  @param param {Object} 商品详情 & 商品信息
 */
service.updateGoods = async (goodsId , param )=>{
    let  session  ;
    // 商品锁
    let lock = false
    try{


        session = await  mongoose.startSession()

        const {goodsInfo , goodsDetail } = param

        //----------------------------------------------------检测合理性--------------------------------------------------


        // 检测存在否
        let oldGoodsInfo = await GoodsInfo.findOne({_id: goodsId},null ,{session})
        if (!oldGoodsInfo){
            return utils.Error(null, ErrorCode.GOODS_INFO_NOT_FOUND)
        }

        // 检测名称重复否
        if (goodsInfo.goodsName !== oldGoodsInfo.goodsName ){
            let checkRs = await checkGoodsName(goodsInfo.goodsName , goodsId , session)
            if (!checkRs.success){
                return checkRs
            }
        }



        // 判断是否需要加锁 。 只有涉及修改数量或者价格变动
        let needLock = goodsInfo.goodsPrice !== oldGoodsInfo.goodsPrice || goodsInfo.goodsCount !== oldGoodsInfo.goodsCount

        /**
         * @desc locked ------------------------------------------------------------------------------------------------
         */
        if (needLock){
            let rs = await GoodsLockRedisModel.lock(goodsId)
            if (!rs.success){
                return utils.Error(null , ErrorCode.LOCK_GOODS_INFO, "Locked! Please try later!")
            }

            if (rs.data){
                lock = true
            }else{
                return utils.Error(null , ErrorCode.LOCK_GOODS_INFO, "Locked! Please try later!")
            }
        }

        // 检测商品数量变化是否合理
        let goodsCountGap = goodsInfo.goodsCount - oldGoodsInfo.goodsCount
        if (goodsCountGap < 0 ){
            let remainedGoodsNumRs = await GoodsNumRedisModel.getCount(goodsId)
            if(!remainedGoodsNumRs.success){
                return remainedGoodsNumRs
            }

            if (remainedGoodsNumRs.data + goodsCountGap < 0 ){
                return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsCount")
            }
        }

        // 商品信息和商品详情更新入库
        goodsInfo.createTime = Date.now()
        await GoodsInfo.updateOne({_id: goodsId} , {$set: goodsInfo} , {upsert: false , WriteConcern:{w:"majority"} , session})

        goodsDetail.goodsId = goodsId
        goodsDetail.createTime = Date.now()
        await GoodsDetail.updateOne({goodsId} , {$set: goodsDetail } , {upsert: false , WriteConcern:{w:"majority"} , session})


        // 商品数量发生变化
        if(goodsCountGap !== 0  ){
            if(goodsCountGap > 0 ){
               let addRs =  await GoodsNumRedisModel.addMore(goodsId ,goodsCountGap )
                if (!addRs.success){
                    await session.abortTransaction()
                }
            }else{
                let subRs = await GoodsNumRedisModel.subMore(goodsId, Math.abs(goodsCountGap))
                if (!subRs.success){
                    await session.abortTransaction()
                }
            }
        }

        await session.commitTransaction()
        return utils.Success(null)

    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }finally {

        if (session){
            await session.endSession()
        }
        if (lock){
            await GoodsLockRedisModel.unlock(goodsId)
        }
    }
}

/**
 * @description 添加商品入库
 * @param params
 * @returns {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.addGoods = async (params)=>{
    let  session  ;
    try{
        let {goodsInfo , goodsDetail } = params
        //开启session
        session = await mongoose.startSession()
        await session.startTransaction()
        // 检测商品是否已经存在
        let goodsCount = await GoodsInfo.findOne({goodsName: goodsInfo.goodsName } , {_id:1},{session})
        if (goodsCount){
            return utils.Error(null , ErrorCode.GOODS_INFO_EXIST)
        }

        goodsInfo.createTime = Date.now()

        // 入库商品信息
        let goodsInfoModel  = new GoodsInfo(goodsInfo)
        goodsInfo = await goodsInfoModel.save({session})

        goodsDetail.goodsId = goodsInfo._id
        goodsDetail.createTime = Date.now()

        //入库商品详情
        let goodsDetailModel = new GoodsDetail(goodsDetail)
        await goodsDetailModel.save({session})
        // 入库redis
        let rs  = await GoodsNumRedisModel.initGoods(goodsInfo._id.toString(), goodsInfo.goodsCount)
        if(!rs.success){
            // 回滚mongodb
            await session.abortTransaction()
            return rs
        }

        // 入库es
        const {goodsType,goodsName, _id , goodsPrice} = goodsInfo
        let goodsInfoEs = { goodsType, goodsName, id:_id.toString(),goodsPrice}

        rs = await GoodInfoEsModel.insert(goodsInfoEs)
        if(!rs.success){
            // 回滚redis
            await GoodsNumRedisModel.removeAll(goodsInfo._id.toString())
            // 回滚 mongodb
            await session.abortTransaction()
            return rs
        }

        await session.commitTransaction()

        return utils.Success()
    }catch (err) {
        if(session) await session.abortTransaction();
        console.error(err)
        return utils.Error(err)
    }finally {
        if (session){
            await session.endSession()
        }
    }
}


service.search  = async (searchParam)=>{
    try{
        let {orderBy , orderSeries, quickSearch , goodsType , goodsName , maxGoodsPrice , minGoodsPrice, status , pageSize  , pageNo } = searchParam

        if (quickSearch){
            let query = {
                "multi_match": {
                    "query": quickSearch,
                        "type": "most_fields",
                        "operator":"or",
                        "fields": ["goodsName", "goodsType"]
                }
            }

             let esRs  = await GoodInfoEsModel.search(query)
            
            return utils.Success(rs)

        }



        return utils.Success()

    }catch (err) {
        console.error(err)
        return utils.Error(err)
    }

}

/**
 * @desc  根据商品ID获取商品详情
 * @param goodsId 商品ID
 * @returns {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.getGoodsInfoByGoodsId = async(goodsId ) =>{
    try{
        let search = {_id: goodsId}

        let rs = await GoodsInfo.findOne(search)

        if (rs){
            return utils.Success(rs)
        }

        return utils.Error("", ErrorCode.GOODS_DETAIL_NOT_FOUND,"goods info not found !")

    }catch (err) {
        console.error(err)
        return utils.Error(err)
    }


}


/**
 * @desc  根据商品ID获取商品详情
 * @param goodsId 商品ID
 * @returns {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.getGoodsDetailByGoodsId = async(goodsId ) =>{
    try{
        let search = {goodsId}

        let rs = await GoodsDetail.findOne(search)

        if (rs){
            return utils.Success(rs)
        }

        return utils.Error("", ErrorCode.GOODS_DETAIL_NOT_FOUND,"goods detail not found !")

    }catch (err) {
        console.error(err)
        return utils.Error(err)
    }


}

module.exports = service