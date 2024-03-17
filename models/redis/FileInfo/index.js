const redisClient = require("../../../common/db/redis")
const utils = require("../../../common/utils/utils")
const ErrorCode = require("../../../common/const/ErrorCode")
const config  = global._config

/**
 * @author: hhh
 * @date : 20240313
 * @description : 用于上传文件的redis监控
 */
class FileUpLoad {
    constructor(  ) {

    }


    /**
     * @author : hhh
     * @date: 20240313
     * @param sliceKey 文件md5
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     * @description: 获取文件所有的子切片的信息
     */
    async fileUploadAllInfo(sliceKey){
        try{
            // 获取该文件所有的子块信息
            let fileUploadSignals = await  redisClient.hgetall(sliceKey)
            return utils.Success(fileUploadSignals)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }

    /**
     * @author : hhh
     * @date : 20240313
     * @param sliceKey 文件md5
     * @param sliceNo 子块编号
     * @param filePath 子块存放的临时地址
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     * @description : 用于标记子块已经上传
     */
    async fileUpload(sliceKey, sliceNo, filePath ){
        try{
            // 判断文件上传是否初始化
            let exist  = await redisClient.exists(sliceKey)
            if (!exist) {
                // 没有初始化返回错误
                return utils.Error("File Upload Info Not Found !")
            }

            await redisClient.hset(sliceKey , sliceNo,filePath )

            await redisClient.expire(sliceKey,config.maxTempFilePersistTime )

            return utils.Success(null)

        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }


    /**
     * @author : hhh
     * @date : 20240313
     * @param sliceLength 子块数量
     * @param sliceKey 文件md5
     * @param expiredTimeSpan 过期时长 单位秒
     * @description 用于初始化redis存储的标记用户已经上传文件的标识数组
     */
    async fileUploadInit(sliceKey ,sliceLength){
        try{
            let start = 0
            let sliceNos = {}
            for (; start < sliceLength; start++){
                sliceNos[start] = ""
            }
            //
            await redisClient.hmset(sliceKey, sliceNos)
            // 设置过期删除
            await redisClient.expire(sliceKey,config.maxTempFilePersistTime)
            return utils.Success(null)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }

    /**
     * @author: hhh
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     * @param sliceKey 文件md5
     */
    async fileDeleteUploadInfo(sliceKey){
        try{
            await redisClient.del(sliceKey)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }

}

const fileUpload = new FileUpLoad()


module.exports = fileUpload