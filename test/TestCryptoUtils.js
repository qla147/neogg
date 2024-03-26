const cryptoUtils = require("../common/utils/cryptoUtils")
const assert = require('assert')


let  passwd =  "sssddsss"

// console.log(key.toString())
const str = JSON.stringify( {
        "aaaa": "ndsfsdfsdeddffdyf",
        "sss": "fdfdfdfdf",
})



cryptoUtils.AesEncode(str, passwd).then(rs=>{
    assert.equal(rs.success , true , "aes加密功能异常")
    cryptoUtils.AesDecode(rs.data.toString(), passwd).then(rs=>{
        console.log(rs)
        assert.equal(rs.success , true , "aes解密功能异常")
        assert.equal(rs.data , str , "aes解密出现错误")
    })
})









