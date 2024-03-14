
const redisClient = require("../../../common/db/redis")
const utils = require("../../../common/utils/utils")


class OrderInfo {
    constructor() {
    }

    /**
     * @author hhh
     * @date 2024年3月13日01:05:02
     * @param orderId 订单号
     * @param payServerNo 支付服务器编号
     * @description 给订单加锁
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
    async lockOrder (orderId , payServerNo) {
        try{
            let rs = await redisClient.setnx(orderId, payServerNo)
            // 设置一个小时过期
            await redisClient.expire(orderId, 60 * 60 )
            return utils.Success(!!rs)
        }catch (e) {
            console.error(e);
            return utils.Error(e);
        }

    }

    /**
     * @author : hhh
     * @date : 2024年3月13日01:04:31
     * @param orderId 订单号
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     * @description 释放订单锁
     */
    async localOrder (orderId ) {
        try{
            await redisClient.del(orderId)
            return utils.Success(null)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }

}


module.exports = OrderInfo