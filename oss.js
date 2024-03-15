global.commonConfig = require("./config/oss.json")
const initConfig = require("./initConfig")
const utils = require("./common/utils/utils");
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var debug = require('debug')('neogg:server');
var http = require('http');
const fs = require("fs")

// var server

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
        // console.log(global._config)

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

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use("/consul/health", require("./routers/Consul"))

// // 文件上传专用
    app.use("/v1/api/file/upload",  require("./routers/FileRouter/fileUpload"))
// // 文件下载专用
// //     app.use("/v1/api/file/download", require("./routers/FileRouter/fileDownload"))
    app.set('port', global._config.port);
    const server = http.createServer(app);

    server.listen(global._config.port,global._config.host);
    server.on('error', (err)=>{
        console.error(err)
    });

    server.on("clientError",()=>{
        console.error("clientError")
    })
    server.on('listening', ()=>{
        initConfig.afterInit().then(rs=>{
            if (!rs.success){
                console.error(rs.error , rs.msg)
                process.exit(1)
            }
        }).catch(err=>{
            console.error(err)
            process.exit(1)
        })
    });
    server.on("close", ()=>{
        console.error("close")
    })
    server.on("checkExpectation",()=>{
        console.error("checkExpectation")
    })


}).catch((err)=>{
    console.error(err)
    // process.exit(1)
})

process.on('exit',function(code){
    // TODO 这里可以主动释放其他资源 如zookeeper连接等
    if (code === 1000) {
        console.error('process:uncaughtException');
    }else if (code === 1001) {
        console.error('process:SIGINT');
    } else if (code === 1002) {
        console.error('process:SIGTERM');
    } else {
        console.error('process:unknown', code);
    }
});
process.on('uncaughtException',function(e){
    console.log(e);
    // 异常可以选择不退出
    process.exit(1000);
});
process.on('SIGINT',function () {
    process.exit(1001);
});

process.on('SIGTERM',function () {
    process.exit(1002);
});

process.on("err",(err)=>{
    console.error(err)
})



