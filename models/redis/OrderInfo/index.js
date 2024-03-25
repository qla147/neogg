
const redisClient = require("../../../common/db/redis")
const utils = require("../../../common/utils/utils")


const  OrderInfoRedisLock =  {
    /**
     * @author hhh
     * @date 2024年3月13日01:05:02
     * @param orderId 订单号
     * @description 给订单加锁
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
     lock:async (orderId )=> {
        try{
            let key = `lock:order:${orderId}`
            let rs = await redisClient.setnx(key, 1)
            // 设置一个小时过期
            if(rs === 1 ){
                await redisClient.expire(key,  30 )
            }
            return utils.Success(rs)
        }catch (e) {
            console.error(e);
            return utils.Error(e);
        }

    },

    /**
     * @author : hhh
     * @date : 2024年3月13日01:04:31
     * @param orderId 订单号
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     * @description 释放订单锁
     */
     unlock: async (orderId ) =>{
        try{
            let key = `lock:order:${orderId}`
            await redisClient.del(key)
            return utils.Success(null)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }

}


module.exports = {OrderInfoRedisLock}