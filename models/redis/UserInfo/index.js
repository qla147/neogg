const utils = require("../../../common/utils/utils")
const redisClient = require("../../../common/db/redis")
const ErrorCode = require("../../../common/const/ErrorCode")


const UserInfoRedisModel  = {}


// 从redis获取用户信息
UserInfoRedisModel.getUserInfo = async function (userId){
   try {
       let value  = await redisClient.get(`userInfo:${userId}`)
       return utils.StringToJson(value)
   }catch (e) {
       console.error(e);
       return utils.Error(e)
   }
}


/**
 * @description 给用户钱包加锁
 * @param userId {type: String}
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
UserInfoRedisModel.lock = async (userId) =>{
    try{
        let key = `lock:user:${userId}`
        let rs = await redisClient.setnx(key, 1)
        if(rs === 1){
            await redisClient.expire(key , 30 )
        }
        return utils.Success(rs)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}

/**
 * @description  释放用户钱包锁
 * @param userId {type: String} 用户ID
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
UserInfoRedisModel.unlock = async (userId )=>{
    try{
        let key = `lock:user:${userId}`
        await redisClient.del(key)
        return utils.Success()
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


/**
 * @description 用户钱包信息锁
 * @param userId {type: string }
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
UserInfoRedisModel.status = async (userId)=>{
    try{
        let key = `lock:user:${userId}`
        let rs = await redisClient.exists(key)
        return utils.Success(rs)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }

}


module.exports = {
    UserInfoRedisModel
}