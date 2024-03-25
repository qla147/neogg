const middleware = {}

/**
 * @author
 * @date 2024年3月13日08:19:23
 * @param req Request
 * @param res Response
 * @param next
 * @desc  获取请求的用户信息中间件，以及权限都在这里
 */
middleware.checkUserFromRequest = (req , res , next ) =>{
    // 不做用户权限验证的url, 但是是用户访问也要获取用户信息
    // let excludes = ["/shop/v1/api/goods", "/file/v2/api/down"]

    // if(!excludes.includes(req.URL)){
    //
    // }
    req.userInfo =  {
        _id: "660036a6c8f9e09dff0bf1f6",
        userName: "oreo"
    }


    next()
}

module.exports = middleware