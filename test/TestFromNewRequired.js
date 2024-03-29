const utils = require("../common/utils/utils")
const Constant = require("../common/const/Common")
const assert = require("assert")
const {GoodsNumRedisModel, GoodsInfoRedisModel, GoodsLockRedisModel} = require("../models/redis/GoodsInfo");
const GoodsService = require("../services/GoodsService")
const CartInfoService = require("../services/CartService")
const CartOrderService = require("../services/CartService/CartOrder")
const OrderService = require("../services/OrderService")


const {GoodsDetail, GoodsInfo} = require("../models/mongo/GoodsInfo");
const {UserInfoRedisModel} = require("../models/redis/UserInfo");
const {OrderInfoRedisLock} = require("../models/redis/OrderInfo");
const {UserInfoMongoModel} = require("../models/mongo/UserInfo");

let userInfo = {
    _id: "660036a6c8f9e09dff0bf1f6",
    userName: "oreo"
}


/**
 * @description 新需求
 * User Case 用例场景是:
 * 创建3种不同类别的商品(每种2-3个商品)库存,
 * 根据类型查询商品列表,
 * 添加任意两种类别的商品(各自随机个数, 不超过库存)到购物车,
 * 生成订单后锁定库存,
 * 再模拟支付成功后返回订单详细信息.
 */


/**
 * @description
 * 关于超售和抢单的问题回复
 * 1. 一般涉及购物最大的问题是超售和客户的资金安全， 两者都会
 * 带来不好的用户体验和经济损失，这个是系统的难点； 在我设计系
 * 统的时候都是考虑进去了的，商品库存使用 redis 的list 进行
 * 存储， 出售一个商品（生成订单），就从list中pop一个库存出
 * 来 ， list 空了就销售完了,我这个是具备秒杀商品的功能的，
 * 虽然有地方可能会导致脏数据，但是我自己知道在哪里，有空可
 * 以来找找。
 * 2. 订单支付的时候， 请求进来就使用 redis.setNx 锁住，防
 * 止其他进程或者服务 出现重复支付或者脏数据的问题，来解决上述
 * 问题
 * 3. 我目前觉得这个系统最大的问题是 不知道具体访问量和数据规模，
 * 所以我得进一步优化没有做
 * 4. 这里有一个前提 我没做过商城或者支付一类的工作
 * @to Tester or Technology Developer
 */



let goodsDetailOne = {
    extraData: null,
    contentHtml: '<p class="is-style-text-indent-2em ">火车还有六个小时才开，无聊就在候车厅呆呆，实在无聊了，就把自己的<a href="https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/" title="【查看含有[英语]标签的文章】" class="atags color-5" target="_blank">英语</a>词汇书拿出来看了起来，<a href="https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/" title="【查看含有[英语]标签的文章】" class="atags color-5" target="_blank">英语</a>老烂了，但为了解决无聊，就翻了几下。</p><p class="is-style-text-indent-2em">忽然旁边坐过来一年轻小哥哥，瘦瘦的。看我拿本<a href="https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/" title="【查看含有[英语]标签的文章】" class="atags color-5" target="_blank">英语</a>书在看，就问我，“大学生在昆明读书啊？”，我看了一下他，不像是坏人，而且看起来也不讨厌，就弱弱地回答，“不是，在郑州。”</p>'
}


let goodsTypes = new Set()

/**
 * @description 生成随机的商品
 * @return {*[]}
 * @constructor
 */
function GoodsGenerator() {
    let result = []
    for (let x = 0; x < 4; x++) {
        let goodsType = Constant.GOODS_TYPE[Math.floor(Math.random() * Constant.GOODS_TYPE.length)];
        goodsTypes.add(goodsType)
        result.push({
                "goodsInfo": {
                    goodsType,
                    "goodsName": "goodsName" + Date.now(),
                    goodsPrice: 100,
                    goodsCount: Math.round(Math.floor(Math.random() * (3 - 2 + 1)) + 2),
                    "goodsImgs": [
                        "http://localhost:8080/file/v2/api/down/af7437addb3e288c18ee66ad807ddea9",
                        "http://localhost:8080/file/v2/api/down/9eabbf4940613653c0e720575ee526c4"
                    ]
                },
                "goodsDetail": goodsDetailOne
            }
        )
    }

    return result
}


const GeneralizeTest = async () => {
    try {
        // 生成需要入库商品
        let createGoodsList = GoodsGenerator()
        let createGoodsTasks = []

        for (const x of createGoodsList) {
            createGoodsTasks.push(GoodsService.addGoods(x))
        }

        assert.equal(createGoodsTasks.length === createGoodsList.length, true, "任务数量和商品数量对不上")
        // 并发新增商品商品入库
        let rs = await Promise.allSettled(createGoodsTasks)
        for (const x in rs) {
            if (rs[x].status !== "fulfilled") {
                console.error(rs[x].reason)
                assert.fail("商品并行入库出现错误 : " + rs[x].reason)
            } else {
                assert.equal(rs[x].value.success, true, "商品并行入库出现错误 msg :"+ JSON.stringify(rs[x].value))
            }
        }

        let goodsInfoMap = {}
        // 按照类型检测商品按照类型检索
        for (const goodsType of goodsTypes) {
            let goodsListRs = await GoodsService.search({goodsType})
            assert.equal(goodsListRs.success, true, "根据商品类型检索商品出现错误 " + JSON.stringify(goodsListRs))
            assert.equal(goodsListRs.data.count > 0, true, "根据商品类型检索商品出现错误, 没有找到商品 " + JSON.stringify(goodsListRs))
            for (let x of goodsListRs.data.list) {
                goodsInfoMap[x.goodsType] = {
                    goodsCount: x.goodsCount,
                    goodsId: x._id.toString()
                }
            }
        }


        let cartInfoTask = []
        // 商品加入购物车
        for (const goodsType in goodsInfoMap) {
            let {goodsCount, goodsId} = goodsInfoMap[goodsType]
            cartInfoTask.push(CartInfoService.addGoodsIntoCart(userInfo, goodsId, Math.floor(Math.random() * (goodsCount)) + 1))
        }

        rs = await Promise.allSettled(cartInfoTask)

        // 检测并发商品加入购物车结果
        const cartIds = []
        for (const x in rs) {
            if (rs[x].status !== "fulfilled") {
                console.error(rs[x].reason)
                assert.fail("商品并行加入购物车出现错误 : " + rs[x].reason)
            } else {
                assert.equal(rs[x].value.success, true, "商品并行加入购物车出现错误 msg :", JSON.stringify(rs[x].value))
                cartIds.push(rs[x].value.data._id.toString())
            }
        }

        let beforePayUserInfo = await UserInfoMongoModel.findOne({_id: userInfo._id})

        assert.equal(!!beforePayUserInfo, true, "订单支付之前。没有找到用户钱包信息 ")


        // 购物车商品直接添加到订单
        let orderRs = await CartOrderService.createOrder(userInfo, cartIds)
        assert.equal(orderRs.success, true, "购物车商品生成订单出现错误 ： " + JSON.stringify(orderRs))

        let orderInfo = orderRs.data
        // 支付订单  获取最新的订单信息
        let payRs = await OrderService.payOrder(userInfo, orderInfo._id.toString(), 1)
        assert.equal(payRs.success, true, "支付订单出现错误： " + JSON.stringify(payRs))
        let newOrderInfo = payRs.data



        // 检测库存 是否对得上

        let goodsCheckOutMap = {}
        const {orderGoodsInfo, totalPrice} = newOrderInfo
        for (const x of orderGoodsInfo) {
            goodsCheckOutMap[x.goodsId] = x.goodsCount
        }

        let goodsMap = {}
        let goodsIds = Object.keys(goodsCheckOutMap)
        let goodsList = await GoodsInfo.find({_id: {$in: goodsIds}}).lean()
        assert.equal(goodsList.length === goodsIds.length, true, "有部分商品没有检测到")

        for (const x in goodsList) {
            goodsMap[goodsList[x]._id.toString()] = goodsList[x]
        }

        for (const goodsId in goodsCheckOutMap) {
            assert.equal(!!goodsMap[goodsId], true, "部分商品的库存没有查询到 ")
            assert.equal(goodsMap[goodsId].soldCount === goodsCheckOutMap[goodsId], true,"售出商品和 订单商品对不上" + JSON.stringify({goodsMap,goodsCheckOutMap} ) )
            // 检测商品锁是否存在
            let lockRs = await GoodsLockRedisModel.status(goodsId)
            assert.equal(lockRs.success, true, "获取商品锁出现错误； " + JSON.stringify(lockRs))
            assert.equal(!lockRs.data, true, "商品都出库完成了，订单也支付了还有商品锁")
        }


        // 检测用户锁
        let lockRs = await UserInfoRedisModel.status(userInfo._id)
        assert.equal(lockRs.success, true, "获取用户钱包锁信息出现错误 ： " + JSON.stringify(lockRs))
        assert.equal(!lockRs.data, true, "商品都出库完成了，订单也支付了还有用户钱包锁")

        // 检测订单锁

        lockRs = await OrderInfoRedisLock.status(orderInfo._id.toString())
        assert.equal(lockRs.success, true, "获取用户订单锁信息出现错误 ： " + JSON.stringify(lockRs))
        assert.equal(!lockRs.data, true, "商品都出库完成了，订单也支付了还有用户订单锁")
        // 检测用户余额是否发生变化

        let afterPayUserInfo = await UserInfoMongoModel.findOne({_id: userInfo._id})

        assert.equal(!!afterPayUserInfo, true, "订单支付之后。没有找到用户钱包信息 ")

        assert.equal(beforePayUserInfo.userWallet === afterPayUserInfo.userWallet + orderInfo.totalPrice, true, "购买商品之后用户钱包数量对不上")


        console.error("新测试需求 测试完成！")
        return utils.Success()

    } catch (e) {
        console.error(e)
        assert.fail("综合测试出现错误")
    }
}

module.exports = {
    GoodsGenerator,
    GeneralizeTest
}