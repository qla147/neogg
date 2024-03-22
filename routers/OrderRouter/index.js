const express = require("express")
const {models} = require("mongoose");
const router = express.Router()
const utils = require("../../common/utils/utils")
const ErrorCode  = require("../../common/const/ErrorCode")
const OrderService = require("../../services/")
/**
 * @description 获取取订单列表
 */
router.get("/" , async(req , res)=>{
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

    if(![ 0,1, 2, 3, 4].includes(orderStatus) ||![ "0","1", "2", "3", "4"].includes(orderStatus) ){
        return utils.Error(null , ErrorCode.PARAM_ERROR , "orderStatus")
    }

    let rs = await OrderService.search()




})


/**
 * description 新增订单
 */
router.post("/" , async (req, res) =>{



})



/**
 * @description 删除订单
 */
router.delete("/:orderId" , async()=>{


})

/**
 * @description 获取订单详情
 */
router.get("/:orderId", async(req, res)=>{

})


/**
 *  @description 支付订单
 */
router.post("/:orderId/pay" ,async (req , res)=>{



})

/**
 * @description 订单再次购买
 */
router.post("/:orderId/purchaseAgain", async(req , res)=>{



})

/**
 * @description  订单退货退款
 */
router.put("/:orderId/refund", async(req, res)=>{



})


module.exports =  router