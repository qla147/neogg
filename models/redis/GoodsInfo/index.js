const redisClient = require("../../../common/db/redis")
const utils = require("../../../common/utils/utils")
const ErrorCode = require("../../../common/const/ErrorCode")
const config  = global._config


const RedisTransaction = {
    start: async ()=>{
        try{
            let rs = await  redisClient.multi({pipeline: false })
            return utils.Success(rs)
        }catch (e) {
            console.error(e);
            return utils.Error(e, ErrorCode.REDIS_ERROR)
        }
    },

    commit:async ()=>{
       return new Promise(resolve => {
           redisClient.exec((err, result ) =>{
               if (err){
                   console.error(err)
                   return resolve(utils.Error(err, ErrorCode.REDIS_ERROR))
               }
               return resolve(utils.Success(result))
           })
       })

    }
}

const GoodsLockRedisModel = {
    lock: async(goodsId)=>{
        try{
            let key = `lock:goods:${goodsId}`
            let rs = await redisClient.setnx(key, 1)
            if (rs === 1){
                await redisClient.expire(key , 30 )
            }
            return utils.Success(rs)

        }catch (e) {
            console.error(e);
            return utils.Error(e , ErrorCode.REDIS_ERROR)
        }
    },

    unlock : async (goodsId) =>{
        try {
            let key = `lock:goods:${goodsId}`
            let rs = await redisClient.del( key)
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR)
        }
    },
    status : async (goodsId)=>{
        try{
            // let key = "lock:"+goodsId
            let key = `lock:goods:${goodsId}`
            let rs = await redisClient.exists(key)
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }

    }

}





const GoodsNumRedisModel = {
    // 入库一个商品
    insertOne :async (goodsId )=>{
        try{
            let rs = await redisClient.lpush("goodsNum:"+goodsId,1 )
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e , ErrorCode.REDIS_ERROR)
        }
    },
    // 获取还待出售的商品数量
    getCount : async (goodsId)=>{
      try{
          let rs = await redisClient.llen("goodsNum:"+goodsId)
          return utils.Success(rs)
      }  catch (e) {
          console.error(e)
          return utils.Error(e, ErrorCode.REDIS_ERROR)
      }
    },
    // 出库一/n个商品
    checkout : async (goodsId , num = 1) =>{
        try{
            let key = "goodsNum:"+goodsId
            let rs = await redisClient.rpop(key, num )
            console.log(rs)

            // 全部没有取出来
            if(rs.length  === 0 ){
                return utils.Error(null , ErrorCode.GOODS_OUT_OF_STOCK)
            }

            if(rs.length !== num ){
                //部分取出来了
                // 回退湖区
                await redisClient.lpush(key, rs)
                return utils.Error(null , ErrorCode.GOODS_OUT_OF_STOCK)
            }else{
                return utils.Success(true)
            }


        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR )
        }
    },

    subMore: async(goodsId , num ) =>{
        try{
            if (num === 0 ){
                return utils.Success()
            }
            let key = "goodsNum:"+goodsId ;
            await redisClient.lrem(key , num , 1 )
            return utils.Success(null )
        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR)
        }
    },

    // 二次添加商品的数量
    addMore:async (goodsId , num )=>{
        try{
            if (num === 0 ){
                return utils.Success()
            }
            if( num <  0 ){
                return utils.Error("The count added into db must be more than zero! goodsId: "+ goodsId )
            }
            let index = num
            let key = "goodsNum:"+goodsId ;
            let indexes = [] ;
            while(index > 0 ){
                indexes.push(1)
                if(indexes.length > 5){
                    await redisClient.lpush(key, indexes)
                    indexes = []
                }
                index--
            }

            if (indexes.length > 0){
                await redisClient.lpush(key , indexes)
            }

            return utils.Success(null )

        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR)
        }
    },

    removeAll:async (goodsId)=>{
        try{
            let rs = await redisClient.del("goodsNum:"+goodsId)
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    },

    initGoods :async(goodsId , count )=>{
        try{
            let indexes = []
            let key = "goodsNum:"+goodsId ;
            for (let x = 1 ; x <= count ; x++) {
                indexes.push(x)
                if (indexes.length > 5){
                    await redisClient.lpush(key, ...indexes)
                    indexes = []
                }
            }

            if (indexes.length > 0){
                await redisClient.lpush(key , ...indexes)
            }

            return utils.Success(null )

        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR )
        }
    }
}

const  GoodsInfoRedisModel  = {
    // insert
    /**
     * @description 写入商品信息到缓存
     * @param goodsId
     * @param goodsInfo
     * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
    insert :async (goodsId , goodsInfo)=> {
        try{
            let key = `goodsInfo:${goodsId}`
            let rs = await redisClient.hmset(key, goodsInfo )
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e , ErrorCode.REDIS_ERROR)
        }
    },
    /**
     * @description 获取指定商品的所有field
     * @param goodsId {type: String} 商品ID
     * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
    get: async (goodsId)=>{
        try{
            let key = `goodsInfo:${goodsId}`
            let rs = await redisClient.hgetall(key)
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR)
        }
    },
    /**
     * @desc 获取商品信息的fields
     * @param goodsId {type: string }  商品信息ID
     * @param field {type : string } 商品信息field
     * @return {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
    getField:async(goodsId, field) =>{
        try{
            let key = `goodsInfo:${goodsId}`
            let rs  = await redisClient.hget(key, field)
            return utils.Success(rs)

        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR)
        }
    },
    /**
     * @description 更新商品的fields
     * @param goodsId  {type: String} 商品ID
     * @param keyValueMap {type: Object}
     * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
    updateField :async (goodsId , keyValueMap )=>{
        try{
            let key = `goodsInfo:${goodsId}`
            let rs = await redisClient.hset(key , keyValueMap)
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR)
        }
    }
}





module.exports = {GoodsNumRedisModel, GoodsLockRedisModel, RedisTransaction, GoodsInfoRedisModel}