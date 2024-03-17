// // const ipUtils = require("../common/utils/ipUtils")
// //
// // console.log(ipUtils.getLocalIp())
// //
// // const Consul = require("../common/consul")
// // const consul = new Consul()
// //
// // consul.initConfig().then(rs=>{
// //     if(!rs.success){
// //         console.log(rs)
// //     }
// //     return consul.registerServer()
// //
// // }).then(rs =>{
// //     if (!rs.success){
// //         console.log(rs)
// //     }
// //     consul.initService().then(rs=>{
// //         console.log(rs)
// //     })
// //
// // })
//
// let maps = {
//     0:"0",
//     8:"8",
//     9:"9",
//     4:"4",
//     3:"3",
//     12:"12",
//     5:"5",
//     6:"6",
//     7:"7",
//     10:"10",
//     11:"11",
//     1:"1",
//     2:"2",
// }
//
//
// const keys = Object.keys(maps)
//  keys.sort((a, b )=>{
//     return a-b
// })
// console.log(keys)
// console.log(keys.reverse())
//
//
// while(keys.length > 0 ){
//     console.log(keys.pop())
// }


// const cryptoUtils = require("../common/utils/cryptoUtils")
//
// cryptoUtils.getFileMd5ByStream("D:\\BaiduNetdiskDownload\\Day1\\2017.08写作魔鬼训练营二期day1(1).mov").then(rs=>{
//     console.error(rs.data.length )
// })
//

// const fileUtils = require("../common/utils/fileUtils")
//
//
//
// fileUtils.getAllFilesFormDir("/data/upload").then(rs=>{
//     console.log(rs)
// })


global.commonConfig = require("./config/oss.json")
const initConfig = require("./initConfig")
const utils = require("./common/utils/utils");
const fs = require("fs")
// const express = require('express');
// const  path = require('path');
// const  logger = require('morgan');
// var debug = require('debug')('neogg:server');
// const {timer} = require("./services/TimerService/index")
const mongoose = require("mongoose");

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
        console.error(rs)
        return
    }
    const FileInfoModel = require("./models/mongo/FileInfo/index").FileInfoModel
    let fileInfos = []
    let index = 1
    while (index > 0 ){
        fileInfos.push({
            fileName : "测试文件"+ index,
            fileSize :100*1024*1024,
            fileMd5 : "66c7e97f1dbf5f425165da68df19f253",
            fileType :"image/gif",
            fileStatus :0,
            sliceCount:100,
            userId :mongoose.Types.ObjectId(),
            updateTime : Date.now(),
            createTime : Date.now()
        })
        index--
    }
    FileInfoModel.insertMany(fileInfos).then(rs=>{
        console.error(rs)
    }).catch(err=>{
        console.error(err)

    })





})


