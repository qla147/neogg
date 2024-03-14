const config = global._config
const utils = require("../utils/utils")
const ErrorCode = require ("../const/ErrorCode")
const mongoose = require("mongoose");



const conn = mongoose.createConnection(config.mongodb.url, {maxPoolSize : config.mongodb.maxPoolSize});


conn.on("error", function (err){
    console.error(utils.Error(err , ErrorCode.MONGODB_ERROR , "Got some errors form  mongodb!"), )
})

conn.on('disconnected', () =>{
    console.error(utils.Error(null , ErrorCode.MONGODB_ERROR, "Mongodb server lost connection"))
});


conn.on("connected", function (){
    console.error(utils.Success(null , "Mongodb is ready !"))
})


module.exports = mongoose