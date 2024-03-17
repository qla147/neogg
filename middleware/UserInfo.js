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
    // const {token } = req.headers ;
    // const userId  = ""
    req.userInfo =  {
        _id: "123456",
        username: "oreo"
    }
    next(req, res)
}

module.exports = middleware