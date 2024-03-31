const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const {GoodsDetail, GoodsInfo} = require("../../models/mongo/GoodsInfo");
const Constant = require("../../common/const/Common")
const {GoodsNumRedisModel} = require("../../models/redis/GoodsInfo")
const  GoodsInfoEsModel= require("../../models/es/GoodsInfo")()
const {GoodsLockRedisModel, GoodsInfoRedisModel} = require("../../models/redis/GoodsInfo")
const mongoose = require("../../common/db/mongo")


const service  = {}

/**
 * @description 检测商品等参数是否合法
 * @param goodsInfo  {type : Object, required : true } 商品基本信息
 * @param goodsDetail  {type : Object, required : true } 商品详情
 * @returns {{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}}
 */
service.checkGoodsInfoAndGoodsDetailParam = (goodsInfo , goodsDetail) =>{
    try{
        // ----------------------------------------------参数检测-goodsInfo---------------------------------------------------
        if (!goodsInfo){
            return utils.Error(null , ErrorCode.PARAM_ERROR, "goodsInfo")
        }

        if(!goodsDetail){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsDetail")
        }

        let  {goodsType, goodsName , goodsPrice, goodsCount , goodsImgs } = goodsInfo

        if (!Constant.GOODS_TYPE.includes(goodsType)){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsType")
        }

        if(!goodsName || goodsName.length === 0  || goodsName.length > 200){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsName")
        }

        if(!goodsPrice ||isNaN(goodsPrice)){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsPrice")
        }

        if (typeof goodsPrice == "string"){
            goodsPrice = parseInt(goodsPrice)
        }

        if (goodsPrice <= 0 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsPrice")
        }


        if (!goodsCount || isNaN(goodsCount)){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodCount")
        }

        if(typeof goodsCount == "string"){
            goodsCount = parseInt(goodsCount)
        }

        if (goodsCount <= 0  || goodsCount > 9999999999){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodCount")
        }

        if(!Array.isArray(goodsImgs) || goodsImgs.length === 0 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsImgs")
        }

        for(const x in goodsImgs){
            if (goodsImgs[x].length === 0 ){
                return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsImgs")
            }
        }

        //-----------------------------------------------------参数检测-goodsDetail-------------------------------------------
        let  { extraData , contentHtml } = goodsDetail

        if (contentHtml.length === 0 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "contentHtml")
        }
        goodsInfo = {}
        goodsInfo["goodsType"] = goodsType
        goodsInfo["goodsName"] = goodsName
        goodsInfo["goodsPrice"] = goodsPrice
        goodsInfo["goodsCount"] = goodsCount
        goodsInfo["goodsImgs"] = goodsImgs
        goodsDetail = {}
        goodsDetail["extraData"] = extraData
        goodsDetail["contentHtml"] = contentHtml


        return utils.Success(null )
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}
/**
 * @desc  检测商品名称是否已经存在
 * @param goodsName {type: String, required : true } 商品名称
 * @param goodsId {type : Mongoose.Type.ObjectId, required : false }  商品ID
 * @param session {type : mongoose.session} mongo session
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
 *  @param goodsId {Mongoose.Type.ObjectId | String} 商品ID
 *  @param param {Object} 商品详情 & 商品信息
 */
service.updateGoods = async (goodsId , param )=>{
    let  session  ;
    // 商品锁
    let lock = false
    try{


        session = await  mongoose.startSession()
        await session.startTransaction()

        let  {goodsInfo , goodsDetail } = param

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
        // 查询库存数量
        let remainedGoodsNumRs = await GoodsNumRedisModel.getCount(goodsId)
        if(!remainedGoodsNumRs.success){
            return remainedGoodsNumRs
        }

        // 检测商品数量变化是否合理
        let goodsCountGap = goodsInfo.goodsCount - oldGoodsInfo.goodsCount
        if (goodsCountGap < 0 ){
            if (remainedGoodsNumRs.data + goodsCountGap < 0 ){
                return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsCount")
            }
        }


        if(remainedGoodsNumRs.data + goodsCountGap === 0){
            // 售罄
            goodsInfo.goodsStatus = 2
        }else{
            // 还有库存
            goodsInfo.goodsStatus = 1
        }

        // 商品信息和商品详情更新入库
        goodsInfo.createTime = Date.now()
        // 已经售出的数量不能更新
        delete goodsInfo.SoldCount
        goodsInfo = await GoodsInfo.findOneAndUpdate({_id: goodsId} , {$set: goodsInfo} , {new: true ,upsert: false , WriteConcern:{w:"majority"} , session})

        goodsDetail.goodsId = goodsId
        goodsDetail.createTime = Date.now()

        await GoodsDetail.updateOne({goodsId} , {$set: goodsDetail } , {upsert: false , WriteConcern:{w:"majority"} , session})

        // 商品数量发生变化
        console.error(goodsCountGap)
        if(goodsCountGap !== 0  ){
            if(goodsCountGap > 0 ){
               let addRs =  await GoodsNumRedisModel.addMore(goodsId ,goodsCountGap )
                if (!addRs.success){
                    await session.abortTransaction()
                }
            }else{
                let subRs = await GoodsNumRedisModel.subMore(goodsId, goodsCountGap)
                if (!subRs.success){
                    await session.abortTransaction()
                }
            }
        }
        // 写入缓存
        await GoodsInfoRedisModel.updateField(goodsInfo._id.toString(),goodsInfo.toObject())

        await session.commitTransaction()
        return utils.Success(null)

    }catch (e) {
        console.error(e)
        if(session){
            await session.abortTransaction()
        }
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
        goodsInfo.goodsStatus = goodsInfo.goodsCount > 0 ? 1 : 2 ;

        // 入库商品信息 mongodb
        let goodsInfoModel  = new GoodsInfo(goodsInfo)
        await goodsInfoModel.save({session})

        goodsDetail.goodsId = goodsInfoModel._id
        goodsDetail.createTime = Date.now()

        //入库商品详情 mongodb
        let goodsDetailModel = new GoodsDetail(goodsDetail)
        await goodsDetailModel.save({session})
        // 入库redis
        let rs  = await GoodsNumRedisModel.initGoods(goodsInfoModel._id.toString(), goodsInfoModel.goodsCount)
        if(!rs.success){
            // 回滚mongodb
            await session.abortTransaction()
            return rs
        }

        // 入库es
        const {goodsType,goodsName, _id , goodsPrice} = goodsInfoModel
        let goodsInfoEs = { goodsType, goodsName, id:_id.toString(),goodsPrice}

        rs = await GoodsInfoEsModel.insert(goodsInfoEs)

        if(!rs.success){
            // 回滚redis
            await GoodsNumRedisModel.removeAll(goodsInfo._id.toString())
            // 回滚 mongodb
            await session.abortTransaction()
            return rs
        }

        // 写入缓存
        await GoodsInfoRedisModel.insert(goodsInfoModel._id.toString(),goodsInfoModel.toObject())

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

/**
 * @description 用于分页检索
 * @param searchParam {type: Object } 商品信息检索条件对象
 * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.search  = async (searchParam)=>{
    try{
        console.error(searchParam)
        let {orderBy , orderSeries, quickSearch , goodsType , goodsName , maxGoodsPrice , minGoodsPrice, goodsStatus , pageSize = 10   , pageNo = 0  } = searchParam
        // ------------------------------------------------------组装检索条件---------------------------------------------
        let search = {}
        if (quickSearch || goodsName) {
            // 有全文检索字段使用es检索
            let query = {
                "match": {
                    "goodsName": goodsName || quickSearch,
                }
            }


            let esRs  = await GoodsInfoEsModel.search(query)
            let hits = esRs.data.hits.hits
            let ids = []

            for(const x in hits){
                ids.push(hits[x]._source.id)
            }

            if (ids.length > 0 ){
                search._id = {$in: ids }
            }else{
                return utils.Success({list:[], count:0 })
            }
        }

        // 组装检索条件
        if (goodsType){
            search.goodsType = goodsType
        }

        if(minGoodsPrice !== undefined ) {
            search.goodsPrice = {$gte: minGoodsPrice}
        }

        if (maxGoodsPrice !== undefined){
            if(search.goodsPrice){
                search.goodsPrice["$lte"] = maxGoodsPrice
            }else{
                search.goodsPrice = {$lte: maxGoodsPrice}
            }
        }


        if(goodsStatus !== undefined){
            search.goodsStatus = goodsStatus
        }

        let sort = {}
        if (orderSeries === "asc"){
            sort[orderBy] = 1
        }else{
            sort[orderBy] = -1
        }

        // 检索数据库
        let list = await GoodsInfo.find(search).sort(sort).skip(pageNo * pageSize ).limit(pageSize).lean();
        let count  = await GoodsInfo.countDocuments(search)
        return utils.Success({list, count})
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