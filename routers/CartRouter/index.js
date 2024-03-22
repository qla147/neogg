const express = require("express")
const utils = require("../../common/utils/utils");
const ErrorCode = require("../../common/const/ErrorCode");
const Constant = require("../../common/const/Common");
const CartService  = require("../../services/CartService")
const mongoose   = require("mongoose")
const router = express.Router()


/**
 * @description 获取用户购物车列表
 */
router.get("/" , async (req, res )=>{
    let userInfo = req.userInfo

    //------------------------------------------------------------------------------------------------------------
    let   {goodsName , goodsType , goodsStatus , orderBy = "createTime" , orderSeries = "desc", pageSize , pageNo } = req.query
    if (!!orderBy && !["goodsName", "createTime"].includes(orderBy)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "orderBy"))
    }

    if (!!orderSeries && !["desc", "asc"].includes(orderSeries)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "orderSeries"))
    }


    if (!!goodsType && Constant.GOODS_TYPE.includes(goodsType)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "goodsType"))
    }

    if (!!goodsStatus && !([1, 2].includes(goodsStatus) || ["1" , "2"].includes(goodsStatus) )){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "goodsStatus"))
    }


    if (!pageSize || isNaN(pageSize)){
        pageSize = 10
    }

    if (typeof  pageSize == "string"){
        pageSize = parseInt(pageSize)
    }

    if (pageSize <=  0 ){
        pageSize = 10
    }


    if (!pageNo || isNaN(pageNo)){
        pageNo = 0
    }

    if (typeof  pageNo == "string"){
        pageNo = parseInt(pageNo)
    }

    if (pageNo <  0 ){
        pageNo = 0
    }

    let searchParam  = {orderBy , orderSeries , goodsType , goodsName , goodsStatus , pageSize  , pageNo }

    let rs = await CartService.search(userInfo , searchParam)

    return res.json(rs)
})

/**
 * @description 添加物品购物车， 一次只能添加一种商品
 */
router.post("/" , async(req , res)=>{
    let userInfo = req.userInfo
    let  { goodsId , goodsNum } = req.body
    if (!mongoose.isValidObjectId(goodsId) ){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "goodsId"))
    }

    if(!goodsNum ||  isNaN(goodsNum)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "goodsNum"))
    }

    if (typeof goodsNum === "string"){
        goodsNum = parseInt(goodsNum)
    }

    if(goodsNum <= 0  ){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "goodsNum"))
    }

    let rs = await CartService.addGoodsIntoCart(userInfo, goodsId, goodsNum )
    return res.json(rs)


})


/**
 * @description  删除用户购物车指定商品
 */
router.delete("/:cartId" , async (req, res)=>{
    let userInfo  = req.userInfo
    let {cartId} = req.params
    if(!mongoose.isValidObjectId(cartId)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "cartId"))
    }

    let rs = await CartService.deleteGoodsFromCart(userInfo , cartId)
    return res.json(rs)
})


/**
 * @description 清空购物车
 */
router.delete("/", async(req, res)=>{
    let userInfo = req.userInfo
    let rs = await CartService.clearCart(userInfo)
    return res.json(rs)
})


/**
 * @description 修改指定购物车商品
 */
router.put("/:cartId" , async(req, res)=>{
    let userInfo = req.userInfo
    let {cartId} = req.params
    if(!mongoose.isValidObjectId(cartId)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "cartId"))
    }
    const cartInfo = req.body
    if(!cartInfo ){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "cartInfo"))
    }
    let  {goodsId , count } = cartInfo

    if (!mongoose.isValidObjectId(goodsId)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "goodsId"))
    }

    if(count === undefined || isNaN(count)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "count"))
    }

    if(typeof count === "string"){
        count = parseInt(count)
        if(count <= 0  || count > 9999) {
            return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "count"))
        }
    }

    let rs = await CartService.updateGoodsFromCart(userInfo , cartId, {goodsId, count })
    return res.json(rs)
})


/**
 * @description 修改整个购物车内部商品
 */
router.put("/" , async(req, res)=>{
    let userInfo = req.userInfo
    let cartInfos = req.body
    if (!Array.isArray(cartInfos)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "cartInfos"))
    }
    for(const x in cartInfos){
        let  {_id , goodsId , count } = cartInfos[x]
        if (!mongoose.isValidObjectId(goodsId)){
            return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "goodsId"))
        }

        if (!mongoose.isValidObjectId(_id)){
            return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "cartId"))
        }

        if(count === undefined || isNaN(count)){
            return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "count"))
        }

        if(typeof count === "string"){
            count = parseInt(count)
            if(count <= 0  || count > 9999) {
                return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "count"))
            }
            cartInfos[x].count = count
        }
    }

    let rs ;
    if (cartInfos.length === 0 ){
        // 商品被清理完了 肯定是清空购物车
        rs = await CartService.clearCart(userInfo)
    }else{
        rs = await CartService.updateCart(userInfo , cartInfos)
    }
    return res.json(rs)

})


module.exports = router