const  fs = require('fs' );
const  mongoose = require("mongoose");
const  Grid = require('gridfs-stream')
const config = global._config
const utils = require("../utils/utils")
const ErrorCode = require ("../const/ErrorCode")




const mongooseInstance = new mongoose.Mongoose()
mongooseInstance.connect(config.gridfs.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const conn = mongooseInstance.connection
conn.on("error",(err)=>{
    console.error(err)
    console.error("gridfs got error")
})
var   gridfs;
conn.on("open", ()=>{
    console.error("gridfs is ready!")
    gridfs= Grid(mongooseInstance.connection.db , mongooseInstance.mongo)
})





module.exports = gridfs


