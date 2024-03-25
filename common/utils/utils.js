const utils = {}
const config = global.commonConfig || {serverNo :"200"}
const ErrorCode = require("../const/ErrorCode")

/**
 * @author hhh
 * @date 20240312
 * @param data
 * @param msg
 * @returns {{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}}
 * @constructor
 */
utils.Success = function (data, msg = "ok" ) {
    return {data, msg , success: true  , code :  "000000" , timeStamp : Date.now() , error : null }
}
/**
 * @author hhh
 * @date :20240312
 * @param error  Error info
 * @param code  Error Code
 * @param msg  Error message
 * @returns {{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}}
 * @constructor
 */
utils.Error = function (error , code = ErrorCode.INTERNAL_ERROR , msg = "INTERNAL_ERROR"  ){
    return {data: null  , msg , code: config.serverNo+code , error  , success: false ,timeStamp : Date.now() }
}

/**
 * @author : hhh
 * @date : 20240312
 * @param str json string
 * @returns {{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}}
 * @description 用于把字符串转换成为json对象
 */
utils.StringToJson = function (str){
    try{
        if (typeof str != "string" || str.length <=1) {
            return utils.Error(null , ErrorCode.INTERNAL_ERROR ,"Failed to convert string into json object!" )
        }
        let  value = JSON.parse(str)
        return utils.Success(value)
    }catch (e) {
        return utils.Error(e , ErrorCode.INTERNAL_ERROR ,"Failed to convert string into json object!" )
    }
}


module.exports = utils