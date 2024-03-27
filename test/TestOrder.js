const OrderService = require("../services/OrderService")
const {GoodsInfo} = require("../models/mongo/GoodsInfo")
const {GoodsNumRedisModel, GoodsLockRedisModel} = require("../models/redis/GoodsInfo")
const {UserInfoRedisModel} = require("../models/redis/UserInfo")
const {UserInfoMongoModel} = require("../models/mongo/UserInfo")
const assert = require("assert")
const {OrderInfoRedisLock} = require("../models/redis/OrderInfo");
const utils = require("../common/utils/utils");
const   userInfo =  {
    _id: "660036a6c8f9e09dff0bf1f6",
    userName: "oreo"
}
function TestOrderOne() {
    return new Promise(res=>{
        try{
            GoodsInfo.findOne({ goodsStatus:1}).then(goodsInfo => {
                if (goodsInfo){
                    GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs=>{
                        assert.equal(rs.success, true , "商品生成订单之前获取商品库存出现错误： "+ JSON.stringify(rs))
                        let beforeGoodsNum = rs.data
                        assert.equal(beforeGoodsNum  === goodsInfo.goodsCount - goodsInfo.soldCount , true , "商品生成订单之前，库存数量对不上！")
                        OrderService.addOrder(userInfo , [{ goodsId : goodsInfo._id.toString(), goodsCount: Math.floor(beforeGoodsNum / 5)  }]).then(rs=>{
                            console.error("rs=================> ",rs)
                            assert.equal(rs.success, true , "商品直接增加订单出现错误" + JSON.stringify(rs))
                            let orderInfo = rs.data
                            GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs=>{
                                assert.equal(rs.success, true , "商品生成订单之后获取商品库存出现错误： "+ JSON.stringify(rs))
                                // let afterGoodsNum = rs.data
                                // assert.equal(!afterGoodsNum , true, "商品被购买完了之后，库存应该为0 " + afterGoodsNum )
                                GoodsLockRedisModel.status(goodsInfo._id.toString()).then(rs=>{
                                    assert.equal(rs.success, true, "订单生成完成之后，获取商品锁状态，出现错误； "+ JSON.stringify(rs))
                                    assert.equal(!rs.data , true , "订单生成之后， 订单锁没有释放")
                                    UserInfoMongoModel.findOne({_id: userInfo._id}).then(currentUserInfo=>{
                                        assert.equal(!!currentUserInfo, true , "获取用户信息出现错误")
                                        let currentUserWallet = currentUserInfo.userWallet
                                        OrderService.payOrder(userInfo , orderInfo._id.toString(), 1).then(rs=>{
                                            assert.equal(rs.success, true,"支付订单出现错误： "+ JSON.stringify(rs))
                                            UserInfoMongoModel.findOne({_id: userInfo._id}).then(afterUserInfo=>{
                                                assert.equal(!!afterUserInfo, true , "获取用户信息出现错误")

                                                assert.equal(afterUserInfo.userWallet + orderInfo.totalPrice === currentUserWallet , true , "用户购买商品后，钱包数量对不上")
                                                UserInfoRedisModel.status(userInfo._id.toString()).then(rs=>{
                                                    assert.equal(rs.success, true , "获取用户锁出现错误")
                                                    assert.equal(!rs.data , true, "订单支付完成，用户锁依然存在")
                                                    OrderInfoRedisLock.status(orderInfo._id.toString()).then(rs=>{
                                                        assert.equal(rs.success, true , "获取订单锁出现错误 "+ JSON.stringify(rs))
                                                        assert.equal(!rs.data, true , "订单完成，订单锁依然存在")
                                                        assert.ok("订单测试1完成！")
                                                        return res(utils.Success())
                                                    })
                                                })
                                            }).catch(err=>{
                                                assert.fail("获取用户信息出现错误： "+ err)
                                            })
                                        })
                                    }).catch(err=>{
                                        assert.fail("获取用户信息出现错误： "+ err)
                                    })

                                })
                            })
                        })
                    })

                }else{
                    assert.fail("商品库没有库存，无法继续测试，请向商品库增加库存")
                }
            }).catch(err => {
                assert.fail("查询商品库信息出现错误 : "+ err)
            })
        }catch (e) {
            console.error(e)
            return res(utils.Error(e))
        }
    })
}

function TestOrderTwo() {
    return new Promise(res=>{
        try{
            GoodsInfo.findOne({ goodsStatus:1}).then(goodsInfo => {
                if (goodsInfo) {
                    GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs => {
                        assert.equal(rs.success, true, "商品生成订单之前获取商品库存出现错误： " + JSON.stringify(rs))
                        let beforeGoodsNum = rs.data
                        // assert.equal(beforeGoodsNum === goodsInfo.goodsCount, true, "商品生成订单之前，库存数量对不上！")
                        OrderService.addOrder(userInfo, [{
                            goodsId: goodsInfo._id.toString(),
                            goodsCount: Math.floor(beforeGoodsNum / 4  )
                        }]).then(rs => {
                            assert.equal(rs.success, true , "商品直接增加订单出现错误" + JSON.stringify(rs))
                            let orderInfo = rs.data
                            // GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs=>{
                            //     assert.equal(rs.success, true , "获取商品库存出现错误" + JSON.stringify(rs))
                                OrderService.cancelOrder(userInfo , orderInfo._id.toString()).then(rs=>{
                                    console.error("res==============>",rs)
                                    assert.equal(rs.success , true , "取消订单出现错误！"+ JSON.stringify(rs))
                                    GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs=>{
                                        assert.equal(rs.success, true , "获取商品库存出现错误" + JSON.stringify(rs))

                                        assert.equal(beforeGoodsNum  === rs.data , true ,  "取消订单后，商品回库数量对不上",  )
                                        assert.ok("订单测试2 完成")
                                        return res(utils.Success())
                                    })
                                })
                            // })
                        })
                    })
                }else{
                    assert.fail("商品库没有库存，无法继续测试，请向商品库增加库存")
                }
            })

        }catch (e) {
            console.error(e)
            return res(utils.Error(e))
        }
    })

}


function TestOrderThree (){
    return new Promise(res=>{
        try{
            GoodsInfo.findOne({ goodsStatus:1}).then(goodsInfo => {
                if (goodsInfo) {
                    GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs => {
                        assert.equal(rs.success, true, "商品生成订单之前获取商品库存出现错误： " + JSON.stringify(rs))
                        let beforeGoodsNum = rs.data
                        // assert.equal(beforeGoodsNum === goodsInfo.goodsCount, true, "商品生成订单之前，库存数量对不上！")
                        OrderService.addOrder(userInfo, [{
                            goodsId: goodsInfo._id.toString(),
                            goodsCount: Math.floor(beforeGoodsNum / 4)
                        }]).then(rs => {
                            assert.equal(rs.success, true , "商品直接增加订单出现错误" + JSON.stringify(rs))
                            let orderInfo = rs.data

                            // GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs=>{
                            //     assert.equal(rs.success, true , "获取商品库存出现错误" + JSON.stringify(rs))
                                // let beforeGoodsNum  = rs.data
                                OrderService.deleteOne(userInfo , orderInfo._id.toString()).then(rs=>{
                                    assert.equal(rs.success , true , "删除订单出现错误！"+ JSON.stringify(rs))
                                    GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs=>{
                                        assert.equal(rs.success, true , "获取商品库存出现错误" + JSON.stringify(rs))
                                        assert.equal(beforeGoodsNum === rs.data , true ,  "删除订单后，商品回库数量对不上" + JSON.stringify()  )
                                        assert.ok("订单测试2 完成")
                                        return res(utils.Success())
                                    })
                                })
                            // })
                        })
                    })
                }else{
                    assert.fail("商品库没有库存，无法继续测试，请向商品库增加库存")
                }
            })
        }catch (e) {
            console.error(e)
            return res(utils.Error(e))
        }
    })

}


module.exports = {
    TestOrderOne,
    TestOrderTwo,
    TestOrderThree
}