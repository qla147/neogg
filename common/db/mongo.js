const config = global._config
const mongoose = require("mongoose");


const mongooseInstance = new mongoose.Mongoose()
mongooseInstance.connect(config.mongodb.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const conn = mongooseInstance.connection
conn.on("error",(err)=>{
    console.error(err)
    console.error("mongodb got error")
})

conn.on("open", ()=>{
    console.error("mongodb is ready!")
})



module.exports = mongooseInstance