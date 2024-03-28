const Consul = require("consul")
const utils = require("../utils/utils")
const ipUtils = require("../utils/ipUtils")
const path = require("path");
let  config ;

class  ConsulClient {
    constructor() {
        this.client = new Consul({
            host: global.commonConfig.consul.host,
            port : global.commonConfig.consul.port
        })
        // 初始化配置
        this.initConfig = this.initConfig.bind(this)
        this.registerServer = this.registerServer.bind(this)
    }
    // 初始化配置 放入堆
    async initConfig(){
        try{
            const configInfo = await this.client.kv.get(commonConfig.serverName )
            if (!configInfo){
                return utils.Error("Failed to request the consul KV ;")
            }
            const configString = configInfo.Value
            const configRs = utils.StringToJson(configString)
            if (!configRs.success){
                console.error(`Error: ${configRs.error} `)
                return utils.Error(`Failed to convert config string into json object; string : ${configString}`, )
            }

            config = configRs.data
            // 特殊化的配置处理
            if (!config.host){
                const ipRs = ipUtils.getLocalIp()
                if (!ipRs.success){
                    return ipRs
                }
                config.host = ipRs.data
            }

            if (!config.port){
                config.port = 8080
            }
            // 单个切片的长度
            if(!config.sliceFileSize){
                config.sliceFileSize = 1024 *1024
            }
            // 上传临时文件保存时间
            if (!config.maxTempFilePersistTime){
                config.maxTempFilePersistTime = 12 *60 *60 *1000
            }

            global._config = config
            global._config.filePath = path.join(process.cwd(), config.filePath)
            return utils.Success(config)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }


    async registerServer  (){
        try{
            await this.client.agent.service.register(
                {
                    name : commonConfig.serverName + "" +config.host+"_"+ process.pid,
                    tags : [commonConfig.serverName, commonConfig.serverNo , global._config.environment],
                    address : config.host,
                    port : config.port,
                    check :{
                        http: `http://${config.host}:${config.port}/consul/health`,
                        interval: "3s",
                        timeout: "10s",
                        ttl :"60s",
                        notes :commonConfig.serverName + ":" +commonConfig.serverNo,
                        deregistercriticalserviceafter: "1200s" // 2分钟没有上线直接干掉
                    },
                }
            )

            console.log(`http://${config.host}:${config.port}/consul/health`)
            return utils.Success()
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }


    async initService (){
        try{
            const serviceList =await this.client.agent.service.list()
            for (const x in serviceList){
                console.error(serviceList[x])
                const {Tags, Port , Address, Weights } =serviceList[x]
            }
            return utils.Success(null )
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }

}
const consul = new ConsulClient()


module.exports = consul