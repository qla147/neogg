const  mongoose = require("mongoose");
const  Grid = require('gridfs-stream')
const config = global._config




const mongooseInstance = new mongoose.Mongoose()

var flag = false

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
    flag = true
    gridfs= Grid(mongooseInstance.connection.db , mongooseInstance.mongo)
})





module.exports =()=>{
   if(flag){
       return gridfs
   }
   let timer = setInterval(()=>{
       if (flag){
           clearInterval(timer)
           return gridfs
       }
   }, 500)
}


