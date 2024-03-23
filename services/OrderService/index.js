const utils = require("../../common/utils/utils")
const {OrderInfoMongoModel}  = require("../../models/mongo/OrderInfo")
const {GoodsLockRedisModel, GoodsInfoRedisModel , RedisTransaction, GoodsNumRedisModel} = require("../../models/redis/GoodsInfo")
const ErrorCode  = require("../../common/const/ErrorCode")
const {GoodsInfo} = require("../../models/mongo/GoodsInfo");
const mongoose = require("../../common/db/mongo");
const service = {}
/**
 * @description  用于订单失败或者过期未支付的订单商品信息回滚
 * @param goodsId {string} 商品ID
 * @param goodsCount {type : Number } 回滚的商品数量
 * @return {Promise<*|{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
const goodsBackToStock  = async function (goodsId , goodsCount ){
    try{
        // 拿到商品信息
        let goodsInfoRs = await GoodsInfoRedisModel.get(goodsId)
        if(!goodsInfoRs.success){
            return goodsInfoRs
        }
        let goodsInfo = goodsInfoRs.data


        // 回滚商品数量
        let rs  =await GoodsNumRedisModel.addMore(goodsId, goodsCount)
        if (!rs.success){
            return rs
        }

        //获取商品的现有库存
        let goodsInStockNumRs = await GoodsNumRedisModel.getCount(goodsId)
        if (!goodsInStockNumRs.success) {
            return goodsInStockNumRs
        }

        let goodsInStockNum = goodsInStockNumRs.data

        // 组装更新数据
        let updateData = {
            goodsStatus : 1 ,
            soldCount : goodsInfo.goodsCount - goodsInStockNum
        }
        // 更新缓存
        rs = await  GoodsInfoRedisModel.updateField(goodsId, updateData)
        if (!rs.success){
            return rs
        }

        // 更新mongodb主库
        await GoodsInfo.updateOne({_id: goodsId}, {$set: updateData} , {upsert:false })

        return utils.Success()
    }catch (e) {
        console.error(e)
        // 如果回滚失败当我什么没有说， 查日志把
        console.error(`{msg:"回滚商品信息失败",error:${e}, data:{${JSON.stringify({goodsId, goodsCount})}`)
        return utils.Error(e , ErrorCode.REDIS_ERROR)
    }
}


service.addOrder = async (userInfo , goodsInfos) =>{
    let  session  ;
    // 记录出库记录
    let outStockRecord = {};
    // 记录是否需要回滚 redis商品库存
    let flag = false
    try{
        let userId = userInfo._id
        let detailGoodsInfo = {}

        // 检测商品的状态是否存在锁定状态
        for(const x in goodsInfos){
            const {goodsId } = goodsInfos[x]
            let lockStatusRs = await GoodsLockRedisModel.status(goodsId)
            if (!lockStatusRs.success){
                return lockStatusRs
            }

            let locked = lockStatusRs.data
            if (locked){
                return utils.Error(null , ErrorCode.LOCK_GOODS_INFO )
            }
        }

        session = await  mongoose.startSession()

        await session.startTransaction();

        // 获取商品的详情
        for(const x in goodsInfos){
            const {goodsId } = goodsInfos[x]
            // 从缓存拿到商品信息
            let goodsInfoRs  = await GoodsInfoRedisModel.get(goodsId)
            if (!goodsInfoRs.success){
                return goodsInfoRs
            }

            let goodsInfo = goodsInfoRs.data
            if(Object.keys(goodsInfo).length === 0 ){
                // mongo 来查询
                goodsInfo = await GoodsInfo.findOne({_id: goodsId},null , {session})
                if(!goodsInfo){
                    return utils.Error(null , ErrorCode.GOODS_INFO_NOT_FOUND, goodsId)
                }
                let saveRs = await GoodsInfoRedisModel.insert(goodsId.toString(), goodsInfo)

                if(!saveRs.success){
                    return saveRs
                }
            }

            detailGoodsInfo[goodsId] = goodsInfo
        }

      // ---------------------------------------------------------商品出库 ---------------------------------------------

        for(const x in  goodsInfos){
            const {goodsId , goodsCount } = goodsInfos[x]
            let key  = "goodsNum:"+goodsId
            // 从redis出库
            let checkOutRs  = await GoodsNumRedisModel.checkout(goodsId, goodsCount)
            if(!checkOutRs.success){
                // 出库失败
                flag = true
                return checkOutRs
            }

            outStockRecord[goodsId] = goodsCount

            let goodsInStockNumRs = await GoodsNumRedisModel.getCount(goodsId)
            if(!goodsInStockNumRs.success){
                flag = true
                break ;
            }
            // 剩余库存数量
            let goodsInStockNum = goodsInStockNumRs.data
            // 更新商品数量
            const updateInfo = { soldCount:detailGoodsInfo[goodsId].goodsCount - goodsInStockNum , goodsStatus : goodsInStockNum > 0 ? 1 : 2}
            // 先更新缓存
            let rs = await GoodsInfoRedisModel.updateField(goodsId, updateInfo)
            if(!rs.success){
                flag = true
                return rs
            }
            await GoodsInfo.updateOne({_id : goodsId}, {$set:updateInfo} , {upsert:false , session})
        }

        // -----------------------------------------------------订单入库-------------------------------------------------

        let totalPrice = 0
        let totalCount = 0
        for(const x in  goodsInfos){
            const{goodsId , goodsCount } = goodsInfos[x]
            totalPrice += detailGoodsInfo[goodsId.toString()].goodsPrice  * goodsCount
            totalCount += goodsCount
        }

        let orderGoodsInfo = []

        for(const x in goodsInfos){

            const {goodsId , goodsCount } = goodsInfos[x]

            orderGoodsInfo.push({
                goodsId,
                goodsName : detailGoodsInfo[goodsId].goodsName,
                goodsCount ,
                goodsImgs:detailGoodsInfo[goodsId].goodsImgs,
                goodsPrice : detailGoodsInfo[goodsId].goodsPrice
            })
        }


        let orderInfo  =new OrderInfoMongoModel({
            userId,
            createTime : Date.now(),
            expiredDate : Date.now() + 30 * 60 * 1000, // 30 分钟么有支付就是失效
            orderStatus : 0 ,
            totalPrice ,
            totalCount ,
            orderGoodsInfo
        })

        await orderInfo.save({session})

        await session.commitTransaction()

        return utils.Success(orderInfo)
    }catch (e) {
        console.error(e)
        if(session){
            await session.abortTransaction()
        }
        return utils.Error(e)
    }finally {
        if(session){
            await session.endSession()
        }
        if(flag){
            // 根据出库记录入库
            let tasks =[]
            for(const goodsId in outStockRecord){
                tasks.push(goodsBackToStock(goodsId, outStockRecord[goodsId]))
            }
            if(tasks.length > 0 ) {
                let rs = await Promise.allSettled(tasks)
                for(const x in rs){
                    if(rs[x].status !== "fulfilled"){
                        console.error(rs[x].reason)
                    }
                }
            }
        }

    }
}


/**
 * @desc 检索用户订单
 * @param userInfo
 * @param searchParam
 * @return {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.search  = async (userInfo , searchParam )=>{
    try{

    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }


}


module.exports = service

