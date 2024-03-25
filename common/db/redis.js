const Redis = require("ioredis")
const config = global._config
const utils = require("../utils/utils")
const ErrorCode  = require("../const/ErrorCode")



// redis client connection
const redisClient = new Redis({
    host: config.redis.host,
    port : config.redis.port,
    password : config.redis.password,
    db: config.redis.db || 0 ,
    retryStrategy: config.redis.retryStrategy,
    maxRetriesPerRequest : config.maxRetriesPerRequest
})


redisClient.on("error",function (err) {
    console.error( err)
})

//"wait" | "reconnecting" | "connecting" | "connect" | "ready" | "close" | "end";
redisClient.on("ready", function (){
    console.error( "Redis Client is ready")
})

redisClient.on("reconnecting", function (){
    console.error( "Redis Client is reconnecting !")
})




module.exports = redisClient