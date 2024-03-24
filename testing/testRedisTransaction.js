const config = {
    "redis": {
        "host":"192.168.2.4",
        "port":"6379",
        "password":"123456"
    },
    "mongodb":{
        "url":"mongodb://oreo:89287503@192.168.2.4:27017,192.168.2.4:27018,192.168.2.4:27019/shop?readPreference=primary&tls=false&replicaSet=rs&authSource=admin",
        "maxPoolSize": 20
    },
}

global._config = config

//
// const redisClient = require("../common/db/redis")
//
//
//
// async function test(){
//     let value = []
//     for(let x = 0 ; x < 4; x++){
//         value.push(["rpop","test:list", 4])
//     }
//
//     let rs = await redisClient.multi(value).exec()
//     return rs
// }
//
//
//
// test().then(rs=>{
//     console.log(rs)
// })
//



require("../common/db/mongo")

const {UserInfoMongoModel} = require("../models/mongo/UserInfo")

function test(){
    let userInfo = new UserInfoMongoModel({
        userName :  "oreo",
        userAvatar: "https://c-ssl.duitang.com/uploads/blog/202103/07/20210307183449_0cb6e.jpg",
        userStatus: 1,
        userTelNo: "18162575788",
        userEmail:"用户邮箱",
        userWallet: 1000000000000,
        createTime: Date.now(),
        userLoginName:"oreo",
        userPassword:"123456"
    })

    userInfo.save().then(rs=>{
        console.log(rs)
    }).catch(err=>{
        console.error(err)
    })

}

test()

