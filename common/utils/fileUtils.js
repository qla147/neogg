const utils = require("./utils")
const ErrorCode = require("../const/ErrorCode")
const fs = require("fs")
const {file} = require("elasticsearch/src/lib/loggers");
const path = require("path")
const config = global._config
// 单个切片的大小


const fileUtils = {
    /**
     * 获取所有的文件目录下所有文件， 不支持多级目录
     * @param  filePath 文件夹目录地址
     */
    getAllFilesFormDir :(filePath)=>{
        return new Promise(resolve=>{
            let result = []
            //
            fs.stat(filePath , (err, stats)=>{
                if (err){
                    console.error(err)
                    return resolve(utils.Error(err))
                }
                if (stats.isDirectory()){
                    fs.readdir(filePath, (err, files)=>{

                        if (err){
                            console.error(err)
                            return resolve(utils.Error(err))
                        }
                        for (const x in files){
                            result.push(path.join(filePath, files[x]))
                        }
                        return resolve(utils.Success(result))
                    })
                }else {
                    return resolve(utils.Success(result))
                }
            })
        })

    },


    // 使用流下载文件
    downloadFile :(filePath , res) =>{
        return new Promise(resolve=>{
            let readStream = fs.createReadStream(filePath)
            readStream.pipe(res)

            readStream.on("error", (err)=>{
                if (err){
                    console.error(err)
                    res.status(500)
                    res.end()
                    return utils.Error(err)
                }
            })

            readStream.on("end",()=>{
                res.status(200)
                res.end()
                return utils.Success(null)
            })

        })
    },


    //合并文件
    /**
     * @desc  使用流的方式将多个文件合并到一个文件
     * @param filePathMap
     * @param destFilePath
     * @returns {Promise<unknown>}
     */
    mergeFiles: (filePathMap, destFilePath) =>{
        return new Promise(resolve =>{

            // 拿到所有的文件序号， 从0 开始
            let filePathNoOrder = Object.keys(filePathMap)

            filePathNoOrder.sort((a, b )=>{
                return a -b
            })
            // 先检测用户上传的文件是否完成完整
            for (const x in filePathNoOrder){
                // 文件序号是否 一一对应
                if (x !== filePathNoOrder[x]){
                    return resolve(utils.Error("FileOrderError:"+ x, ErrorCode.FILE_ORDER_ERROR))
                }
                // 文件切片地址是否都存在
                if(!filePathMap[x]){
                    return resolve(utils.Error("FileContentError:"+x, ErrorCode.FILE_NO_COMPLETE_ERROR))
                }
                // 检测该文件是否存在
                fs.access(filePathMap[x] , fs.constants.F_OK, (err)=>{
                    if (err){
                        return resolve(utils.Error(err))
                    }
                })
            }

            // 方便从小大取出序号 所以
            filePathNoOrder.reverse()
            function writeFile( writeStream , filePathNoOrder, cb  ){
                if (filePathNoOrder.length > 0 ){
                    let filePath = filePathMap[filePathNoOrder.pop()]

                    const readStream = fs.createReadStream(filePath, "binary")


                    readStream.pipe(writeStream,{end: false})


                    readStream.on("error", (err)=>{
                        console.error(err)
                        return cb(err)
                    })

                    readStream.on("end", ()=>{
                        fs.unlinkSync(filePath)
                        if (filePathNoOrder.length > 0 ){
                            writeFile(writeStream, filePathNoOrder , cb )
                        }else {
                            writeStream.end("complete!")
                            cb(null)
                        }

                    })

                }

            }
            // 开启目标文件写入流
            const writeStream = fs.createWriteStream(destFilePath, "binary")

            // 调用函数 合并文件
            writeFile(writeStream, filePathNoOrder,  (err)=>{
                if (err){
                    return resolve(utils.Error(err))
                }
                return resolve(utils.Success())
            })

        })

    },

    // 根据需要上传文件的大小，计算需要的文件切片数量， 每个文件500K
    computeSliceCount :(filesize)=>{
        let count  =Math.floor(filesize / config.sliceFileSize)
        if (filesize % (500 *1024) > 0) {
            count++
        }
        return count++
    },
    // 删除文件
    deleteFile: (filePath )=>{
        return new Promise(resolve =>{
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if(err){
                    return resolve(utils.Success(null ))
                }
                fs.unlink(filePath, (err)=>{
                    return resolve(utils.Success(null))
                })

            })
        })
    }







}

module.exports =  fileUtils