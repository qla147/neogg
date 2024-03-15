const utils = require("../utils/utils")
const os = require('os');

const ipUtils = {}



// 根据网卡获取服务器的IP
ipUtils.getLocalIp = ()=>{
    const interfaces = os.networkInterfaces()
    for (const x in interfaces){
        for (const y of interfaces[x]){
            const {address, family , internal } = y
            if (!internal && family === "IPv4" ){
                return utils.Success(address)
                // return address
            }
        }
    }
    return  utils.Error("server`s ip not found !")
}

module.exports = ipUtils