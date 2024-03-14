
const Consul = require("./common/consul")
const utils = require("./common/utils/utils")


const inits = {
    init: async function (){
        try{
            let consul = new Consul()
            let configRs = await consul.initConfig()
            if (!configRs.success){
                return configRs
            }
            console.error("Loaded config successful")
            console.table(JSON.stringify(configRs.data))

            return utils.Success(null)
        }catch (e) {
            console.error(e)
            console.error("consul client init consul failed ")

        }
    }
}




module.exports = inits