const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const {GoodsDetail, GoodsInfo} = require("../../models/mongo/GoodsInfo");
const {GoodsNumRedisModel} = require("../../models/redis/GoodsInfo")
const  GoodInfoEsModel= require("../../models/es/GoodsInfo")()
const mongoose = require("../../common/db/mongo")

const service  = {}
/**
 * @description 添加商品入库
 * @param params
 * @returns {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.addGoods = async (params)=>{
    let  session  ;
    try{
        const {goodsInfo , goodsDetail } = params
        //开启session
        session = await mongoose.startSession()
        goodsInfo.createTime = Date.now()
        let goodsInfoModel  = new GoodsInfo(goodsInfo)

        await goodsInfoModel.save({session})

        goodsDetail.goodsId = goodsInfo._id
        goodsDetail.createTime = Date.now()

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
        const {goodsType,goodsName, _id } = goodsInfo
        let goodsInfoEs = { goodsType, goodsName, _id:_id.toString()}

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


service.search  = (searchParam)=>{
    try{
        let {orderBy , orderSeries, quickSearch , goodsType , goodsName , maxGoodsPrice , minGoodsPrice, status , pageSize  , pageNo } = searchParam






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