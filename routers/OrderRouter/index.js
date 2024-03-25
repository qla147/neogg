const express = require("express")
const router = express.Router()
const utils = require("../../common/utils/utils")
const ErrorCode  = require("../../common/const/ErrorCode")
const OrderService = require("../../services/OrderService")
const mongoose = require("mongoose");





/**
 * @description 获取取订单列表
 */
router.get("/" , async(req , res)=>{
    let userInfo = req.userInfo
    // 使用管道解决问题
    //------------------------------------------------------------------------------------------------------------
    let   {goodsName  , pageSize , pageNo , orderStatus } = req.query

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

    if(orderStatus && !([ 0,1, 2, 3, 4].includes(orderStatus) ||[ "0","1", "2", "3", "4"].includes(orderStatus)) ){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "orderStatus"))
    }

    let rs = await OrderService.search(userInfo ,{pageSize, pageNo , goodsName, orderStatus})

    return res.json(rs)

})


/**
 * description 新增订单
 */
router.post("/" , async (req, res) =>{
    let userInfo  = req.userInfo
    let goodsInfos = req.body
    if (!Array.isArray(goodsInfos) || goodsInfos.length === 0 ){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "goodsInfos"))
    }

    for(const x in goodsInfos){
        let  {goodsId , goodsCount } = goodsInfos[x]
        if (!mongoose.isValidObjectId(goodsId)){
            return res.json(utils.Error(null ,ErrorCode.PARAM_ERROR , "goodsInfos.goodsId"))
        }

        if (isNaN(goodsCount)){
            return res.json(utils.Error(null ,ErrorCode.PARAM_ERROR , "goodsInfos.goodsCount"))
        }

        if(typeof goodsCount === "string"){
            goodsInfos[x].goodsCount = parseInt(goodsCount)
        }

        if( goodsInfos[x].goodsCount <= 0 ){
            return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "goodsInfos.goodsCount"))
        }
    }

    let rs = await OrderService.addOrder(userInfo , goodsInfos)
    return res.json(rs)
})



/**
 * @description 删除订单, 删除是不可能删除掉  换个地方存起来
 */
router.delete("/:orderId" , async(req, res)=>{
    let userInfo = req.userInfo
    let {orderId} = req.params

    if(!mongoose.isValidObjectId(orderId)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "orderId"))
    }

    let rs = await OrderService.deleteOne(userInfo , orderId)
    return res.json(rs)
})



/**
 * @description 取消订单
 */
router.put("/:orderId/cancel" , async(req, res)=>{
    let userInfo = req.userInfo
    let {orderId} = req.params

    if(!mongoose.isValidObjectId(orderId)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "orderId"))
    }

    let rs = await OrderService.cancelOrder(userInfo , orderId)
    return res.json(rs)
})


/**
 *  @description 支付订单
 */
router.post("/:orderId/pay" ,async (req , res)=>{
    const userInfo = req.userInfo
    const {orderId} = req.params
    const {payMethod} = req.body
    if(!mongoose.isValidObjectId(orderId)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "orderId"))
    }

    if(payMethod !== 1 ){
        return res.json(utils.Error(null , ErrorCode.ORDER_PAY_METHOD_ONLY_SUPPORT_DIGITAL_WALLET))
    }

    // 支付订单
    let rs = await OrderService.payOrder(userInfo , orderId , payMethod)
    return res.json(rs)
})

// /**
//  * @description 订单再次购买
//  */
// router.post("/:orderId/purchaseAgain", async(req , res)=>{
//
//
//
// })

// /**
//  * @description  订单退货退款
//  */
// router.put("/:orderId/refund", async(req, res)=>{
//
//
//
// })


module.exports =  router