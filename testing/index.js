// // const ipUtils = require("../common/utils/ipUtils")
// //
// // console.log(ipUtils.getLocalIp())
// //
// // const Consul = require("../common/consul")
// // const consul = new Consul()
// //
// // consul.initConfig().then(rs=>{
// //     if(!rs.success){
// //         console.log(rs)
// //     }
// //     return consul.registerServer()
// //
// // }).then(rs =>{
// //     if (!rs.success){
// //         console.log(rs)
// //     }
// //     consul.initService().then(rs=>{
// //         console.log(rs)
// //     })
// //
// // })
//
// let maps = {
//     0:"0",
//     8:"8",
//     9:"9",
//     4:"4",
//     3:"3",
//     12:"12",
//     5:"5",
//     6:"6",
//     7:"7",
//     10:"10",
//     11:"11",
//     1:"1",
//     2:"2",
// }
//
//
// const keys = Object.keys(maps)
//  keys.sort((a, b )=>{
//     return a-b
// })
// console.log(keys)
// console.log(keys.reverse())
//
//
// while(keys.length > 0 ){
//     console.log(keys.pop())
// }


const cryptoUtils = require("../common/utils/cryptoUtils")

cryptoUtils.getFileMd5ByStream("D:\\BaiduNetdiskDownload\\最新GRE全套资料\\07.2017年08月 【作文魔鬼训练营】\\Day1\\2017.08写作魔鬼训练营二期day1(1).mov").then(rs=>{
    console.error(rs.data.length )
})

