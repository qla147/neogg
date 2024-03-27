const assert = require("assert")

const GoodsInfoService = require("../services/GoodsService")
const {GoodsLockRedisModel, GoodsNumRedisModel} = require("../models/redis/GoodsInfo")
const e = require("express");
const FileService = require("../services/FileService/upload");
const utils = require("../common/utils/utils");


// 测试新增商品入库----- 参数合理性检测

let goodsInfoOne = {
    "goodsType": "CAR",
    "goodsName": "cookie"+ Date.now(),
    "goodsPrice": 1000,
    "goodsCount": 9999,
    "goodsImgs": [
        "http://localhost:8080/file/v2/api/down/af7437addb3e288c18ee66ad807ddea9",
        "http://localhost:8080/file/v2/api/down/9eabbf4940613653c0e720575ee526c4"
    ]
}

let goodsDetailOne = {
    extraData: null,
    contentHtml: '<p class="is-style-text-indent-2em ">火车还有六个小时才开，无聊就在候车厅呆呆，实在无聊了，就把自己的<a href="https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/" title="【查看含有[英语]标签的文章】" class="atags color-5" target="_blank">英语</a>词汇书拿出来看了起来，<a href="https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/" title="【查看含有[英语]标签的文章】" class="atags color-5" target="_blank">英语</a>老烂了，但为了解决无聊，就翻了几下。</p><p class="is-style-text-indent-2em">忽然旁边坐过来一年轻小哥哥，瘦瘦的。看我拿本<a href="https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/" title="【查看含有[英语]标签的文章】" class="atags color-5" target="_blank">英语</a>书在看，就问我，“大学生在昆明读书啊？”，我看了一下他，不像是坏人，而且看起来也不讨厌，就弱弱地回答，“不是，在郑州。”</p>'
}

function TestGoodsOne() {
    return new Promise(res => {
        try {
            let rs = GoodsInfoService.checkGoodsInfoAndGoodsDetailParam(goodsInfoOne, goodsDetailOne)
            assert.equal(rs.success, true, "检测新增商品参数出现错误"+ JSON.stringify(rs))
            GoodsInfoService.addGoods({goodsInfo: goodsInfoOne, goodsDetail: goodsDetailOne}).then(rs => {
                assert.equal(rs.success, true, "新增商品出现错误"+ JSON.stringify(rs))

                setTimeout(()=>{
                    GoodsInfoService.search({goodsName: goodsInfoOne.goodsName}).then(rs => {
                        assert.equal(rs.success, true, "检索商品列表出现错误"+ JSON.stringify(rs))
                        assert.equal(!!rs.data, true, "检索商品列表出现逻辑错误，刚加入的商品没有找到" + JSON.stringify(rs))
                        assert.equal(rs.data.count, 1, "检索商品列表出现逻辑错误，刚加入的商品没有找到" + JSON.stringify(rs))
                        let goodsInfo = rs.data.list[0]
                        GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs => {
                            assert.equal(rs.success, true, "获取新增商品的库存量，出现错误"+ JSON.stringify(rs))
                            assert.equal(rs.data === goodsInfo.goodsCount, true, "新增商品在没有消耗的情况，出现库存不一致")
                            goodsInfoOne.goodsCount = 100000
                            GoodsInfoService.updateGoods(goodsInfo._id.toString(), {
                                goodsInfo: goodsInfoOne,
                                goodsDetail: goodsDetailOne
                            }).then(rs => {
                                assert.equal(rs.success, true, "变更商品数量出现错误"+ JSON.stringify(rs))
                                GoodsLockRedisModel.status(goodsInfo._id.toString()).then(rs => {
                                    assert.equal(rs.success, true, "变更商品完成，检测商品锁出现错误"+ JSON.stringify(rs))
                                    assert.equal(!rs.data, true, "变更商品完成，锁应该被释放，但是商品锁还在存在")
                                    GoodsNumRedisModel.getCount(goodsInfo._id.toString()).then(rs => {
                                        assert.equal(rs.success, true, "获取变更商品之后的库存量，出现错误"+ JSON.stringify(rs))
                                        assert.equal(rs.data === goodsInfoOne.goodsCount, true, "变更商品之后在没有消耗的情况，出现库存不一致" + JSON.stringify({rs, goodsInfo}))
                                        assert.ok("购物车 测试1 完成")
                                        return res(utils.Success())
                                    })
                                })
                            })
                        })

                    })
                }, 1000)

            })
        } catch (e) {
            console.error(e)
            return res(utils.Error(e))
        }
    })
}


module.exports = {TestGoodsOne}

