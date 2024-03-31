global.commonConfig = require("./config/shop.json")
const utils = require("./common/utils/utils");
const serverUtils = require("./common/utils/serverUtils");


async function init(){
    try{
        await serverUtils.getParam()
        const initConfig = require("./initConfig")
        await  initConfig.init()
        require("./common/db/redis");
        require("./common/db/mongo");
        require("./common/db/es")
        return utils.Success(null)
    }catch (e) {
        console.error(e)
        return utils.Error(e)
    }
}

init().then(rs=>{
    if(!rs.success){
        console.error(rs.error)
        console.error("The test process was stopped !")
        process.exit(1)
    }
    // const {TestFile} = require("./test/TestFile")
    // const {TestGoodsOne} = require("./test/TestGoods")
    // const {TestCartTwo, TestCartOne} = require("./test/TestCart")
    // const {TestOrderOne, TestOrderTwo , TestOrderThree} = require("./test/TestOrder")
    const {GoodsGenerator, GeneralizeTest} = require("./test/TestFromNewRequired")
    async function test(){
        try{
            // let rs = await TestFile()
            // await TestGoodsOne()
            // await TestCartOne()
            // await TestCartTwo()
            // await TestOrderOne()
            // await TestOrderTwo()
            // await TestOrderThree()
            // 心需求测试
            let rs = await  GeneralizeTest()
            console.log(rs)

            console.log("测试通过")
        }catch (e) {
            console.error(e)
            console.log("测试上传文件出现错误")
        }
    }

    test()

})
