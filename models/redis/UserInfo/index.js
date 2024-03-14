const utils = require("../../../common/utils/utils")
const redisClient = require("../../../common/db/redis")
const ErrorCode = require("../../../common/const/ErrorCode")
const Index  =  {}


// 从redis获取用户信息
Index.GetUserInfo = async function (userId){
   try {
       let value  = await redisClient.get(`userInfo:${userId}`)
       return utils.StringToJson(value)
   }catch (e) {
       console.error(e);
       return utils.Error(e, ErrorCode.AUTH_ERROR , "Failed to get userinfo ")
   }
}

module.exports = Index