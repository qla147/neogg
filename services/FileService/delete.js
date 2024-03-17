const { FileInfoModel} = require("../../models/mongo/FileInfo")
const utils = require("../../common/utils/utils")
const fileUtils = require("../../common/utils/fileUtils")
const config = global._config
const fs = require("fs")
const service  = {}



/**
 * @description 删除数据库过期的上传消息
 * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */
const deleteExpiredDatabaseData = async ()=>{
    try{
        await FileInfoModel.deleteMany({fileStatus: 0 , updateTime : {$lte :  Date.now() - config.maxTempFilePersistTime}})
        return utils.Success(null)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}
/**
 * @description 删除过期的文件
 * @returns {Promise<unknown>}
 */
const deleteExpiredTempUploadFile = async ()=>{
    try{
        // 先获取所有的文件
        const filePathsRs = await fileUtils.getAllFilesFormDir(config.filePath)
        if (!filePathsRs.success){
            return filePathsRs
        }

        let filePaths = filePathsRs.data

        if(filePaths.length === 0 ){
            return  utils.Success(null)
        }

        let deleteFiles = []

        for(const x in filePaths){
            let stats = await fs.statSync(filePaths[x])
            // 过期的文件
            if (stats.mtimeMs + config.maxTempFilePersistTime <= Date.now()){
                deleteFiles.push(filePaths[x])
            }
        }

        let tasks = []
        // 删除文件
        for(const x in deleteFiles){
            tasks.push(fileUtils.deleteFile(deleteFiles[x]))
        }

        // 同步执行删除任务
        if (tasks.length > 0 ){
            await Promise.allSettled(tasks)
        }

        return utils.Success(null)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}


service.deleteExpiredData = async ()=>{
    try{
        // 删除过期的数据库文件上传数据
        let rs = await deleteExpiredDatabaseData()
        if (!rs.success){
            console.error(rs)
        }
        // 删除过期的文件
        rs = await deleteExpiredTempUploadFile()
        if(!rs.success){
            console.error(rs)
        }
    }catch (err) {
        console.error(err)
    }
}

module.exports = service;