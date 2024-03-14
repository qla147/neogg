const express = require("express")
const utils = require("../../common/utils/utils")
const router = express.Router()

/**
 * 用户文件实体上传
 */
router.post("/file" ,(req , res) =>{
  console.log(req.files)
  return res.json(utils.Success())
})


router.post("/info" , (req , res)=>{
  const {fileName , fileMd5 , fileSize , fileFormat} = req.body
  const userInfo  = req.userInfo

  return res.json(utils.Success(userInfo  ))
})


module.exports =  router