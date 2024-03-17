const express = require("express")
const utils = require("../../common/utils/utils");
const ErrorCode = require("../../common/const/ErrorCode");
const fileService = require("../../services/FileService/download")
const router = express.Router()

/**
 * 文件下载专用
 */
router.get("/:fileMd5", async (req, res)=>{
    let {fileMd5} = req.params
    if (!fileMd5 || fileMd5.length !== 32){
        return res.json(utils.Error(null ,ErrorCode.PARAM_ERROR,"fileMd5" ))
    }
})


module.exports =  router