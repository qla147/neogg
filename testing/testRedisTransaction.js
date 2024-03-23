const config = {
    "redis": {
        "host":"192.168.2.4",
        "port":"6379",
        "password":"123456"
    },
}

global._config = config


const redisClient = require("../common/db/redis")



async function test(){
    let value = []
    for(let x = 0 ; x < 4; x++){
        value.push(["rpop","test:list", 4])
    }

    let rs = await redisClient.multi(value).exec()
    return rs
}



test().then(rs=>{
    console.log(rs)
})

