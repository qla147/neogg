const utils = require("../../common/utils/utils")
const ErrorCode = require("../../common/const/ErrorCode")
const {FileInfoModel, FileModel}  = require("../../models/mongo/FileInfo")
const FileRedisModel  = require("../../models/redis/FileInfo")
const config = global._config
const service = {}







service.fileInfoService  = async (userInfo , fileInfo) =>{
    try {
        const userId = userInfo.id
        const { fileSize , fileMd5 , fileType  } = fileInfo ;

        // 检测参数
        if (!fileSize || parseInt( fileSize) <= 1 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR )
        }

        if (fileMd5.length === 0 ){
            return utils.Error(null , ErrorCode.PARAM_ERROR)
        }

        // 判断文件上传任务是否已经在
        let existFileTask  = await FileInfoModel.countDocuments({fileMd5,userId })
        if (existFileTask > 0){
            return utils.Error(null , ErrorCode.FILE_EXIST_ERROR)
        }

        // 判断是否存在相同的文件
        let existFile = await FileModel.findOne({fileMd5})
        let fileInfo = {
                fileMd5 ,
                fileSize,
                fileType:fileInfo,
                userId ,
                autoDelete : 0 ,
                completeTime : Date.now(),
                createTime : Date.now(),
            }

        if (existFile) {
            if (!existFile.isShare) {
                await FileModel.findOneAndUpdate({_id: existFile._id},{isShare: true })
            }

            fileInfo.fileStatus = 1
            fileInfo.fileUrl = config.pref


        }




        if (existFileTask > 0 ){

        }








    }catch (e) {
        console.error(e);
        return utils.Error(e)
    }
}