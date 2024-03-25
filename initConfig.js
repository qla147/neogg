
const consul = require("./common/consul")
const utils = require("./common/utils/utils")
const fs = require("fs");


const inits = {
    init: async function (){
        try{

            let configRs = await consul.initConfig()
            if (!configRs.success){
                return configRs
            }
            console.error("Loaded config successful")

            return utils.Success(null)
        }catch (e) {
            console.error(e)
            console.error("consul client init consul failed ")

        }
    },
    afterInit:async ()=>{
        try{
            //
            let registerRs = await consul.registerServer()
            if (!registerRs.success){
                return registerRs
            }
            const rs = await consul.initService()
            return rs
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }


    }


}

async function init(){
    try{
        await  inits.init()
        const config = global._config
        fs.access(config.filePath, fs.constants.F_OK, (err) => {
            if (err) {
                fs.mkdirSync(config.filePath, { recursive: true });
            }
        });
        console.log(global._config)

        return utils.Success(null)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}



module.exports = inits