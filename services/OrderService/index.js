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
const {DEFAULT_OPTIONS} = require("consul/lib/constants");

const service = {}

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
        let orderInfo = OrderInfoMongoModel.findOne({_id: orderId, userId}, null, {session})
        if (!orderInfo) {
            return utils.Error(null, ErrorCode.ORDER_INFO_NOT_FOUND)
        }

        // 判断订单状态
        switch (orderInfo.orderStatus) {
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

                userInfo = await UserInfoMongoModel.findOne({_id: userId}, {}, {session})

                if (userInfo.userWallet < orderInfo.totalPrice) {
                    return utils.Error(null, ErrorCode.ORDER_PAY_USER_WALLET_BALANCE_INSUFFICIENT)
                }

                await UserInfoMongoModel.updateOne({_id: userInfo}, {$set: {$inc: -orderInfo.totalPrice}}, {session})


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
        await OrderInfoMongoModel.updateOne({_id: orderId}, {
            $set: {
                payMethod,
                payTime: Date.now(),
                orderStatus: 3
            }
        }, {upsert: false, session})

        await session.commitTransaction()

        return utils.Success()

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
    let session
    let flag = false
    let backGoodsRecord = {}

    try {
        const userId = userInfo._id
        let orderInfo = await OrderInfoMongoModel.findOne({_id: orderId, userId})
        if (!orderInfo) {
            return utils.Error(null, ErrorCode.ORDER_INFO_NOT_FOUND)
        }

        const {orderStatus} = userInfo

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

        session = await mongoose.startSession()

        await session.startTransaction()


        // 商品回库
        let {orderGoodsInfo} = orderInfo
        let rs;
        for (const x in orderGoodsInfo) {
            const {goodsId, goodsCount} = orderGoodsInfo[x]

            rs = await goodsBackToStock(goodsId, goodsCount, session)
            if (!rs.success) {
                flag = true
                await session.abortTransaction()
                return rs
            }

            backGoodsRecord[goodsId] = goodsCount
        }


        await OrderInfoMongoModel.updateOne({_id: orderId}, {$set: {orderStatus: 1}}, {session})

        await session.commitTransaction()

        return utils.Success()

    } catch (e) {
        console.error(e)
        flag = true
        if (session) {
            await session.abortTransaction()
        }
        return utils.Error(e)
    } finally {
        if (session) {
            await session.endSession()
        }

        if (flag) {
            for (const goodsId in backGoodsRecord) {
                let rs = await GoodsNumRedisModel.subMore(goodsId, backGoodsRecord[goodsId])
                if (!rs.success) {
                    console.log("取消订单回滚失败：", JSON.stringify(rs))
                    console.error(rs)
                }
            }


        }
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

    try {

        let userId = userInfo._id

        session = await mongoose.startSession()

        await session.startTransaction()
        // 获取订单信息 同时也删除
        let orderInfo = await OrderInfoMongoModel.findOneAndDelete({_id: orderId, userId}, null, {session})
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

        await OrderInfoBackUpMongoModel.insertOne(orderInfo, {session})

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

        // 组装更新数据
        let updateData = {
            goodsStatus: 1,
            soldCount: goodsInfo.goodsCount - goodsInStockNum
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
            const {goodsId} = goodsInfos[x]
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

                let saveRs = await GoodsInfoRedisModel.insert(goodsId.toString(), goodsInfo)

                if (!saveRs.success) {
                    return saveRs
                }
            }

            // 没有库存
            if (goodsInfo.goodsStatus === 2) {
                return utils.Error(null, ErrorCode.GOODS_OUT_OF_STOCK)
            }

            let stockNumRs = await GoodsNumRedisModel.getCount(goodsId)

            if (!stockNumRs.success) {
                return stockNumRs
            }
            // 没有库存
            if (stockNumRs.data <= 0) {
                let updateInfo = {
                    goodsStatus: 2,
                    soldCount: goodsInfo.goodsCount
                }

                await GoodsInfo.updateOne({_id: goodsId}, {$set: updateInfo}, {upsert: false, session})
                let rs = await GoodsInfoRedisModel.updateField(goodsId, updateInfo)
                if (rs.success) {
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

            if (!checkOutRs.data) {
                // 没有库存
                await G


            }


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
 * @param userInfo
 * @param searchParam
 * @return {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.search = async (userInfo, searchParam) => {
    try {

    } catch (e) {
        console.error(e)
        return utils.Error(e)
    }


}


module.exports = service

