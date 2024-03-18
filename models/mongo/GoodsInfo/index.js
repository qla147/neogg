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
    // saleTime :{
    //     type : Number ,
    //     desc : "开售时间, 格式timestamp",
    // },
    goodsPrice:{
        type: Number ,
        desc :"商品售价,放大100倍",
        min: 0
    },
    goodsCount : {
        type: Number ,
        desc :"商品原始可售数量",
        min:0 ,
        max:9999
    },
    goodsImgs :[{
        type : String,
        desc : "商品图片"
    }],
    status:{
        type: Number ,
        desc :{
            detail : "商品状态",
            enums:{

                1 : "有货",
                2 : "售罄"
            }
        },
        enum:[0,1,2,3]
    },
    SoldCount:{
        type: Number,
        desc:"售卖的数量",
        default: 0
    },
    createTime : {
        type : Number,
        desc :  "创建时间"
    },
}, {collection:"goods_info"})

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
    },
    createTime :{
        type: Number,
        desc :"创建时间"
    }
}, {collection: "goods_detail"})

module.exports =  {
    GoodsInfo : mongoose.model(  "goods_info", GoodsBasicInfo),
    GoodsDetail : mongoose.model( "goods_detail", GoodsDetail )
}