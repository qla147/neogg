const fs = require("fs")
const crypto = require("crypto")
const utils = require("./utils")
var CryptoJS = require('crypto-js')
const cryptoUtils = {}

let options = {
    mode: CryptoJS.mode.ECB,
    iv: CryptoJS.enc.Hex.parse("00000000000000000"),
    padding: CryptoJS.pad.Pkcs7
}


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
 * @description Aes加密
 * @param str {type: String} 待加密的字符串
 * @param key {type: String} 加密密码
 * @return {Promise<unknown>}
 * @constructor
 */
cryptoUtils.AesEncode = (str, key)=>{
    return new Promise(resolve => {
        try{
            let encryptedData = CryptoJS.AES.encrypt(str, key,options );
            let hexData = encryptedData.toString();
            return resolve(utils.Success(hexData))
        }catch (e) {
            console.error(e)
            return resolve(utils.Error(e))
        }

    })
}
/**
 * @description Aes解密
 * @param str {type: String} 待解密的字符串
 * @param key {type: String} 解密密码
 * @return {Promise<unknown>}
 * @constructor
 */
cryptoUtils.AesDecode = (str, key)=>{
    return new Promise(resolve => {
        try{
            let decryptedData  = CryptoJS.AES.decrypt(str, key, options);
            let text = decryptedData.toString(CryptoJS.enc.Utf8);
            return resolve(utils.Success(text))
        }catch (e) {
            console.error(e)
            return resolve(utils.Error(e))
        }
    })
}

module.exports = cryptoUtils
