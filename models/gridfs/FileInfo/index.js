
const  Grid = require('gridfs-stream')
const gridfs = require("../../../common/db/mongoGridfs")
const utils = require("../../../common/utils/utils")
const ErrorCode = require("../../../common/const/ErrorCode")
const fs = require("fs")
const Grid = require("gridfs-stream");
const mongoose = require("mongoose");
const models = {
    /**
     * @description insert one file into gridfs
     * @param filePath {type : string }  文件物理地址
     * @param fileName {type : string } 文件名称
     * @returns {Promise<unknown>}
     */
    insertOne : (filePath , fileName )=>{
        return new Promise(resolve => {
            let writeStream =  gridfs.createWriteStream({fileName})
            let rs  = fs.createReadStream(filePath).pipe(writeStream)
            writeStream.on("error", (err)=>{
                return resolve(utils.Error(err, ErrorCode.FILE_GRIDFS_ERROR))
            })
            writeStream.on("close",()=>{
                return resolve(utils.Success(rs))
            })
        })
    },
    getOneFileInfo :(searchParam)=>{
        return new Promise(resolve => {
            gridfs.findOne(searchParam , (err , file )=>{
                if (err){
                   return resolve(utils.Error(err, ErrorCode.FILE_GRIDFS_ERROR))
                }
                return resolve(utils.Success(file))
            })
        })
    },
    downloadOne:(searchParam, writeStream)=>{
        return new Promise(resolve => {
            gridfs.findOne(searchParam, (err,fileInfo)=>{
                if(err){
                    return resolve(utils.Error(err, ErrorCode.FILE_GRIDFS_ERROR))
                }
                let fileName = fileInfo.filename

                let readStream = gridfs.createReadStream({filename: fileName})
                readStream.pipe(writeStream)
                readStream.on("end",()=>{
                    return resolve(utils.Success(null ))
                })
            })
        })
    },
    deleteOne:(filename)=>{
        return new Promise(resolve => {
            gridfs.remove({filename},(err, rs)=>{
                if (err){
                    return resolve(utils.Error(e, ErrorCode.FILE_GRIDFS_ERROR))
                }
                return resolve(utils.Success(rs))
            })
        })
    },


}