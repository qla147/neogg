const  mongoose = require("../../../common/db/mongo")
const Schema = mongoose.Schema

const OrderGoodsInfo = new Schema({
    goodsId : {
        type : Schema.Types.ObjectId,
        ref :"goodsInfo",
        desc :"商品信息ID"
    },
    goodsName :{
        type : String ,
        desc :"商品名称"
    },
    goodsCount :{
        type : Number ,
        desc :"商品数量",
        min: 0
    },
    goodsImgs :{
        type : Schema.Types.Array,
        desc:"商品的图片"
    },
    goodsPrice :{
        type : Number ,
        desc :"商品单价",
        min: 0
    }
})

const OrderInfo = new Schema({
    userId :{
        type : Schema.Types.ObjectId,
        desc : "用户ID",
        ref: "userInfo",
        required : true
    },
    createTime :{
        type : Number ,
        desc :"生成日期"
    },
    expiredDate:{
        type : Number ,
        desc : "过期时间",
    },
    orderStatus :{
        type: Number  ,
        enum:[0,1,2,3,4,5],
        default : 0 ,
        desc :{
            detail : "订单状态",
            enums :{
                0: "待支付",
                1: "取消",
                2: "失效",
                3: "支付成功",
                4: "退货退款",
                5:"完成"
            }
        }
    },
    totalPrices:{
        type : Number ,
        desc :"订单金额",
        min: 0
    },
    totalCount:{
        type: Schema.Types.Number,
        desc: "订单商品数量"
    },
    orderGoodsInfo : {
        type: [OrderGoodsInfo],
        desc :"订单包含商品列表"
    },
    payTime :{
      type : Number ,
      desc :"支付时间"
    },
    payMethod :{
        type : Number ,
        enum:[1,2,3,4],
        desc : {
            detail:"支付方式",
            enums:{
                1: "digital wallet",
                2: "credit card",
                3: "bitcoin",
                4: "wechat",
            }
        }
    }
})

OrderInfo.index({userId :1 ,createTime : -1 })
OrderInfo.index({userId :1 ,status : 1 ,createTime : -1 })


module.exports =  {
    OrderInfoMongoModel : mongoose.model("order_info", OrderInfo, "order_info" ),
    OrderInfoBackUpMongoModel :  mongoose.model("order_info_back", OrderInfo, "order_info_back")
}