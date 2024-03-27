const CartService = require("../services/CartService/index")
const CartOrderService = require("../services/CartService/CartOrder")
const {GoodsNumRedisModel} = require("../models/redis/GoodsInfo")
const {GoodsInfo} = require("../models/mongo/GoodsInfo")
const assert = require("assert")
const utils = require("../common/utils/utils");
// let goodsId = "6603b77a60bf799727182c1e"
// let goodsName = "TOYOTA"
let userInfo = {
    _id: "660036a6c8f9e09dff0bf1f6",
    userName: "oreo"
}

function TestCartOne() {
    return new Promise(res => {
        try {
            GoodsInfo.findOne({goodsStatus: 1}).then(goodsInfo => {
                if (goodsInfo) {
                    const goodsId = goodsInfo._id.toString()
                    const goodsName = goodsInfo.goodsName
                    CartService.search(userInfo, {goodsName: goodsInfo.goodsName}).then(listRs => {
                        assert.equal(listRs.success, true, "检索用户购物车出现错误: " + JSON.stringify(listRs))
                        // 购物车该商品从零到有
                        CartService.addGoodsIntoCart(userInfo, goodsInfo._id, 2).then(rs => {
                            assert.equal(rs.success, true, "新增商品到购物车出现错误: " + JSON.stringify(rs))
                            if (listRs.data.count === 0) {
                                // 刚开始购物车没有该商品
                                assert.equal(rs.data.goodsCount, 2, "添加商品到购物车出现错误： " + JSON.stringify(rs))
                            } else {
                                // 该商品本来就存在于购物车
                                assert.equal(rs.data.goodsCount, listRs.data.list[0].goodsCount + 2, "添加商品到购物车出现错误： " + JSON.stringify(rs))
                            }
                            // 出了刚刚添加的商品 其他商品全部删除

                            // return
                            CartService.updateCart(userInfo, [rs.data]).then(updateRs => {
                                assert.equal(updateRs.success, true, "更新编辑整个购物出现错误： " + JSON.stringify(updateRs))
                                CartService.search(userInfo, {goodsName}).then(listRs => {
                                    assert.equal(listRs.success, true, "更新购物车后检索用户购物车出现错误: " + JSON.stringify(listRs))
                                    assert.equal(listRs.data.count, 1, "更新购物车后检索用户购物车出现错误, 购物车内的商品数量条数不符合： " + JSON.stringify(listRs))
                                    // 查查 库存
                                    GoodsNumRedisModel.getCount(goodsId).then(goodsNumRs => {
                                        assert.equal(goodsNumRs.success, true, "创建订单之前，查询库存出现错误： " + JSON.stringify(goodsNumRs))
                                        CartOrderService.createOrder(userInfo, [listRs.data.list[0]._id.toString()]).then(createRs => {
                                            assert.equal(createRs.success, true, "从购物车创建订单出现错误： " + JSON.stringify(createRs))
                                            CartService.search(userInfo, {goodsName}).then(listRs => {
                                                assert.equal(listRs.success, true, "购物车生成订单之后" + JSON.stringify(listRs))
                                                assert.equal(listRs.data.count, 0, "购物车商品生成订单之后， 该商品需要从购物车中移除， 但是没有没有移除" + JSON.stringify(listRs))
                                                GoodsNumRedisModel.getCount(goodsId).then(goodsNum1Rs => {
                                                    assert.equal(goodsNum1Rs.success, true, "创建订单之前，查询库存出现错误： " + JSON.stringify(goodsNum1Rs))
                                                    assert.equal(goodsNumRs.data - 2, goodsNum1Rs.data, "创建订单之后库存没有变化 ")
                                                    console.log("购物车测试1完成")
                                                    return res(utils.Success())
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        })
                    })
                } else {
                    assert.fail("没有足够的库存测试购物车")
                }
            }).catch(err => {
                assert.fail("获取商品信息出现bug" + err)
            })

        } catch (e) {
            console.error(e)
            return res(utils.Error(e))
        }
    })
}


function TestCartTwo() {
    return new Promise(resolve => {
        try {
            GoodsInfo.findOne({goodsStatus: 1}).then(goodsInfo => {
                if (goodsInfo) {
                    const goodsId = goodsInfo._id.toString()
                    CartService.clearCart(userInfo).then(rs => {
                        assert.equal(rs.success, true, "清空购物车出现错误 ;" + JSON.stringify(rs))
                        CartService.search(userInfo, {}).then(rs => {
                            assert.equal(rs.success, true, "查询购物车列表出现错误")
                            assert.equal(rs.data.count, 0, "清理购物车之后， 购物车还存在商品")
                            CartService.addGoodsIntoCart(userInfo, goodsId, 2).then(rs => {
                                assert.equal(rs.success, true,"新增商品到购物车出现错误: " + JSON.stringify(rs))
                                CartService.deleteGoodsFromCart(userInfo, rs.data._id).then(rs => {
                                    CartService.search(userInfo, {}).then(rs => {
                                        assert.equal(rs.success, true, "查询购物车列表出现错误")
                                        assert.equal(rs.data.count, 0, "清理购物车唯一商品之后， 购物车还存在商品")
                                        console.log("购物车测试2完成")
                                        return resolve(utils.Success())
                                    })
                                })
                            })
                        })
                    })
                } else {
                    assert.fail("没有足够的库存测试购物车")
                }
            })
        } catch (e) {
            console.error(e)
            assert.fail("测试购物车出现错误！")
        }
    })

}

module.exports = {
    TestCartOne,
    TestCartTwo
}
