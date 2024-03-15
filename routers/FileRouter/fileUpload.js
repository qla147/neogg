const express = require("express")
const utils = require("../../common/utils/utils")
const router = express.Router()
const uploadFileMiddleWare = require("../../middleware/FileUpload")

/**
 * 用户文件实体上传
 */
router.post("/file" ,uploadFileMiddleWare,(eq , res) =>{
    console.log(req)

    return res.json(utils.Success())
})


router.get("/info" , (req , res)=>{
    // const {fileName , fileMd5 , fileSize , fileFormat} = req.body
    // const userInfo  = req.userInfo

    return res.json(utils.Success(null  ))
})


module.exports =  router