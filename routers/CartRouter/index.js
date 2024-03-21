const express = require("express")
const utils = require("../../common/utils/utils");
const ErrorCode = require("../../common/const/ErrorCode");
const Constant = require("../../common/const/Common");
const CartService  = require("../../services/CartService")
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
    if (!goodsId  || goodsId.length !== 24 ){
        return utils.Error(null , ErrorCode.PARAM_ERROR, "goodsId")
    }

    if(!goodsNum ||  isNaN(goodsNum)){
        return utils.Error(null , ErrorCode.PARAM_ERROR, "goodsNum")
    }

    if (typeof goodsNum === "string"){
        goodsNum = parseInt(goodsNum)
    }

    if(goodsNum <= 0  ){
        return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsNum")
    }

    let rs = await CartService.addGoodsIntoCart(userInfo, goodsId, goodsNum )
    return res.json(rs)


})


/**
 * @description  删除用户购物车指定商品
 */
router.delete("/:goodsId" , async (req, res)=>{
    let userInfo  = req.userInfo
    let {goodsId} = req.params

})


/**
 * @description 清空购物车
 */
router.delete("/", async(req, res)=>{
    let userInfo = req.userInfo

})


/**
 * @description 修改指定购物车商品
 */
router.put("/:goodsId" , async(req, res)=>{
    let userInfo = req.userInfo

})


/**
 * @description 修改整个购物内部商品
 */
router.put("/" , async(req, res)=>{

})


module.exports = router