const utils = require("../../common/utils/utils")
const fileUtils = require("../../common/utils/fileUtils")
const {FileInfoModel, FileModel} = require("../../models/mongo/FileInfo");


const service = {}


service.download =async (fileMd5 , res )=>{
    try{
        let fileInfo = await FileInfoModel.findOne({fileStatus: 1 , fileMd5 , }, {fileId:1, fileType:1})
        if (!fileInfo){
            res.status(404)
            return res.end()
        }

        let fileObject = await FileModel.findOne({_id : fileInfo.fileId} , {filePath:1})
        if (!fileObject){
            res.status(404)
            return res.end()
        }

        res.writeHead(200, {
            'Content-Type': fileInfo.fileType
        })


        await fileUtils.downloadFile(fileObject.filePath , res)

        if (!rs.success){

        }


    }catch (e) {
        console.error(e)
        res.status(500)
        return res.end()
    }
}