const express = require("express")
const router = express.Router()
const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const Constant = require("../../common/const/Common")
const GoodsService = require("../../services/GoodsService")


const checkGoodsInfoAndGoodsDetail = (goodsInfo , goodsDetail) =>{
    try{
        // ----------------------------------------------参数检测-goodsInfo---------------------------------------------------
        if (!goodInfo){
            return utils.Error(null , ErrorCode.PARAM_ERROR, "goodInfo")
        }

        if(goodsDetail){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsDetail")
        }

        let  {goodsType, goodsName , goodsPrice, goodCount , goodsImgs } = goodInfo

        if (!Constant.GOODS_TYPE.includes(goodsType)){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsType")
        }

        if(!goodsName || goodsName.length === 0  || goodsName.length > 200){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsName")
        }

        if(!goodsPrice ||isNaN(goodsPrice)){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsPrice")
        }

        if (typeof goodsPrice == "string"){
            goodsPrice = parseInt(goodsPrice)
        }

        if (goodsPrice <= 0 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsPrice")
        }


        if (!goodCount || isNaN(goodCount)){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodCount")
        }

        if(typeof goodCount == "string"){
            goodCount = parseInt(goodCount)
        }

        if (goodCount <= 0  || goodCount > 9999){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodCount")
        }

        if(!Array.isArray(goodsImgs) || goodsImgs.length === 0 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsImgs")
        }

        for(const x in goodsImgs){
            if (goodsImgs[x].length === 0 ){
                return utils.Error(null , ErrorCode.PARAM_ERROR , "goodsImgs")
            }
        }

        //-----------------------------------------------------参数检测-goodsDetail-------------------------------------------
        let  { extraData , contentHtml } = goodsDetail

        if (contentHtml.length === 0 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "contentHtml")
        }

    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}

/**
 * @desc 修改商品价格
 *
 */
router.put("/:goodsId/price" , async(req, res) =>{
    const {goodsId} = req.params
    const {goodsPrice} = req.body



})

router.put("/:goodsId/count" , async(req, res) =>{
    const {goodsId} = req.params
    const {goodsPrice} = req.body


})



/**
 * @description : 新增商品到数据库
 * @param goodsInfo 商品基本信息
 * @param goodsDetail 商品详情
 */
router.post("/" , async (req , res)=>{

    //---------------------------------------------------------调用服务层-------------------------------------------------
    let  rs = await GoodsService.addGoods({
        goodsInfo :{goodsType, goodsName , goodsPrice, goodCount , goodsImgs},
        goodsDetail: {extraData , contentHtml}
    })
    return res.json(rs)


})

/**
 * @description 根据商品ID 获取商品详情
 * @param goodsId  商品ID
 */
router.get("/detail/:goodsId" , async(req, res)=>{
    const {goodsId} = req.params ;
    if (!goodsId || goodsId.length !== 24){
        return utils.Error(null , ErrorCode.PARAM_ERROR, "goodsId")
    }
    let rs = await GoodsService.getGoodsDetailByGoodsId(goodsId)
    return res.json(rs)
})

/**
 * @description 获取商品信息
 */
router.get("/info/:goodsId" , async(req , res)=>{
    const {goodsId} = req.params ;
    if (!goodsId || goodsId.length !== 24){
        return utils.Error(null , ErrorCode.PARAM_ERROR, "goodsId")
    }
    let rs = await GoodsService.getGoodsInfoByGoodsId(goodsId)
    return res.json(rs)

})
/**
 * @description 检索商品列表
 * @param orderBy 排序字段
 * @param orderSeries 升序 asc、降序desc
 * @param quickSearck 快捷模糊查询 支持 goodsType goodsName goodsPrice
 * @param maxGoodsPrice 最高商品价格
 * @param miniGoodsPrice 最低商品价格
 * @param status 商品状态 1:在售 ;2:售罄
 * @param pageSize pageNo 分页参数
 */
router.get("/" , async (req , res) =>{
    let { orderBy = "createTime" , orderSeries = "asc", quickSearch , goodsType , goodsName , maxGoodsPrice , minGoodsPrice, status , pageSize , pageNo } = req.query
    // ----------------------------------------------------------------参数检验和校正-------------------------------------
    if (!!orderBy && !["goodsPrice","goodsName", "goodsType", "createTime"].includes(orderBy)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "orderBy"))
    }

    if (!!orderSeries && !["desc", "asc"].includes(orderSeries)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "orderSeries"))
    }

    if (!!maxGoodsPrice && isNaN(maxGoodsPrice)){
         return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "maxGoodsPrice"))
    }

    if (!!minGoodsPrice && isNaN(minGoodsPrice)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "minGoodsPrice"))
    }

    if (!!goodsType && Constant.GOODS_TYPE.includes(goodsType)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "goodsType"))
    }

    if (!!status && !([1, 2].includes(status) || ["1" , "2"].includes(status) )){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR, "status"))
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

    let searchParam  = {orderBy , orderSeries, quickSearch , goodsType , goodsName , maxGoodsPrice , minGoodsPrice, status , pageSize  , pageNo }
    // 进入服务层
    let rs = await GoodsService.search(searchParam)
    return res.json(rs)
})


module.exports = router