const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const {FileInfoModel, FileModel}  = require("../../models/mongo/FileInfo")
const {FileInfoGridFsModel,FileGridInfoModel, FileRecord} = require("../../models/gridfs/FileInfo")
const fileRedisModel  = require("../../models/redis/FileInfo")
const fileUtils = require("../../common/utils/fileUtils")
const cryptoUtils = require("../../common/utils/cryptoUtils")
const path = require("path")
const mongoose = require("mongoose");
const config = global._config
const service = {}


/**
 * @description 根据用户md5值下载文件
 * @param fileMd5
 * @param res
 * @return {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}|{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|*>}
 */
service.down = async (fileMd5, res)=>{
    try{
        let rs = await FileGridInfoModel.findOneAndUpdate({filename:fileMd5},{$inc:{"metadata.downCount": 1}, $set: {"metadata.lastDownTime": Date.now()}})
        if(!rs){
            res.status(404)
            return res.end()
        }
       await FileInfoGridFsModel.downOne(rs, res);

       return utils.Success()
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


/**
 * @description v2版本的文件上传使用mongodb的gridfs 作为存储方
 * @param userInfo {type: Object} 用户信息
 * @param fileInfos {type: Object} 文件信息
 * @return {Promise<*>}
 */
service.up = async(userInfo , fileInfos ) =>{
    try{

        let userId = userInfo._id ;

        let fileMapList  = []

        for(const x in fileInfos){
            console.table(fileInfos[x])
            let  {size, filepath, newFilename, mimetype , mtime ,originalFilename } = fileInfos[x]
            let rs = await cryptoUtils.getFileMd5ByStream(filepath)
            if(!rs.success){
                return rs
            }
            // 获取文件扩展名
            let extenName = path.extname(originalFilename)
            let id = new mongoose.Types.ObjectId()
            let mongoFileInfo = {
                contentType  : mimetype,
                id ,
                metadata:{
                    extenName,
                }
            }
            // 判断下文件是否存在 已经上传过了
            let fileGridInfo = await FileGridInfoModel.findOne({filename: rs.data})
            fileMapList.push( {fileId : id, url : config.downloadDomain +"/file/v2/api/down/"+rs.data })
            if(fileGridInfo){
                continue
            }

            // 使用流上传文件
            rs  = await FileInfoGridFsModel.insertOne(filepath, rs.data, mongoFileInfo )
            if(!rs.success){
                return rs
            }
        }
        // 用户操作记录入库
        // await FileRecord.insertMany(fileMapList)

        return utils.Success(fileMapList)

    }catch (e){
        console.error(e)
        return utils.Error(e)
    }finally {
        if(fileInfos){
            for(const x in fileInfos){
                let  {filepath } = fileInfos[x]
                fileUtils.deleteFile(filepath).then(rs=>{
                    if(!rs.success){
                        console.error("删除临时文件出现错误")
                    }

                })
            }
        }
    }
}


/**
 * @desc 检测文件是否上传没有, 上传成功合并文件，没有上传成功就查询 还有那些没有上传
 * @param userInfo
 * @param param
 * @returns {}
 */
service.fileCheckUploadComplete = async (userInfo , param ) => {
    try {
        const {fileMd5} = param
        if (!fileMd5 || fileMd5.length !== 32){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "filedMd5")
        }

        let fileInfo = await FileInfoModel.findOne({userId : userInfo._id, fileMd5})

        if (!fileInfo){
            return utils.Error(null , ErrorCode.FILE_UPLOAD_TASK_NOT_FOUND)
        }

        if (fileInfo.fileStatus === 1 ){
            return utils.Success([])
        }

        // 获取该上传任务所有的子切片
        let filePathMapRs =await  fileRedisModel.fileUploadAllInfo(fileMd5)
        if (!filePathMapRs.success){
            return filePathMapRs
        }

        let filePathMap = filePathMapRs.data


        let sliceCounts =  []
        // 拿到没有上传的子切片
        for (let index = 0 ; index <  fileInfo.sliceCount; index++){
            if (!filePathMap[index]){
                sliceCounts.push(index)
            }
        }

        if(sliceCounts.length === 0 ){
            // 文件上传完成 开始合并文件

            let destDownloadFilePath= path.join(config.downloadPath, fileMd5)
            // 合并
            let mergeRs = await fileUtils.mergeFiles(filePathMap,destDownloadFilePath )
            if (!mergeRs.success){
                return mergeRs
            }
            // 比对新旧md5
            const newMd5Rs = cryptoUtils.getFileMd5ByStream(destDownloadFilePath)

            if (!newMd5Rs.success || newMd5Rs.data !== fileMd5){
                await fileUtils.deleteFile(destDownloadFilePath)
                return newMd5Rs
            }



            // 入库
            const fileObject = new FileModel({
                fileMd5 ,
                filePath: destDownloadFilePath,
                isShare: false ,
                createTime : Date.now()
            })

            await fileObject.save()
            // 更新文件信息表
            await FileInfoModel.findOneAndUpdate({_id: fileInfo._id},{fileStatus : 1, updateTime : Date.now(), fileId: fileObject._id} , {upsert: false  })
            // 删除redis记录
            await fileRedisModel.fileDeleteUploadInfo(fileMd5)

            let deleteFileTasks = []
            // 删除文件切片子文件
            for(const x of filePathMap){
                deleteFileTasks.push(fileUtils.deleteFile(filePathMap[x]))
            }

            if (deleteFileTasks.length > 0 ){
               await  Promise.allSettled(deleteFileTasks)
            }

        }
        return utils.Success(sliceCounts)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }



}

/**
 * @desc 文件切片上传服务
 * @param userInfo 用户信息
 * @param upFileInfo 上传文件切片物理信息
 * @param params 上传文件的配置信息
 * @returns {Promise<*>}
 */
service.fileUploadService = async (userInfo , upFileInfo , params ) =>{
    try{
        // -----------------------------------------------------参数检测-------------------------------------------------
        let {fileMd5 , sliceOrderNo} = params
        upFileInfo = Object.values(upFileInfo)

        if(!upFileInfo  ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "file")
        }
        if(upFileInfo.length === 0  ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "file")
        }
        // 检测参数
        if (!sliceOrderNo || isNaN(sliceOrderNo) ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "sliceOrderNo")
        }

        if (typeof sliceOrderNo === "string"){
            sliceOrderNo = parseInt(sliceOrderNo)
        }

        if(sliceOrderNo < 0 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "sliceOrderNo")
        }

        if (!fileMd5 || fileMd5.length !== 32){
            return utils.Error(null , ErrorCode.PARAM_ERROR , "filedMd5")
        }


        ///====================================================检测文件上传任务是否OK=====================================**
        let fileInfo = await FileInfoModel.findOne({userId: userInfo._id, fileMd5},{fileStatus:1, sliceCount :1, fileSize :1, fileMd5:1})
        if (!fileInfo ||  fileInfo.fileStatus === 1 ){
            return utils.Error("", ErrorCode.FILE_UPLOAD_TASK_NOT_FOUND)
        }

        //检测上传子文件切片合理性
        upFileInfo = upFileInfo[0]
        const { size , filePath } = upFileInfo
        if (sliceOrderNo  !== (fileInfo.sliceCount - 1)) {
            if  (size !== config.sliceFileSize){
                return utils.Error(null , ErrorCode.FILE_SLICE_ERROR)
            }

        }else{
            if(size !== (fileInfo.fileSize % config.sliceFileSize)) {
                return utils.Error(null , ErrorCode.FILE_SLICE_ERROR)
            }

        }
        // redis 记录下来
        let redisRs = await fileRedisModel.fileUpload(fileMd5, sliceOrderNo, filePath)
        if (!redisRs.success){
            return redisRs
        }


        let mergeRs = await service.fileCheckUploadComplete(userInfo,fileInfo)

        if(!mergeRs.success){
            return mergeRs
        }

        fileInfo = await FileInfoModel.findOneAndUpdate({_id: fileInfo._id} , {updateTime : Date.now()},{upsert: false })

        return utils.Success(fileInfo)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }

}


/**
 * @desc 用于上传文件基本信息和上传文件准备
 * @param userInfo 用户信息
 * @param fileInfo 文件信息
 * @returns {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
service.fileInfoService  = async (userInfo , fileInfo) =>{
    try {
        const userId = userInfo.id
        const { fileSize , fileMd5 ,   fileType , fileName } = fileInfo ;



        // 判断文件上传任务是否已经在
        let existFileTask  = await FileInfoModel.findOne({fileMd5,userId })
        if (existFileTask){
            return utils.Success(existFileTask )
        }

        // 判断是否存在相同的文件
        let existFile = await FileModel.findOneAndUpdate({fileMd5},{isShare: true },{upsert: false })
        let fileInfo = {
                fileName,
                fileMd5 ,
                fileSize,
                fileType,
                userId ,
                // autoDelete : 0 ,
                updateTime : Date.now(),
                createTime : Date.now(),
            }
        // 如果该文件已经存在就写入数据库直接返回即可
        if (existFile) {
            fileInfo.fileStatus = 1
            fileInfo.fileUrl = config.downloadDomain +`/${fileMd5}`
            fileInfo.fileId = existFile._id

            let rs = await FileInfoModel.findOneAndUpdate({userId , fileMd5}, fileInfo , {upsert: true, new : true  })

            return utils.Success(rs)

        }

        // 如果是全新文件
        fileInfo.fileStatus = 0

        fileInfo = new FileInfoModel(fileInfo)


        // 计算切片数量
        fileInfo.sliceCount = fileUtils.computeSliceCount(fileSize)
        // 初始redis文件上传监控
        let rs = await fileRedisModel.fileUploadInit(fileMd5, fileInfo.sliceCount)
        if (!rs.success){
            return rs
        }
        await fileInfo.save()

        return utils.Success(fileInfo)


    }catch (e) {
        console.error(e);
        return utils.Error(e)
    }
}


module.exports = service