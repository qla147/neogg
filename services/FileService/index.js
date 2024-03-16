const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const {FileInfoModel, FileModel}  = require("../../models/mongo/FileInfo")
const fileRedisModel  = require("../../models/redis/FileInfo")
const fileUtils = require("../../common/utils/fileUtils")
const cryptoUtils = require("../../common/utils/cryptoUtils")
const config = global._config
const service = {}

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
                completeTime : Date.now(),
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
        let rs = await fileRedisModel.fileUploadInit(fileMd5, fileInfo.sliceCount, 30 * 60 * 1000)
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