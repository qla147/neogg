const  readline  = require ("readline");
const  cryptoUtils  =  require ("./cryptoUtils");
const  utils  =  require ("./utils");

let infos = {
    noticeOne: "if you want to start the server , first of all you must enter the password ! \nif you didn`t have any password ， please mail to the developer !",
    noticeTwo :"please enter the password :",
    noticeThree: "invalid input !\nplease try again!"
}

/**
 * @description 用户解密服务器配置
 * @return {Promise<unknown>}
 */
function getParam(){
    return new Promise(resolve => {
        console.error(infos.noticeOne)
        console.error(infos.noticeTwo)
        let rd = readline.createInterface({
            input: process.stdin
        })

        rd.on("line",(chunk)=>{
            if(chunk.trim().length === 0  ){
                console.log(infos.noticeThree)
                console.log(infos.noticeTwo)
                return ;
            }
            cryptoUtils.AesDecode(global.commonConfig.consul, chunk.trim()).then(rs =>{
                if(!rs.success){
                    console.log(infos.noticeThree)
                    console.log(infos.noticeTwo)
                    return
                }
                if(rs.data.length === 0 ){
                    console.log(infos.noticeThree)
                    console.log(infos.noticeTwo)
                    return
                }

                let confRs = utils.StringToJson(rs.data)

                if(!confRs.success){
                    console.log(infos[type].noticeThree)
                    console.log(infos[type].noticeTwo)
                    return
                }
                global.commonConfig.consul = confRs.data
                console.log("ok ! the server is starting !\nenjoy it !")
                rd.close()
                return resolve(utils.Success())
            })
        })

    })
}


module.exports = {getParam}