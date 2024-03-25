const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const {CartInfoModel} = require("../../models/mongo/CartInfo");
const  GoodsInfoEsModel= require("../../models/es/GoodsInfo")()
const {GoodsInfoRedisModel} = require("../../models/redis/GoodsInfo")
const {GoodsInfo} = require("../../models/mongo/GoodsInfo");

const service = {}
/**
 * @description 更新用户购物
 * @param userInfo {type: Object} y用户信息
 * @param cartInfos {type :Array} 购物车商品列表
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.updateCart = async(userInfo , cartInfos)=>{
    try{
        let needDeleteGoods = []
        let needChangedGoods = [] ;

        const userId = userInfo._id

        let originalCartList = await  CartInfoModel.find({userId} ,{_id: 1 , goodsId:1 , count:1}).lean()
        if(originalCartList.length === 0 ){
            return utils.Error(null , ErrorCode.CART_INFO_NOT_FOUND)
        }

        // 判断需要变更的商品
        for (const x in cartInfos){
            let cartInfo = originalCartList.find((t)=>{
                return t._id.toString() === cartInfos[x]._id
            })
            // 商品数量不相等就是要更新
            if ( !cartInfo || cartInfo.goodsCount !== cartInfos[x].goodsCount ){
                needChangedGoods.push(cartInfos[x])
            }
        }

        // 判断需要删除的商品
        for(const x in originalCartList){
            let cartInfo= cartInfos.find((t)=>{
                return t._id === originalCartList[x]._id.toString()
            })

            if(!cartInfo){
                needDeleteGoods.push(originalCartList[x]._id)
            }
        }

        // 把更新删除任务放入数组使用promise 同时异步执行
        let tasks = []

        if (needDeleteGoods.length > 0 ){
            tasks.push(CartInfoModel.deleteMany({_id:{$in: needDeleteGoods} , userId}))
        }

        for(const x in needChangedGoods){
            tasks.push(CartInfoModel.updateOne({_id: needChangedGoods[x]._id , userId},{$set:{goodsCount: needChangedGoods[x].goodsCount}}))
        }

        if(tasks.length ){
            let results  = await Promise.allSettled(tasks)
            for(const x in results){
                if (results[x].status !== "fulfilled"){
                    return utils.Error(results[x].reason)
                }
            }
        }

        return utils.Success()

    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


/**
 * @description 更新指定购物车商品的数量
 * @param userInfo {type: Object} 用户信息
 * @param cartId {type: Mongoose.Types.ObjectId} 购物车商品ID
 * @param cartInfo {type : CartInfoModel} 商品信息
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.updateGoodsFromCart = async(userInfo ,cartId, cartInfo )=>{
    try{
        const {goodsId , count } = cartInfo ;

        let originalCartInfo = await CartInfoModel.findOneAndUpdate({_id: cartId , userId : userInfo._id , goodsId},{$set: {count} }, {upsert:false , new:true })

        if(!originalCartInfo){
            return utils.Error(null , ErrorCode.CART_INFO_NOT_FOUND)
        }
        return utils.Success(originalCartInfo)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}



/**
 * @description  清空用户购物车
 * @param userInfo {type : Object } 用户信息
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.clearCart = async (userInfo)=>{
    try{
        let userId  = userInfo._id
        let rs = await CartInfoModel.deleteMany({userId})
        return utils.Success(rs)
    }catch (e) {
        console.log(e)
        return utils.Error(e)
    }
}



/**
 * @description 删除用户指定购物车中的商品
 * @param userInfo {type : Object } 用户信息
 * @param cartId {type: Mongoose.Schema.Types.ObjectId} 商品购物车ID
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.deleteGoodsFromCart = async (userInfo , cartId)=>{
    try{
        let userId = userInfo._id
        let rs =  await CartInfoModel.findOneAndDelete({_id: cartId , userId})
        return utils.Success(rs)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


/**
 * @description 添加商品到购物车
 * @param userInfo {type: Object} 用户信息
 * @param goodsId {type: Mongoose.Types.ObjectId} 商品ID
 * @param goodsCount {type: Number} 商品数量
 */
service.addGoodsIntoCart = async (userInfo , goodsId , goodsCount ) =>  {
    try{
        let userId = userInfo._id
        //  查看商品是否存在于购物车
        let goodsInCart = await CartInfoModel.findOne({userId , goodsId})
        if (goodsInCart){
            // 已经存在购物车 加数量即可
             let rs = await CartInfoModel.findOneAndUpdate({_id: goodsInCart._id},{$inc:{goodsCount}},{upsert:false , new: true})
            return utils.Success(rs)
        }else{
            // 不存在就比较麻烦 ，提取数据然后入库
            let goodsInfoRs = await GoodsInfoRedisModel.get(goodsId)

            if(!goodsInfoRs.success){
                return goodsInfoRs
            }

            let goodsInfo = goodsInfoRs.data

            goodsInCart = {
                goodsId,
                userId,
                goodsCount
            }

            if (Object.keys(goodsInfo).length > 0 ){
                goodsInCart = {...goodsInfo,...goodsInCart }


                // goodsInCart =  Object.assign(goodsInCart,goodsInfo )
            }else {
                goodsInfo = await GoodsInfo.findOne({_id:goodsId})
                if (!goodsInfo) {
                    return utils.Error(null , ErrorCode.GOODS_INFO_NOT_FOUND)
                }
                goodsInCart =  goodsInCart = {...goodsInfo,...goodsInCart }
            }

            goodsInCart = new CartInfoModel(goodsInCart)

            await goodsInCart.save()
            return utils.Success(goodsInCart)
        }

    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


/**
 * @description 用户检索自己的购物车
 * @param userInfo
 * @param params
 * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.search = async  (userInfo , params)=>{
    try{
        const{orderBy , orderSeries  , goodsName , goodsStatus , pageSize  , pageNo }= params

        // 先看看是否有商品名称
        let ids = []
        let search = {userId : userInfo._id}


        if (goodsName){
            let query = {
                "multi_match": {
                    "query": goodsName ,
                    "type": "most_fields",
                    "operator":"or",
                    "fields": ["goodsName"]
                }
            }

            let esRs  = await GoodsInfoEsModel.search(query)
            let hits = esRs.data.hits.hits

            for(const x in hits){
                ids.push(hits[x]._source.id)
            }

            if(ids.length === 0 ){
                return utils.Success({list:[],count:0 })
            }else{
                search.goodsId = {$in: ids}
            }

        }




        let sort = {}
        if (orderSeries === "asc"){
            sort[orderBy] = 1
        }else{
            sort[orderBy] = -1
        }


        // 检索数据库
        let list = await  CartInfoModel.find(search).sort(sort).skip(pageNo * pageSize ).limit(pageSize).lean();
        for(let x in list ){
            let goodsId = list[x].goodsId
            let goodsInfoRs  = await GoodsInfoRedisModel.get(goodsId)
            if (!goodsInfoRs.success){
                return goodsInfoRs
            }
            let goodsInfo = goodsInfoRs.data ;
            let len = Object.keys(goodsInfoRs.data).length
            if(len === 0 ){
                goodsInfo = await GoodsInfo.findOne({_id: goodsId}, { goodsImgs:1 , goodsPrice :1 , goodsStatus : 1 , SoldCount:1 , _id:0 })
                if (goodsInfo){
                    let rs = await GoodsInfoRedisModel.insert(goodsId, goodsInfo)
                    if(!rs.success){
                        console.error(rs.error)
                    }
                }
            }

            list[x] = { ...goodsInfo,...list[x]}
        }

        let count = await CartInfoModel.countDocuments(search)

        return utils.Success({list,count })

    }catch (err) {
        console.error(err)
        return utils.Error(err)
    }


}

module.exports = service