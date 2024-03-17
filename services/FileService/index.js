const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const {FileInfoModel, FileModel}  = require("../../models/mongo/FileInfo")
const fileRedisModel  = require("../../models/redis/FileInfo")
const fileUtils = require("../../common/utils/fileUtils")
const cryptoUtils = require("../../common/utils/cryptoUtils")
const {now} = require("mongoose");
const config = global._config
const service = {}


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

        let isComplete = false
        let sliceCounts =  []


        for (const x in  filePathMap){
            if (filePathMap[x]/   )

        }





    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }



}


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
        const fileInfo = await FileInfoModel.findOne({userId: userInfo._id, fileMd5},{fileStatus:1, sliceCount :1, fileSize :1, fileMd5:1})
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

        let redisRs = await fileRedisModel.fileUpload(fileMd5, sliceOrderNo, filePath)
        if (!redisRs.success){
            return redisRs
        }

        await FileInfoModel.findOneAndUpdate({_id: fileInfo._id} , {updateTime : Date.now()},{upsert: false })

        return utils.Success(null)
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
        const { fileSize , fileMd5 ,   fileType} = fileInfo ;

        // 检测参数
        if (!fileSize || parseInt( fileSize) <= 1 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR )
        }

        if (fileMd5.length === 0 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR)
        }

        // 判断文件上传任务是否已经在
        let existFileTask  = await FileInfoModel.findOne({fileMd5,userId })
        if (existFileTask){
            return utils.Success(existFileTask )
        }

        // 判断是否存在相同的文件
        let existFile = await FileModel.findOneAndUpdate({fileMd5},{isShare: true },{upsert: false })
        let fileInfo = {
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