const utils = require("../../common/utils/utils")
const {OrderInfoMongoModel, OrderInfoBackUpMongoModel} = require("../../models/mongo/OrderInfo")
const {
    GoodsLockRedisModel,
    GoodsInfoRedisModel,
    GoodsNumRedisModel
} = require("../../models/redis/GoodsInfo")
const ErrorCode = require("../../common/const/ErrorCode")
const {GoodsInfo} = require("../../models/mongo/GoodsInfo");
const {OrderInfoRedisLock} = require("../../models/redis/OrderInfo")
const {UserInfoRedisModel} = require("../../models/redis/UserInfo")
const {UserInfoMongoModel} = require("../../models/mongo/UserInfo")
const mongoose = require("../../common/db/mongo");

const service = {}

/**
 * @description
 * @type {{CANCEL: string, EXPIRED: string}}
 */
const METHOD = {
    CANCEL: "cancel", // 取消订单
    EXPIRED :"expired" // 订单过期
}

async function expiredOrCancelOrder (OrderInfo, method ){
    let session
    let flag = false
    let backGoodsRecord = {}
    let flagLock = false

    try{
        const {orderGoodsInfo, _id } = OrderInfo
        // 拿到锁
        let lockRs = await OrderInfoRedisLock.lock(_id.toString())
        if(!lockRs.success){
            return lockRs
        }

        if(!lockRs.data){
            return utils.Error(null, ErrorCode.ORDER_PAY_LOCKED)
        }

        flagLock = true

        // 开始回库
        session = await mongoose.startSession()
        await session.startTransaction()

        // 商品回库
        let rs;
        for (const x in orderGoodsInfo) {
            const {goodsId, goodsCount} = orderGoodsInfo[x]
            // redis 回库

            rs = await goodsBackToStock(goodsId, goodsCount, session)
            if (!rs.success) {
                flag = true
                await session.abortTransaction()
                return rs
            }

            backGoodsRecord[goodsId] = goodsCount
        }

        await OrderInfoMongoModel.updateOne({_id }, {$set: {orderStatus: method === METHOD.CANCEL ? 1 : 2}}, {session})

        await session.commitTransaction()

        return utils.Success()

    }catch (e) {
        console.error(e)
        if(session){
            await session.abortTransaction()
        }
        return utils.Error(e)
    }finally {
        if (session) {
            await session.endSession()
        }

        if (flag) {
            for (const goodsId in backGoodsRecord) {
                let rs = await GoodsNumRedisModel.subMore(goodsId, backGoodsRecord[goodsId])
                if (!rs.success) {
                    console.log("取消订单回滚失败：", JSON.stringify(rs))
                    console.error(rs)
                }else{
                    console.log("取消订单回滚成功：", JSON.stringify(rs))
                }
            }


        }

        if(flagLock){
            let rs = await OrderInfoRedisLock.unlock(OrderInfo._id.toString())
            if(!rs.success){
                let msg = method === METHOD.CANCEL ?"取消订单，释放锁出现错误":"过期失效订单：出现错误"
                console.error(msg, JSON.stringify(rs))
            }
        }
    }
}

/**
 * @description 检测用户订单超期未付款问题
 * @return
 */
service.checkExpiredOrder = async()=>{
    try{
        let expiredOrderList = await OrderInfoMongoModel.find({ expiredDate: { $lte: Date.now() }, orderStatus: 0 },{userId:1 , orderGoodsInfo:1, _id : 1}).lean()
        // 没有过期的订单
        if(expiredOrderList.length === 0 ){
            return utils.Success()
        }

        for(const x in  expiredOrderList){
            // 回库更新订单
            await expiredOrCancelOrder(expiredOrderList[x], METHOD.EXPIRED)
        }

        return utils.Success()

    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }


}


/**
 * @description 用户支付订单
 * @param userInfo {type: Object} 用户信息
 * @param orderId {type: String } 订单ID
 * @param payMethod {type: Number} 支付方式
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.payOrder = async (userInfo, orderId, payMethod) => {
    let session;
    // 订单锁定状态
    let orderFlag = false
    // 用户锁定状态
    let userWalletFlag = false

    try {
        let userId = userInfo._id
        session = await mongoose.startSession()
        await session.startTransaction()

        // 拿到订单信息
        let orderInfo = await OrderInfoMongoModel.findOne({_id: orderId, userId}, null, {session})
        if (!orderInfo) {
            return utils.Error(null, ErrorCode.ORDER_INFO_NOT_FOUND)
        }

        const {orderStatus } = orderInfo

        // 判断订单状态
        switch (orderStatus) {
            case 0 :
                //待支付
                break;
            case 1 :
                //取消
                return utils.Error(null, ErrorCode.ORDER_STATUS_CANCELED)
            case 2:
                //失效
                return utils.Error(null, ErrorCode.ORDER_STATUS_INVALIDATION)
            case 3:
                //支付成功
                return utils.Error(null, ErrorCode.ORDER_STATUS_PAYED)
                //
            case 4:
                //退货退款
                return utils.Error(null, ErrorCode.ORDER_STATUS_REFUND)
            case 5:
                //完成
                return utils.Error(null, ErrorCode.ORDER_STATUS_COMPLETED)
            default:
                // 未知状态
                return utils.Error(null, ErrorCode.ORDER_STATUS_NOT_KNOWN)

        }


        // 锁定订单
        let lockRs = await OrderInfoRedisLock.lock(orderId)
        if (!lockRs.success) {
            return lockRs
        }

        if (lockRs.data > 0) {
            orderFlag = true
        } else {
            // 订单已经被锁定，请稍后再试
            return utils.Error(null, ErrorCode.ORDER_PAY_LOCKED)
        }

        // 锁定用户
        lockRs = await UserInfoRedisModel.lock(userId)
        if (!lockRs.success) {
            return lockRs
        }

        // 根据支付方式走不通的逻辑
        switch (payMethod) {
            case 1:
                // 用户数字钱包支付
                if (lockRs.data > 0) {
                    userWalletFlag = true
                } else {
                    return utils.Error(null, ErrorCode.ORDER_PAY_USER_WALLET_LOCKED)
                }

                userInfo = await UserInfoMongoModel.findOne({_id: userId}, null, {session})

                if (userInfo.userWallet < orderInfo.totalPrice) {
                    return utils.Error(null, ErrorCode.ORDER_PAY_USER_WALLET_BALANCE_INSUFFICIENT)
                }
                let payMoney = -orderInfo.totalPrice


                await UserInfoMongoModel.updateOne({_id: userInfo._id}, {$inc:{userWallet : payMoney}}, {session})


                break;

            case 2 :
            // 信用卡
            case 3 :
            // bitcoin
            case 4 :
                //wechat
                break;

        }

        // 状态变更
        let newOrderInfo = await OrderInfoMongoModel.findOneAndUpdate({_id: orderId}, {
            $set: {
                payMethod,
                payTime: Date.now(),
                orderStatus: 3
            }
        }, {upsert: false, session, new : true })

        await session.commitTransaction()

        return utils.Success(newOrderInfo)

    } catch (e) {
        console.error(e)
        if (session) {
            await session.abortTransaction()
        }
        return utils.Error(e)
    } finally {
        if (session) {
            await session.endSession()
        }
        if (orderFlag) {
           let rs =  await OrderInfoRedisLock.unlock(orderId)
            if(!rs.success){
                console.error(`释放订单锁失败 userId:${userInfo._id}, orderId:${orderId}, error:${JSON.stringify(rs)}`)
            }
        }

        if (userWalletFlag) {
            let rs = await UserInfoRedisModel.unlock(userInfo._id)
            if(!rs.success){
                console.error(`释放用户锁失败 userId:${userInfo._id}, orderId:${orderId}, error:${JSON.stringify(rs)}`)
            }
        }
    }
}


/**
 * @description 用户取消订单
 * @param userInfo {type: Object} 用户信息
 * @param orderId {type: String } 订单ID
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}|*|{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.cancelOrder = async (userInfo, orderId) => {


    try {
        const userId = userInfo._id
        // 拿到订单信息
        let orderInfo = await OrderInfoMongoModel.findOne({_id: orderId, userId})
        if (!orderInfo) {
            return utils.Error(null, ErrorCode.ORDER_INFO_NOT_FOUND)
        }

        const {orderStatus} = orderInfo
        // 判断状态的合法性
        switch (orderStatus) {
            case 0 :
                // 待支付
                break
            case 1 :
                //已经取消
                return utils.Success()
            case 2:
                // 已经失效
                return utils.Error(null, ErrorCode.ORDER_STATUS_INVALIDATION)
            case 3:
                // 支付成功
                return utils.Error(null, ErrorCode.ORDER_STATUS_PAYED)
            case 4:
                // 已经退货退款
                return utils.Error(null, ErrorCode.ORDER_STATUS_REFUND)
            case 5:
                // 完成
                return utils.Error(null, ErrorCode.ORDER_STATUS_COMPLETED)
            default:
                return utils.Error(null, ErrorCode.ORDER_STATUS_NOT_KNOWN)

        }
        // 订单回库。状态更新
        return await expiredOrCancelOrder(orderInfo, METHOD.CANCEL)
        // // session = await mongoose.startSession()
        // //
        // // await session.startTransaction()
        //
        //
        // // 商品回库
        // let {orderGoodsInfo} = orderInfo
        // let rs;
        // for (const x in orderGoodsInfo) {
        //     const {goodsId, goodsCount} = orderGoodsInfo[x]
        //
        //     rs = await goodsBackToStock(goodsId, goodsCount, session)
        //     if (!rs.success) {
        //         flag = true
        //         await session.abortTransaction()
        //         return rs
        //     }
        //
        //     backGoodsRecord[goodsId] = goodsCount
        // }
        //
        //
        // await OrderInfoMongoModel.updateOne({_id: orderId}, {$set: {orderStatus: 1}}, {session})
        //
        // await session.commitTransaction()
        //
        // return utils.Success()

    } catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


/**
 * @description 删除订单 （换个地方存储）
 * @param userInfo {type: Object} 用心西
 * @param orderId 订单编号
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}|*>}
 */
service.deleteOne = async (userInfo, orderId) => {
    let session;
    let flag;// 用来标记回库是否成功
    let backGoodsStockRecord = {}

    let lockFlag = false

    try {

        let userId = userInfo._id

        session = await mongoose.startSession()

        await session.startTransaction()
        // 获取锁
        let lockRs = await OrderInfoRedisLock.lock(orderId)
        if(!lockRs.success){
            return lockRs
        }
        // 判断锁是否获取成功
        if(!lockRs.data){
            return utils.Error(null , ErrorCode.ORDER_PAY_LOCKED)
        }

        lockFlag = true


        // 获取订单信息 同时也删除
        let orderInfo = await OrderInfoMongoModel.findOneAndDelete({_id: orderId, userId},  {session})
        if (!orderInfo) {
            return utils.Success()
        }

        let rs;
        // 判断是否需要回库
        let {orderStatus, orderGoodsInfo} = orderInfo
        switch (orderStatus) {
            case 0 :
                // 待支付订单需要回库
                // let tasks = [];
                for (const x in orderGoodsInfo) {
                    const {goodsId, goodsCount} = orderGoodsInfo[x]
                    let backRs = await goodsBackToStock(goodsId, goodsCount, session)
                    if (!backRs.success) {
                        //回库失败
                        flag = true
                        return backRs
                    }
                    // 记录下  已经回库的
                    backGoodsStockRecord[goodsId] = goodsCount
                }
                // if (tasks.length > 0) {
                //     rs = await Promise.allSettled(tasks)
                //     for (const x in rs) {
                //         if (rs[x].status !== "fulfilled") {
                //             if (!rs[x].value.success) {
                //                 console.error(rs[x].value)
                //             }
                //         } else {
                //             console.error(rs[x].reason)
                //         }
                //     }
                // }
                break;
            case 1:
            case 2:
            case 3:
            case 4:
                break;
        }

        await OrderInfoBackUpMongoModel.findOneAndUpdate({_id: orderId}, orderInfo, {upsert:true , session})

        await session.commitTransaction()

        return utils.Success()

    } catch (e) {
        console.error(e)
        if (session) {
            flag = true
            await session.abortTransaction()
        }
        return utils.Error(e)
    } finally {

        if (session) {
            await session.endSession()
        }

        if(lockFlag){
            await OrderInfoRedisLock.unlock(orderId)
        }

        if (flag) {
            for (const goodsId in backGoodsStockRecord) {
                let rs = await GoodsNumRedisModel.subMore(goodsId, backGoodsStockRecord[goodsId])
                if (!rs.success) {
                    console.log("删除订单回滚失败：", JSON.stringify(rs))
                    console.error(rs)
                }
            }
        }
    }
}


/**
 * @description  用于订单失败或者过期未支付的订单商品信息回滚
 * @param goodsId {string} 商品ID
 * @param goodsCount {type : Number } 回滚的商品数量
 * @param session {type:ClientSession } mongodb session
 * @return {Promise<*|{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
const goodsBackToStock = async function (goodsId, goodsCount, session) {
    try {
        // 拿到商品信息
        let goodsInfoRs = await GoodsInfoRedisModel.get(goodsId)
        if (!goodsInfoRs.success) {
            return goodsInfoRs
        }
        let goodsInfo = goodsInfoRs.data


        // 回滚商品数量
        let rs = await GoodsNumRedisModel.addMore(goodsId, goodsCount)

        if (!rs.success) {
            return rs
        }

        //获取商品的现有库存
        let goodsInStockNumRs = await GoodsNumRedisModel.getCount(goodsId)
        if (!goodsInStockNumRs.success) {
            return goodsInStockNumRs
        }

        let goodsInStockNum = goodsInStockNumRs.data


        goodsInfo.goodsCount = goodsInfo.goodsCount || 0
        // 组装更新数据
        let updateData = {
            goodsStatus: 1,
            soldCount: parseInt(goodsInfo.goodsCount) - goodsInStockNum
        }
        // 更新缓存
        rs = await GoodsInfoRedisModel.updateField(goodsId, updateData)
        if (!rs.success) {
            return rs
        }

        // 更新mongodb主库
        let options = {upsert: false}
        if (session) {
            options.session = session
        }

        await GoodsInfo.updateOne({_id: goodsId}, {$set: updateData}, options)

        return utils.Success()
    } catch (e) {
        console.error(e)
        // 如果回滚失败当我什么没有说， 查日志把
        console.error(`{msg:"回滚商品信息失败",error:${e}, data:{${JSON.stringify({goodsId, goodsCount})}`)
        return utils.Error(e, ErrorCode.REDIS_ERROR)
    }
}

/**
 * @description 新增订单
 * @param userInfo
 * @param goodsInfos
 * @return {Promise<*|{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{success}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.addOrder = async (userInfo, goodsInfos) => {
    let session;
    // 记录出库记录
    let outStockRecord = {};
    // 记录是否需要回滚 redis商品库存
    let flag = false
    try {
        let userId = userInfo._id
        let detailGoodsInfo = {}

        // 检测商品的状态是否存在锁定状态
        for (const x in goodsInfos) {
            const {goodsId} = goodsInfos[x]

            let lockStatusRs = await GoodsLockRedisModel.status(goodsId)

            if (!lockStatusRs.success) {
                return lockStatusRs
            }

            let locked = lockStatusRs.data
            if (locked) {
                return utils.Error(null, ErrorCode.LOCK_GOODS_INFO)
            }
        }

        session = await mongoose.startSession()

        await session.startTransaction();

        // 获取商品的详情
        for (const x in goodsInfos) {
            const {goodsId, goodsCount} = goodsInfos[x]
            // 从缓存拿到商品信息
            let goodsInfoRs = await GoodsInfoRedisModel.get(goodsId)

            if (!goodsInfoRs.success) {
                return goodsInfoRs
            }

            let goodsInfo = goodsInfoRs.data

            if (Object.keys(goodsInfo).length === 0) {
                // mongo 来查询
                goodsInfo = await GoodsInfo.findOne({_id: goodsId}, null, {session})
                if (!goodsInfo) {
                    return utils.Error(null, ErrorCode.GOODS_INFO_NOT_FOUND, goodsId)
                }

                let saveRs = await GoodsInfoRedisModel.insert(goodsId.toString(), goodsInfo.toObject())

                if (!saveRs.success) {
                    return saveRs
                }
            }

            // // 没有库存
            // if (parseInt(goodsInfo.goodsStatus) === 2) {
            //     return utils.Error(null, ErrorCode.GOODS_OUT_OF_STOCK)
            // }


            //  获取库存
            let stockNumRs = await GoodsNumRedisModel.getCount(goodsId)

            if (!stockNumRs.success) {
                return stockNumRs
            }

            // 没有库存
            if (stockNumRs.data < goodsCount) {
                let updateInfo = {
                    goodsStatus: stockNumRs.data > 0 ? 1 : 2,
                    soldCount: goodsInfo.goodsCount - stockNumRs.data
                }

                await GoodsInfo.updateOne({_id: goodsId}, {$set: updateInfo}, {upsert: false, session})
                let rs = await GoodsInfoRedisModel.updateField(goodsId, updateInfo)

                if (!rs.success) {
                    await session.abortTransaction()
                    return rs
                }

                await session.commitTransaction()

                return utils.Error(null, ErrorCode.GOODS_OUT_OF_STOCK)
            }

            detailGoodsInfo[goodsId] = goodsInfo
        }

        // ---------------------------------------------------------商品出库 ---------------------------------------------

        for (const x in goodsInfos) {
            const {goodsId, goodsCount} = goodsInfos[x]
            let key = "goodsNum:" + goodsId
            // 从redis出库
            let checkOutRs = await GoodsNumRedisModel.checkout(goodsId, goodsCount)
            if (!checkOutRs.success) {
                // 出库失败
                flag = true
                return checkOutRs
            }

            // 记录出库的商品，出现错误就回退
            outStockRecord[goodsId] = goodsCount

            let goodsInStockNumRs = await GoodsNumRedisModel.getCount(goodsId)
            if (!goodsInStockNumRs.success) {
                flag = true
                break;
            }
            // 剩余库存数量
            let goodsInStockNum = goodsInStockNumRs.data
            // 更新商品数量
            const updateInfo = {
                soldCount: detailGoodsInfo[goodsId].goodsCount - goodsInStockNum,
                goodsStatus: goodsInStockNum > 0 ? 1 : 2
            }
            // 先更新缓存
            let rs = await GoodsInfoRedisModel.updateField(goodsId, updateInfo)
            if (!rs.success) {
                flag = true
                return rs
            }
            await GoodsInfo.updateOne({_id: goodsId}, {$set: updateInfo}, {upsert: false, session})
        }

        // -----------------------------------------------------订单入库-------------------------------------------------

        let totalPrice = 0
        let totalCount = 0
        for (const x in goodsInfos) {
            const {goodsId, goodsCount} = goodsInfos[x]
            totalPrice += detailGoodsInfo[goodsId.toString()].goodsPrice * goodsCount
            totalCount += goodsCount
        }

        let orderGoodsInfo = []

        for (const x in goodsInfos) {

            const {goodsId, goodsCount} = goodsInfos[x]

            orderGoodsInfo.push({
                goodsId,
                goodsName: detailGoodsInfo[goodsId].goodsName,
                goodsCount,
                goodsImgs: detailGoodsInfo[goodsId].goodsImgs,
                goodsPrice: detailGoodsInfo[goodsId].goodsPrice
            })
        }


        let orderInfo = new OrderInfoMongoModel({
            userId,
            createTime: Date.now(),
            expiredDate: Date.now() + 30 * 60 * 1000, // 30 分钟么有支付就是失效
            orderStatus: 0,
            totalPrice,
            totalCount,
            orderGoodsInfo
        })

        await orderInfo.save({session})

        await session.commitTransaction()

        return utils.Success(orderInfo)
    } catch (e) {
        console.error(e)
        if (session) {
            await session.abortTransaction()
        }
        return utils.Error(e)
    } finally {
        if (session) {
            await session.endSession()
        }
        if (flag) {
            // 根据出库记录入库
            let tasks = []
            for (const goodsId in outStockRecord) {
                tasks.push(goodsBackToStock(goodsId, outStockRecord[goodsId], undefined))
            }
            if (tasks.length > 0) {
                let rs = await Promise.allSettled(tasks)
                for (const x in rs) {
                    if (rs[x].status !== "fulfilled") {
                        console.error(rs[x].reason)
                    } else {
                        if (!rs[x].value.success) {
                            console.error("回滚库存失败 msg :", JSON.stringify(rs[x].value))
                        }
                    }
                }
            }
        }

    }
}


/**
 * @desc 检索用户订单
 * @param userInfo {type: Object} 用户信息
 * @param searchParam {type : Object} 检索信息
 * @return {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.search = async (userInfo, searchParam) => {
    try {
        let userId = userInfo._id
        let {pageSize, pageNo , goodsName, orderStatus} = searchParam

        let firstSearch = {
            userId,
        }

        if(orderStatus){
            firstSearch.orderStatus = orderStatus
        }

        if(goodsName){
            firstSearch['orderGoodsInfo.goodsName']= {
                $regex: RegExp(goodsName, 'i')
            }
        }



        let  list = await OrderInfoMongoModel.find(firstSearch).sort({createTime:-1}).skip(pageNo* pageSize).limit(pageSize).lean()
        let count = await OrderInfoMongoModel.countDocuments(firstSearch)

        return utils.Success({list, count})
    } catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


module.exports = service

