const utils = require("../../common/utils/utils")
const {CartInfoModel} = require("../../models/mongo/CartInfo");
const OrderService = require("../OrderService")
const ErrorCode = require("../../common/const/ErrorCode")


const services = {}

/**
 * @description 购物车商品生成订单
 * @param userInfo {type: Object} 用户信息
 * @param cartIds {type: Array<string>} 购物车id列表
 * @return {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
services.createOrder = async(userInfo, cartIds)=>{
    try{
        let userId  = userInfo._id
        // 查看购物信息，比对
        let cartInfos = await CartInfoModel.find({_id:{$in: cartIds}, userId},{goodsId:1 , goodsCount:1}).lean()
        if(cartInfos.length !== cartIds.length){
            return utils.Error(null , ErrorCode.CART_INFO_NOT_FOUND)
        }
        console.error(1)
        // 生成订单
        let rs = await OrderService.addOrder(userInfo , cartInfos)

        if(!rs.success){
            return rs
        }

        await CartInfoModel.deleteMany({_id: {$in: cartIds}})

        return utils.Success()
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


module.exports = services