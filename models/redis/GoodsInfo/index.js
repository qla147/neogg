const redisClient = require("../../../common/db/redis")
const utils = require("../../../common/utils/utils")
const ErrorCode = require("../../../common/const/ErrorCode")
const config  = global._config

const GoodsLockRedisModel = {
    lock: async(goodsId)=>{
        try{
            let key = "lock:"+goodsId
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
            let rs = await redisClient.del( "lock:"+goodsId)
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR)
        }

    }


}


const GoodsNumRedisModel = {
    // 入库一个商品
    insertOne :async (goodsId, no )=>{
        try{
            let rs = await redisClient.lpush("goodsNum:"+goodsId,no )
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
          return utils.Error(e)
      }
    },
    // 出库一个商品
    removeOne : async (goodsId ) =>{
        try{
            let rs = await redisClient.rpop("goodsNum:"+goodsId)
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e, ErrorCode.REDIS_ERROR )
        }
    },
    // 二次添加商品的数量
    addMore:async (goodsId , startNum, num )=>{
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
                indexes.push(startNum++)

                if(indexes.length > 5){
                    await redisClient.lpush(key, ...indexes)
                    indexes = []
                }
                index--
            }

            if (indexes.length > 0){
                await redisClient.lpush(key , ...indexes)
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

module.exports = {GoodsNumRedisModel}