const  mongoose = require("../../../common/db/mongo")
const Schema = mongoose.Schema


const  CartInfo = new Schema({
    goodsId :{
        type : mongoose.Types.ObjectId,
        desc : "商品ID",
        ref:"goodsInfo"
    },
    count :{
        type : Number,
        min: 0 ,
        max: 9999,
        desc :"商品数量"
    },
    userId:{
      type : mongoose.Types.ObjectId,
      desc : "用户ID",
      ref: "userInfo",
      required : true
    },
    addTime :{
        type: Number ,
        desc :"添加时间"
    }
},{collection:"cartInfo"})


CartInfo.index({goodsId: 1 , userId : 1 })
CartInfo.index({ userId : 1 , addTime : -1 })