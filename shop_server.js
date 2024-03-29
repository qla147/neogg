global.commonConfig = require("./config/shop.json")
const utils = require("./common/utils/utils");
const express = require('express');
const  logger = require('morgan');
const  serverUtils = require("./common/utils/serverUtils")
//
const {createServer} = require("http");
// const mongoose = require("mongoose");

// var server
/**
 * @description 初始化服务器各项配置
 * @return {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
 */







async function init(){
    try{
        await serverUtils.getParam()
        const initConfig = require("./initConfig")
        await  initConfig.init()
        require("./common/db/redis");
        require("./common/db/mongo");
        require("./common/db/es")
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
    const {timer} = require("./services/TimerService")
    // 设置定时器

    timer.setTask(require("./services/TimerService/OrderHandlerTask").generatorTask())

    timer.start()

    const app = express()

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    // app.use("/consul/health", require("./routers/Consul"))
    // app.use(require("./middleware/IpCheck"))
    // 用户权限 信息中间件
    const userCheckMiddleware = require("./middleware/UserInfo").checkUserFromRequest
    app.use((req, res,next)=>{
        console.error(req.url)
        next()
    })
    // 商品相关
    app.use("/shop/v1/api/goods",userCheckMiddleware,require("./routers/GoodsRouter/goods"))
    // 订单和支付相关
    app.use("/shop/v1/api/orderAndPay" ,userCheckMiddleware, require("./routers/OrderRouter"))
    // 购物车相关
    app.use("/shop/v1/api/cart",userCheckMiddleware, require("./routers/CartRouter"))


    // // 文件下载专用
    // app.use("/v1/api/file/download", require("./routers/FileRouter/fileDownload"))
    app.set('port', global._config.port);
    const server = createServer(app);


    app.on("error",(err)=>{
        console.error(err)
    })

    server.listen(global._config.port);
    server.on('error', (err)=>{
        console.error(err)
    });
        // server.on("clientError",()=>{
        //     console.error("clientError")
        // })
        server.on('listening', ()=>{
            console.log("server listen at ", global._config.port,global._config.host)
            // registered to consul
            // initConfig.afterInit().then(rs=>{
            //     if (!rs.success){
            //         console.error(rs.error , rs.msg)
            //         process.exit(1)
            //     }
            // }).catch(err=>{
            //     console.error(err)
            //     process.exit(1)
            // })
        });
    server.on("error", (err)=>{
        console.error(err)
    })
    // server.on("close", ()=>{
    //     console.error("close")
    // })
    // server.on("checkExpectation",()=>{
    //     console.error("checkExpectation")
    // })


}).catch((err)=>{
    console.error(err)
    // process.exit(1)
})

process.on('exit',function(code){
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



