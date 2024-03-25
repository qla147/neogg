const express = require("express")
const utils = require("../../common/utils/utils")
const router = express.Router()
const uploadFileMiddleWare = require("../../middleware/FileUpload")
const fileService = require("../../services/FileService/upload")

/**
 * @description 文件上传
 */
router.post("/up" ,uploadFileMiddleWare,async (req , res) =>{
    // 参数检测和逻辑依赖 ，因此这里不作参数检测
    let rs = await fileService.up(req.userInfo , req.files)
    return  res.json(rs)
})

router.get("/down/:fileMd5", async (req , res) =>{
    const {fileMd5} = req.params
    fileService.down(fileMd5, res).then(rs=>{
        if(!rs.success){
            console.error(rs)
        }
    })
})


module.exports = router