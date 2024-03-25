const  mongoose = require("mongoose");

const config = global._config


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
let gridfs;
conn.on("open", ()=> {
    console.error("gridfs is ready!")
})





module.exports = mongooseInstance


