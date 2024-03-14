
const  mongoose = require("../../../common/db/mongo")
const Schema = mongoose.Schema
const FileInfoSchema = new Schema({
    fileSize :{
        required : true ,
        type : Number ,
        desc :"文件大小"
    },
    fileMd5 :{
        required : true ,
        type : String ,
        desc : "文件md5值"
    },
    fileType :{
      type : String,
      // enum :["video","audio","doc" , "pdf", "xls","xlsx","img"],
      desc :"文件类型"
    },
    fileUrl : {
      type : String ,
      desc :"文件下载url"
    },
    fileStatus :{
      type: Number ,
      desc :{
          0: "待上传",
          1: "上传完成",
          2: "正在上传中"
      },
      enum: [1, 2, 0],
      default : 0
    },
    isShared: {
        default : false ,
        type : Boolean ,
        desc :"共享文件"
    },
    userId :{
        type : mongoose.Types.ObjectId,
        desc :"上传用户ID",
        ref: "userInfo"
    },
    autoDelete: {
        type: Number ,
        desc : "上传没有完成-自动删除时间"
    },
    completeTime : {
        type : Number ,
        desc :"完成上传的时间"
    },
    createTime : {
        type : Number ,
        desc :"创建时间"
    },
    fileId:{
        type : mongoose.Types.ObjectId,
        ref :"file",
        desc :"文件物理存储表"
    }

},{
    collection :"fileInfo"
})


const FileSchema = new Schema({
    fileMd5 : {
        type : String ,
        desc :"文件md5",
        required: true
    },
    filePath :{
        type: String ,
        desc:"文件物理存储地址",
        required: true
    },
    isShare :{
        type : Boolean ,
        default : false ,
        desc :"是否为共享文件"
    }
},{
    collection: "file"
})


module.exports ={
    FileModel :mongoose.model("file", FileSchema),
    FileInfoModel : module.exports = mongoose.model("fileInfo", FileInfoSchema)
}
