const  mongoose = require("../../../common/db/mongo")
const Schema = mongoose.Schema


const  CartInfoSchema = new Schema({
    goodsId :{
        type : Schema.Types.ObjectId,
        desc : "商品ID",
        ref:"goodsInfo"
    },
    goodsName :{
        type:String ,
        desc :"商品名称"
    },
    goodsCount :{
        type : Number,
        min: 1 ,
        max: 9999,
        desc :"商品数量"
    },
    userId:{
      type : Schema.Types.ObjectId,
      desc : "用户ID",
      ref: "userInfo",
      required : true
    },
    createTime :{
        type: Number ,
        desc :"添加时间"
    }
},)


CartInfoSchema.index({ goodsId: 1 , userId : 1 })
CartInfoSchema.index({ userId : 1 , addTime : -1 })
CartInfoSchema.index({ userId : 1})

module.exports = {
    CartInfoModel: mongoose.model("cart_info", CartInfoSchema, "cart_info")
}