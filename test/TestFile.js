

const FileService = require("../services/FileService/upload")

let userInfo = userInfo =  {
    _id: "660036a6c8f9e09dff0bf1f6",
    userName: "oreo"
}
// 文件信息
let fileInfo = [{
    size:"28586", // 文件大小
    filepath : "D:\\neogg\\test\\lotus-evora-400-14526-main (1).avif" ,
    newFilename : "91509a402a5c3843b44343700",
    mimetype : "image/avif" ,
    mtime : Date.now(),
    originalFilename :"lotus-evora-400-14526-main (1).avif"
}]

function TestFile(){
    FileService.up(userInfo ,fileInfo).then(rs=>{
        assert.equal(rs.success, true , "测试上传文件接口出现错误")
    })
}


module.exports = {TestFile}
