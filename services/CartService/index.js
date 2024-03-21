const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const {CartInfoModel} = require("../../models/mongo/CartInfo");
const  GoodsInfoEsModel= require("../../models/es/GoodsInfo")()
const {GoodsInfoRedisModel} = require("../../models/redis/GoodsInfo")
const {GoodsInfo} = require("../../models/mongo/GoodsInfo");

const service = {}

/**
 * @description 添加商品到购物车
 * @param userInfo {type: Object} 用户信息
 * @param goodsId {type: Mongoose.Types.ObjectId} 商品ID
 * @param goodsNum {type: Number} 商品数量
 */
service.addGoodsIntoCart = async (userInfo , goodsId , goodsNum ) =>  {
    try{
        let goodsInCart = await CartInfoModel.findOne({userId: userInfo._id , goodsId})
        if (goodsInCart){
            // 已经存在购物车 加数量即可
             let rs = await CartInfoModel.findOneAndUpdate({_id: goodsInCart._id},{$inc:{count: goodsNum}},{upsert:false , new: true})
            return utils.Success(rs)
        }else{
            // 不存在就比较麻烦 ，提取数据然后入库
            let goodsInfo = await GoodsInfoRedisModel.get(goodsId)
            goodsInCart = {
                goodsId,
            }

            if (Object.keys(goodsInfo).length > 0 ){
                goodsInCart =  Object.assign(goodsInCart,goodsInfo )
            }else {
                goodsInfo = await GoodsInfo.findOne({_id:goodsId})
                if (!goodsInfo) {
                    return utils.Error(null , ErrorCode.GOODS_INFO_NOT_FOUND)
                }
                goodsInCart = Object.assign(goodsInCart, goodsInfo)
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

        if(goodsStatus){
            search.goodsStatus  = goodsStatus
        }

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
                search.goodIds = {$in: ids}
            }

        }

        let sort = {}
        if (orderSeries === "asc"){
            sort[orderBy] = 1
        }else{
            sort[orderBy] = -1
        }


        // 检索数据库
        let list = await  CartInfoModel.find(search ,).sort(sort).skip(pageNo * pageSize ).limit(pageSize).lean();
        for(let x of list ){
            let goodsId = x.goodsId
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

            x = {...x, ...goodsInfo}
        }



        let count ;
        if(list.length <= pageSize &&  pageNo === 0 ){
            count = list.length
        }else{
            count = await CartInfoModel.countDocuments(search)
        }

        return utils.Success({list,count })

    }catch (err) {
        console.error(err)
        return utils.Error(err)
    }


}

module.exports = service