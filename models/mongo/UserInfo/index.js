const  mongoose = require("../../../common/db/mongo")
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
        desc :"用户状态"
    },





})


module.exports = {
    UserInfoMongoModel : mongoose.model("user_info", UserInfo , "user_info")


}