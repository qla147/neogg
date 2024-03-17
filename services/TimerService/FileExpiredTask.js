const {TimerTask} = require("./index");

const fileDeleteService = require("../FileService/delete")
const service = {
    generatorTask :()=>{
        return new TimerTask("file_server:expired_resource_clean", "* */10 * * * *", null, fileDeleteService.deleteExpiredData)
    }
}

module.exports = service