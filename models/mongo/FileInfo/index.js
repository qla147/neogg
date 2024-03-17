
const  mongoose = require("../../../common/db/mongo")
const Schema = mongoose.Schema
const FileInfoSchema = new Schema({
    fileName :{
        type: String ,
        desc :"文件名称"
    },
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
    sliceCount:{
        type: Number,
        desc :"该文件的子文件切片的数量"
    },
    userId :{
        type : mongoose.Types.ObjectId,
        desc :"上传用户ID",
        ref: "userInfo"
    },
    updateTime : {
        type : Number ,
        desc :"更新时间"
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
    },
    createTime : {
        type : Number ,
        desc :"创建时间"
    }
},{
    collection: "file"
})


module.exports ={
    FileModel :mongoose.model("file", FileSchema),
    FileInfoModel : module.exports = mongoose.model("fileInfo", FileInfoSchema)
}
