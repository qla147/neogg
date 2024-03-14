const redisClient = require("../../../common/db/redis")
const utils = require("../../../common/utils/utils")



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
     * @description: 用于检测文件是否上传完成
     */
    async fileUploadIsComplete(sliceKey){
        try{
            // 获取该文件所有的子块信息
            let fileUploadSignals = await  redisClient.lrange(sliceKey , 0, -1 )
            for (const  x of  fileUploadSignals) {
                if (!x) {
                    // 发现没有上传的块 返回 false
                    return utils.Success(false)
                }
            }
            return utils.Success(true)
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
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     * @description : 用于标记子块已经上传
     */
    async fileUpload(sliceKey, sliceNo){
        try{
            // 判断文件上传是否初始化
            let exist  = await redisClient.exists(sliceKey)
            if (!exist) {
                // 没有初始化返回错误
                return utils.Error("File Upload Info Not Found !")
            }

            exist = await redisClient.lindex(sliceKey , sliceNo )
            if (!exist){
                // 该文件已经标记为上传
                return utils.Success(null)
            }
            // 没有标记为上传，就标记上
            await redisClient.lset(sliceKey , sliceNo, true )

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
    async fileUploadInit(sliceKey ,sliceLength, expiredTimeSpan){
        try{
            let start = 0
            let sliceNos = []
            for (; start < sliceLength; start++){
                sliceNos.push(false)
            }
            // 初始化标记数组
            await redisClient.lpush(sliceKey , ...sliceNos)
            // 设置过期删除
            await redisClient.expire(sliceKey,expiredTimeSpan)
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


module.exports = FileUpLoad