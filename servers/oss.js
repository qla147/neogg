commonConfig = require("../config/oss.json")
const consul = require("../common/consul")
const utils = require("../common/utils/utils")
async function init(){
    try{

    }catch (e) {
        console.error(e)
        console.error("consul client init consul failed ")

    }
    consul.initConfig()

}