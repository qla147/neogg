const client = require("../../../common/db/es")
const utils = require("../../../common/utils/utils");


class GoodsInfoEs {
    constructor(){
        this.type = "goods"
        this.index = "goodsInfo"
        this.mappingSetting ={
            goods: {
                properties: {
                    goodsName: {
                        type: 'text',
                        fields: {
                            raw: {
                                type: "keyword"
                            }
                        } ,
                        analyzer :"standard"
                    },
                    goodsType: {
                        type: 'text' ,
                        fields: {
                            raw: {
                                type: "keyword"
                            }
                        },
                        analyzer :"standard"
                    },
                    goodsPrice: {
                        type: 'long'
                    },
                    _id: {
                        type: 'text',
                        index : false
                    },
                }
            }
        }

    }

    /**
     * @author  hhh
     * @date  2024年3月13日08:30:17
     * @description  init the db schema
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
    async init(){
        try{
            // 初始化
            await client.indices.create({
                index: this.index,
                body: {
                    mappings: this.mappingSetting
                }
            });
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }

    /**
     * @author hhh
     * @date 2024年3月13日08:29:18
     * @param goodsInfo  the data that need to save
     * @description  save data into db
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
    async insert(goodsInfo){
        try{
            let rs = await client.index({index: this.index , type: this.type , body: goodsInfo})
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }


    /**
     * @description 检索商品
     * @author hhh
     * @date 2024年3月13日08:27:47
     * @param query query param
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
    async search (query){
        try{
            let result =await  client.search({
                index: this.index,
                body:{
                    query,
                    type : "cross_fields",
                    fields:["goodsName", "goodsType", "goodsPrice"],
                    operator :"or",
                    _source:["_id"]
                }
            })

            return utils.Success(result)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }


    /**
     * @description  delete data from db
     * @author hhh
     * @date  2024年3月13日08:26:32
     * @param query search conditions
     * @returns {Promise<{msg: string, timeStamp: number, code: string, data, success: boolean, error: null}|{msg: string, timeStamp: number, code: string, data: null, success: boolean, error}>}
     */
    async delete(query){
        try{
            let rs = await client.delete({
                index: this.index ,
                query
            })
            return utils.Success(rs)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }
    }





}



const args = process.argv.slice(2);

main(args.join(' '))