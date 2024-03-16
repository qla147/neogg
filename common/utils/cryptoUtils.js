const fs = require("fs")
const crypto = require("crypto")
const utils = require("./utils")
const cryptoUtils = {}


/**
 * #desc 使用流来计算文件的md5值
 * @param filePath
 * @returns {Promise<unknown>}
 */
cryptoUtils.getFileMd5ByStream= (filePath)=>{
    return new Promise(res=>{
        const stream = fs.createReadStream(filePath);
        const hash = crypto.createHash("md5")
        stream.on("data", chunk => {
            hash.update(chunk, "utf-8")
        })
        stream.on("end",()=>{
            const md5 = hash.digest("hex")
            return res(utils.Success(md5))
        })

        stream.on("error", (err)=>{
            return res(utils.Error(err))
        })
    })
}


/**
 * #desc 计算字符串的md5值
 * @param str
 * @returns {string}
 */
cryptoUtils.getStringMd5ByStream= (str)=>{
    const hash = crypto.createHash("md5")
    hash.update(str, "utf-8")
    return hash.digest("hex")
}


module.exports = cryptoUtils
