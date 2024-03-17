const utils = require("./utils")
const ErrorCode = require("../const/ErrorCode")
const fs = require("fs")
const config = global._config
// 单个切片的大小


const fileUtils = {
    //合并文件
    mergeFiles(filePathMap, destFilePath) {
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
    }



}

module.exports =  fileUtils