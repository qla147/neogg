const  mongoose = require("../../../common/db/mongo")
const Schema = mongoose.Schema

const GoodsBasicInfo = new Schema({
    goodsType:{
        type: String ,
        desc :"商品类型"
    },
    goodsName:{
        type : String  ,
        desc : "商品名称"
    },
    saleTime :{
        type : Number ,
        desc : "开售时间, 格式timestamp",
    },
    goodsUsdPrice:{
        type: Number ,
        desc :"商品售价,以美分为单位",
        min: 0
    },
    goodsCount : {
        type: Number ,
        desc :"商品可售数量",
        min:0 ,
        max:9999
    },
    status:{
        type: Number ,
        desc :{
            detail : "商品状态",
            enums:{
                0 : "待上架",
                1 : "上架售卖中",
                2 : "下架",
                3 : "售罄"
            }
        },
        enum:[0,1,2,3]
    },
    SoldCount:{
        type: Number,
        desc:"以后售卖的数量",
        default: 0
    },
    createTime : {
        type : Number,
        desc :  "创建时间"
    },
}, {collection:"goodsInfo"})

GoodsBasicInfo.index({goodsName : 1 ,goodsType : 1 , saleTime : -1 })


const GoodsDetail = new Schema({
    goodsId :{
        type: mongoose.Types.ObjectId,
        desc : "商品ID",
        ref : "goodsInfo",
        index: true ,
        unique: true ,
        required: true
    },
    contentHtml:{
        type: String ,
        desc : "详情页面html文本"
    },
    extraData :{
        type: mongoose.Types.Map,
        desc :"渲染需要的参数"
    }
}, {collection: "goodsDetail"})

