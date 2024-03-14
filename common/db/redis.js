const Redis = require("ioredis")
const config = global._config
const utils = require("../utils/utils")
const ErrorCode  = require("../const/ErrorCode")



// redis client connection
const redisClient = new Redis({
    host: config.redis.host,
    port : config.redis.port,
    password : config.redis.password,
    db: config.redis.db,

    retryStrategy: config.redis.retryStrategy,
    maxRetriesPerRequest : config.maxRetriesPerRequest
})


redisClient.on("error",function (err) {
    console.error( utils.Error(err ,ErrorCode.REDIS_ERROR , "Redis Client got some errors !"))
})

//"wait" | "reconnecting" | "connecting" | "connect" | "ready" | "close" | "end";
redisClient.on("ready", function (){
    console.error(utils.Success(null , "Redis Client is ready"))
})


redisClient.on("connect" , function (){
    console.error(utils.Success(null , "Redis Client Connected success"))
})

redisClient.on("reconnecting", function (){
    console.error(utils.Error(null , ErrorCode.REDIS_ERROR , "Redis Client is reconnecting !"))
})

module.exports = redisClient