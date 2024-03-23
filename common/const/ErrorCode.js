const Code =  {
    "GOODS_DETAIL_NOT_FOUND" :"100", // 商品详情没有找到
    "GOODS_INFO_NOT_FOUND" :"101", // 商品信息没有找到
    "GOODS_INFO_EXIST": "102",      // 商品已经存在
    "GOODS_OUT_OF_STOCK" :"103",    // 商品库存不足无法下定


    "LOCK_GOODS_INFO": "200", // 商品被锁住，请稍后再试


    "CART_INFO_NOT_FOUND":"300", // 购物车内指定商品没有找到


    "ORDER_INFO_NOT_FOUND": "400",// 订单信息没有找到
    "ORDER_STATUS_NOT_KNOWN": "401",// 订单状态未知
    "ORDER_STATUS_CANCELED" :"402", // 订单已经取消
    "ORDER_STATUS_REFUND" :"403", // 订单已经退货退款
    "ORDER_STATUS_PAYED" :"404" , // 订单已经支付，如需要取消请走退款通道
    "ORDER_STATUS_COMPLETED":"405", // 订单已经完成，请走退货退款流程
    "ORDER_STATUS_INVALIDATION":"406", // 订单已经失效


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
    "FILE_NO_COMPLETE_ERROR": "612", // 文件切分块内容为空
    "FILE_UPLOAD_TASK_NOT_FOUND": "613", //文件上传任务不存在
    "FILE_UPLOAD_TASK_COMPLETE": "614", //文件上传任务已经完成
    "FILE_SLICE_ERROR" : "615", //文件上传切片错误
    "FILE_GRIDFS_ERROR" :"616"


}


module.exports = Code