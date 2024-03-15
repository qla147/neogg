const Consul = require("consul")
const uuid = require("uuid")
const utils = require("../utils/utils")
const ipUtils = require("../utils/ipUtils")
class  ConsulClient {
    constructor() {
        this.client = new Consul({
            host: commonConfig.consul.host,
            port : commonConfig.consul.port
        })

        this.initConfig = this.initConfig.bind(this)
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

            const config = configRs.data
            global._config = config
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
                    name : commonConfig.serverName + ":" + uuid.v4().replace(/-/g,""),
                    tags : [commonConfig.serverName, commonConfig.serverNo , global._config.environment],
                    check :{
                        http: "http://",
                        interval: "3s",
                        timeout: "9s",
                        ttl :"60s",
                        notes :commonConfig.serverName + ":" +commonConfig.serverNo
                    },


                }
            )
            return utils.Success()
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }

    }




}



module.exports = ConsulClient