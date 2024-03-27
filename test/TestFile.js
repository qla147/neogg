const path = require("path")
const FileService = require("../services/FileService/upload")
const assert = require("assert");
const utils = require("../common/utils/utils");

let userInfo = {
    _id: "660036a6c8f9e09dff0bf1f6",
    userName: "oreo"
}
// 文件信息
let fileInfo = [{
    size: "28586", // 文件大小
    filepath: path.join(__dirname, "2022-lotus-emira.webp"),
    newFilename: "91509a402a5c3843b44343700",
    mimetype: "image/avif",
    mtime: Date.now(),
    originalFilename: "lotus-evora-400-14526-main (1).avif"
}]

function TestFile() {
    return new Promise(res => {
        try {
            FileService.up(userInfo, fileInfo).then(rs => {
                assert.equal(rs.success, true, "测试上传文件接口出现错误")
                assert.ok("完成上传测试完成")
                return res(utils.Success())
            })
        } catch (e) {
            console.error(e)
            return res(utils.Error(e))
        }
    })
}


module.exports = {TestFile}
