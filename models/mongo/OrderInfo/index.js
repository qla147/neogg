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
    count :{
        type : Number ,
        desc :"商品数量",
        min: 0
    },
    price :{
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
    status :{
        type: Number  ,
        enum:[0,1,2,3],
        default : 0 ,
        desc :{
            detail : "订单状态",
            enums :{
                0: "待支付",
                3: "支付成功",
                2: "过期",
                1: "取消"
            }
        }
    },
    totalPrices:{
        type : Number ,
        desc :"订单金额",
        min: 0
    },
    goodsInfos : {
        type: [OrderGoodsInfo],
        desc :"订单包含商品列表"
    },
    payTime :{
      type : Number ,
      desc :"支付时间"
    },
    payMethod :{
        type : String ,
        desc :"支付方式"
    }
},{collection: "orderInfo"})

OrderInfo.index({userId :1 ,createTime : -1 })
OrderInfo.index({userId :1 ,status : 1 ,createTime : -1 })