const config = global._config
const utils = require("../utils/utils")
const ErrorCode = require ("../const/ErrorCode")
const mongoose = require("mongoose");



const conn = mongoose.createConnection(config.mongodb.url, {maxPoolSize : config.mongodb.maxPoolSize});


conn.on("error", function (err){
    console.error(err  )
})

conn.on('disconnected', () =>{
    console.error("Mongodb server lost connection")
});


conn.on("connected", function (){
    console.error( "Mongodb is ready !")
})


module.exports = mongoose