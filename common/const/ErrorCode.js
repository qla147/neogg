const Code =  {
    "INTERNAL_ERROR": "500", // 内部错误
    "MONGODB_ERROR": "501" ,    //mongodb 错误
    "REDIS_ERROR":" 502",   // redis 错误
    "OUTER_SERVER_ERROR": "503", // 外部服务错误
    "ES_ERROR": "504", // elasticsearch 错误
    "FILE_NO_FOUND_ERROR" : "505", //文件没有找到错误
    "AUTH_ERROR":"506" , // 用户认证错误
    "PARAM_ERROR":"507" , // 参数错误


    "FILE_EXIST_ERROR":"610" ,// 文件已经存在
    "FILE_ORDER_ERROR": "611", // 文件切分块的数量不正确
    "FILE_NO_COMPLETE_ERROR": "612" // 文件切分块内容为空


}


module.exports = Code