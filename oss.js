global.commonConfig = require("./config/oss.json")
const initConfig = require("./initConfig")
const utils = require("./common/utils/utils");
const express = require("express")
const fs = require("fs");


async function init(){
    try{
       await  initConfig.init()
       require("./common/db/redis");
       require("./common/db/mongo");
        const config = global._config
        fs.access(config.filePath, fs.constants.F_OK, (err) => {
            if (err) {
                fs.mkdirSync(config.filePath, { recursive: true });
            }
        });
        return utils.Success(null)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}

init().then(rs=>{
   if (!rs.success){
       console.error(rs.error)
       console.error("The server was stopped !")
       process.exit(1)
   }

    const app = express()
// 文件上传专用
    app.use("/v1/api/file/upload",  require("./routers/FileRouter/fileUpload"))
// 文件下载专用
//     app.use("/v1/api/file/download", require("./routers/FileRouter/fileDownload"))


    app.listen(8000)
    console.log("server listening at 8000")
    app.on("error",(err)=>{
        console.error(err)
    })

}).catch((err)=>{
    console.error(err)
    process.exit(1)
})





