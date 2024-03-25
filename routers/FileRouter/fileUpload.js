const express = require("express")
const utils = require("../../common/utils/utils")
const router = express.Router()
const uploadFileMiddleWare = require("../../middleware/FileUpload")
const fileService = require("../../services/FileService/upload")
const ErrorCode = require("../../common/const/ErrorCode")


/**
 * 用户文件实体上传
 */
router.post("/file" ,uploadFileMiddleWare,async (req , res) =>{
    // 参数检测和逻辑依赖 ，因此这里不作参数检测
    let rs = await fileService.fileUploadService(req.userInfo , req.files, req.fields)
    return  res.json(rs)

})



/**
 * 用户上传文件的基本信息
 */
router.post("/info" , async (req , res)=>{
    let {fileSize , fileMd5 , fileType , fileName } = req.body
    // ----------------------------------------------------参数检测------------------------------------------------------
    if (!fileSize || isNaN(fileSize)){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "fileSize"))
    }
    if (typeof fileSize == "string"){
        fileSize = parseInt(fileSize, 10 )
    }

    if(fileSize <= 0 ){
        return res.json(utils.Error(null , ErrorCode.PARAM_ERROR , "fileSize"))
    }


    if (!fileMd5 || fileMd5.length !== 32 ){
        return res.json(utils.Error(null ,ErrorCode.PARAM_ERROR,"fileMd5" ))
    }

    if(!fileType){
        return res.json(utils.Error(null ,ErrorCode.PARAM_ERROR,"fileType" ))
    }

    if (!fileName || fileName.length  === 0 ){
        return res.json(utils.Error(null ,ErrorCode.PARAM_ERROR,"fileName" ))
    }

    const fileInfo = {fileSize , fileType , fileMd5}

    const userInfo  = req.userInfo

    //------------------------------------------------------进入服务层----------------------------------------------------

    let rs = await fileService.fileInfoService(userInfo,fileInfo )
    return res.json(utils.Success(null  ))
})


module.exports =  router