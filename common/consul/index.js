const Consul = require("consul")
const uuid = require("uuid")
const utils = require("../utils/utils")

class  ConsulClient {
    constructor() {
        this.client = new Consul({
            host: commonConfig.consul.host,
            port : commonConfig.consul.port
        })

        this.initConfig = this.initConfig.bind(this)
    }

    async initConfig(){
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
    }
}



module.exports = ConsulClient