const  mongoose = require("../../../common/db/mongo")
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const Schema = mongoose.Schema

const UserInfo = new Schema({
    userName :{
        type: String ,
        required : true ,
        desc :"用户名称"
    },
    userAvatar :{
        type: String ,
        desc :"用户图像地址"
    },
    userStatus:{
        type: String,
        enum :[0,1],
        desc :{
            detail: "用户状态",
            0: "停止使用",
            1: "正常"
        }
    },
    userTelNo:{
        type : String ,
        desc :"用户电话号码",
        validate:(val)=>{
            return !phoneUtil.isValidNumber(val)
        }
    },
    userEmail:{
      type: String

    },
    userWallet:{
        type: Number,
        desc : "用户钱包"
    }






})


module.exports = {
    UserInfoMongoModel : mongoose.model("user_info", UserInfo , "user_info")


}