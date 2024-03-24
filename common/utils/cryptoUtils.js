const fs = require("fs")
const crypto = require("crypto")
const utils = require("./utils")
const {Debug} = require("ioredis/built/utils");
const config =  global._config
const cryptoUtils = {}

const passwordAlgorithm = "aes-256-cbc"




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


/**
 * @description 加密密码
 * @param password {type: String} 待加密的密码
 * @return {Promise<unknown>}
 * @constructor
 */
cryptoUtils.EncodePassword = (password)=>{
    return new Promise(resolve => {
        let iv = crypto.randomBytes(16)
        let cipher = crypto.createCipheriv(passwordAlgorithm, Buffer.from(config.passwordCode, "base64"), iv )

        const input = Buffer.from(password , "utf-8")
        const encryptedChunks = []
        encryptedChunks.push(cipher.update(input))
        encryptedChunks.push(cipher.final())
        const encryptedData = Buffer.concat(encryptedChunks);
        return utils.Success(encryptedData.toString("base64"))
    })
}


module.exports = cryptoUtils
