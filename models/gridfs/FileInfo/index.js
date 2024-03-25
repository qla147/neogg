
const mongooseInstance  = require("../../../common/db/mongoGridfs")
const utils = require("../../../common/utils/utils")
const ErrorCode = require("../../../common/const/ErrorCode")
const fs = require("fs")
const mongoose = require("mongoose")
const {file} = require("elasticsearch/src/lib/loggers");

let  gridfsBucket
mongooseInstance.connection.on("connected", ()=>{
    console.log("gridfs connected !")
    gridfsBucket  = new mongoose.mongo.GridFSBucket(mongooseInstance.connection.db,{
        bucketName: "shop_attachment",
        chunkSizeBytes: 1024 * 1024
    })
})

const Schema = mongoose.Schema

const FilesInfo = new Schema({
    length : {
        type : Number ,
        desc :"文件长度"
    },
    chunkSize :{
        type: Number ,
        desc :"文件chunkSize"
    },
    filename:{
        type:String ,
        desc :"文件md5"
    },
    uploadDate :{
        type: Date
    },
    contentType :{
        type : String,
        desc:"文件类型"
    },
    metadata:{
        extenName: {
            type: String,
            desc :"文件扩展名"
        },
        lastDownTime:{
            type: Number,
            desc :"上次下载时间"
        },
        downCount :{
            type: Number ,
            default : 0 ,
            desc:"下载计数"
        }
    }
})

// const FileRecord = new Schema({
//     fileId:{
//         type : Schema.Types.ObjectId,
//         desc :"gridfsId"
//     },
//     userId :{
//         type : Schema.Types.ObjectId,
//         desc:"用户ID"
//     },
//     fileName :{
//         type: String ,
//         desc :"上传文件名称"
//     },
//     md5:{
//         type: String ,
//         desc:"文件MD5"
//     },
//     fileSize:{
//         type: Number,
//         desc:"文件大小"
//     },
//     createTime :{
//         type:Number,
//         desc :"创建时间"
//     },
//     downCount:{
//         type : Number,
//         desc :"下载访问计数"
//     },
//     lastDownTime:{
//         type: Number,
//         desc:"上次下载时间"
//     }
// })


const FileInfoGridFsModel = {
    /**
     * @description insert one file into gridfs
     * @param filePath {type : string }  文件物理地址
     * @param filename {type : string } 文件名称
     * @returns {Promise<unknown>}
     */
    insertOne : (filePath , fileName , options  )=>{
        return new Promise(resolve => {
            let readStream  = fs.createReadStream(filePath)
            let writeStream = gridfsBucket.openUploadStream(fileName ,options  )
                // .createReadStream({filename : fileName, _id , content_type, root :"file_info"})
            readStream.pipe(writeStream)

            writeStream.on('close', function (file) {
               return resolve(utils.Success(file))
            });

            writeStream.on("error",(err)=>{
                console.error(err)
                return utils.Error(err)
            })

            readStream.on("error",(err)=>{
                console.error(err)
                return utils.Error(err)
            })

        })
    },
    findOne:async (search)=>{
       try{
           let rs = await gridfsBucket.find(search,{limit:1})
           return utils.Success(rs)
       }catch (e) {
           console.error(e)
           return utils.Error(e)
       }
    },
    /**
     * @description; 下载文件
     * @param fileInfo
     * @param res
     * @return {Promise<unknown>}
     */
    downOne :(fileInfo, res) =>{
        return new Promise(resolve => {
            res.setHeader("Content-Type",fileInfo.contentType)
            res.setHeader('Content-Disposition',`attachment;filename=${fileInfo.filename + fileInfo.metadata.extenName}`)
            let readStream = gridfsBucket.openDownloadStreamByName(fileInfo.filename)
            readStream.pipe(res)
            readStream.on("error", (err)=>{
                if (err){
                    console.error(err)
                    res.status(500)
                    res.end()
                    return utils.Error(err)
                }
            })

            readStream.on("end",()=>{
                res.status(200)
                res.end()
                return utils.Success(null)
            })

        })
    }


}

module.exports = {FileInfoGridFsModel,
    // FileRecord:mongooseInstance.model("file_record",FileRecord, "file_record" ),
    FileGridInfoModel: mongooseInstance.model("shop_attachment.files",FilesInfo, "shop_attachment.files" )}