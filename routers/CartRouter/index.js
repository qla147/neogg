const express = require("express")
const router = express.Router()


/**
 * @description 获取用户购物车列表
 */
router.get("/" , async (req, res )=>{

        let userInfo = req.userInfo

})

/**
 * @description 添加物品购物车， 一次只能添加一个
 */
router.post("/" , async(req , res)=>{
    let userInfo = req.userInfo
    let  { goodsId , goodsNum } = req.body
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