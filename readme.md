[toc]



# 商品项目文档



## 服务划分和介绍

### 服务器划分

#### shop_server

**用于实现商品，购买和支付等功能**

使用组件： 

+ redis : 

  1. 用户token的存储 ，目前没有实现权限中心故没有使用到
  2. 商品，订单，支付等分布式锁功能
  3. 商品信息的缓存
  3. 商品防超售list

+ mongodb

  商品信息， 订单， 购物车，用户信息等存储主库

+ es

  用于商品的信息的全文检索，这里支持了少量字段的全文检索，后期可以添加

#### file_server

**用于实现商品详情的图片，视频等资源的存储**

使用组件：

+ mongodb:
  1. 作为文件的主存储器，使用mongodb的gridfs功能实现
+ redis
  1. 用户token的存储 ，目前没有实现权限中心故没有使用到



### 开发设计历史

1. 第一阶段设计服务器时，准备把支付拆成一个独立的服务器，后来想想这个只是个作业，不需要那么复杂，因此没有拆分出去， 如果后期需要扩展各种类型的支付或者各种货币的支付等等，还是可以拆出去的

2. 在开发文件存储服务器的时候，刚开始是使用分割文件上传，文件存储本地；后来发现了弊端： 1.这样设计使得文件服务器不能横向扩展；2. 存储本地也不好管理； 因此采用了数据库存储， 刚开始查资料看了几种方案， 候选是hadoop、mongodb 方案, 因此这个服务开发指定了mongodb数据库，因此这里就直接mongodb的gridfs存储

   

### 关于开发设计原则

**simple is the best**

### 关于前端

我已经很久没有写过前端了，如果要捡起来大概需要15天附近

### 关于其他 

**面谈**



## MongoDB字段

**所有的mongodb的索引字段均未建立，索引需要根据实际的情况是建立索引，因为索引也是一种资源消耗**

### CartInfo 

购物车mongodb 数据库

~~~json
const  CartInfoSchema = new Schema({
    goodsId :{
        type : Schema.Types.ObjectId,
        desc : "商品ID",
        ref:"goodsInfo"
    },
    goodsName :{
        type:String ,
        desc :"商品名称"
    },
    goodsCount :{
        type : Number,
        min: 1 ,
        max: 9999,
        desc :"商品数量"
    },
    userId:{
      type : Schema.Types.ObjectId,
      desc : "用户ID",
      ref: "userInfo",
      required : true
    },
    createTime :{
        type: Number ,
        desc :"添加时间"
    }
})
~~~



### GoodsBasicInfo

商品基本信息collection

~~~js
const GoodsBasicInfo = new Schema({
    goodsType:{
        type: String ,
        desc :"商品类型"
    },
    goodsName:{
        type : String  ,
        desc : "商品名称"
    },
    // saleTime :{
    //     type : Number ,
    //     desc : "开售时间, 格式timestamp",
    // },
    goodsPrice:{
        type: Number ,
        desc :"商品售价,放大100倍",
        min: 0
    },
    goodsCount : {
        type: Number ,
        desc :"商品原始可售数量",
        min:0 ,
        max:9999
    },
    goodsImgs :[{
        type : String,
        desc : "商品图片"
    }],
    goodsStatus:{
        type: Number ,
        desc :{
            detail : "商品状态",
            enums:{

                1 : "有货",
                2 : "售罄"
            }
        },
        enum:[1,2]
    },
    soldCount:{
        type: Number,
        desc:"售卖的数量",
        default: 0
    },
    createTime : {
        type : Number,
        desc :  "创建时间"
    },
}, {collection:"goods_info"})
~~~



### GoodsDetail

商品详情collection

~~~js

const GoodsDetail = new Schema({
    goodsId :{
        type: Schema.Types.ObjectId,
        desc : "商品ID",
        ref : "goodsInfo",
        index: true ,
        unique: true ,
        required: true
    },
    contentHtml:{
        type: String ,
        desc : "详情页面html文本"
    },
    extraData :{
        type: Schema.Types.Map,
        desc :"渲染需要的参数"
    },
    createTime :{
        type: Number,
        desc :"创建时间"
    }
}, {collection: "goods_detail"})

~~~



###  OrderInfoMongoModel & OrderInfoBackUpMongoModel

订单表collection、和删除订单的备份collection

~~~js

const OrderInfo = new Schema({
    userId :{
        type : Schema.Types.ObjectId,
        desc : "用户ID",
        ref: "user_info",
        required : true
    },
    createTime :{
        type : Number ,
        desc :"生成日期"
    },
    expiredDate:{
        type : Number ,
        desc : "过期时间",
    },
    orderStatus :{
        type: Number  ,
        enum:[0,1,2,3,4,5],
        default : 0 ,
        desc :{
            detail : "订单状态",
            enums :{
                0: "待支付",
                1: "取消",
                2: "失效",
                3: "支付成功",
                4: "退货退款",
                5: "完成"
            }
        }
    },
    totalPrice:{
        type : Number ,
        desc :"订单金额",
        min: 0
    },
    totalCount:{
        type: Schema.Types.Number,
        desc: "订单商品数量"
    },
    orderGoodsInfo : {
        type: [OrderGoodsInfo],
        desc :"订单包含商品列表"
    },
    payTime :{
      type : Number ,
      desc :"支付时间"
    },
    payMethod :{
        type : Number ,
        enum:[1,2,3,4],
        desc : {
            detail:"支付方式",
            enums:{
                1: "digital wallet",
                2: "credit card",
                3: "bitcoin",
                4: "wechat",
            }
        }
    }
})
~~~



### UserInfo

用户信息表

~~~js

const UserInfo = new Schema({
    userName: {
        type: String,
        required: true,
        desc: "用户名称"
    },
    userAvatar: {
        type: String,
        desc: "用户图像地址"
    },
    userStatus: {
        type: String,
        enum: [0, 1],
        desc: {
            detail: "用户状态",
            0: "停止使用",
            1: "正常"
        }
    },
    userTelNo: {
        type: String,
        desc: "用户电话号码",
        // validate: (val) => {
        //     return !phoneUtil.isValidNumber(val)
        // }
    },
    userEmail: {
        type: String,
        desc: "用户邮箱"
    },
    userWallet: {
        type: Number,
        default: 0,
        desc: "用户钱包"
    },
    createTime: {
        type: Number,
        desc: "创建时间"
    },
    userLoginName: {
        type: String,
        required: true,
        unique: true,
        desc: "用户登录名"
    },
    userPassword: {
        type: String,
        desc: "用户登录密码"
    }
})


~~~





## API 部分

### 错误码部分

~~~js
const Code =  {
    "GOODS_DETAIL_NOT_FOUND" :"100", // 商品详情没有找到
    "GOODS_INFO_NOT_FOUND" :"101", // 商品信息没有找到
    "GOODS_INFO_EXIST": "102",      // 商品已经存在
    "GOODS_OUT_OF_STOCK" :"103",    // 商品库存不足无法下定


    "LOCK_GOODS_INFO": "200", // 商品被锁住，请稍后再试


    "CART_INFO_NOT_FOUND":"300", // 购物车内指定商品没有找到


    "ORDER_INFO_NOT_FOUND": "400",// 订单信息没有找到
    "ORDER_STATUS_NOT_KNOWN": "401",// 订单状态未知
    "ORDER_STATUS_CANCELED" :"402", // 订单已经取消
    "ORDER_STATUS_REFUND" :"403", // 订单已经退货退款
    "ORDER_STATUS_PAYED" :"404" , // 订单已经被支付
    "ORDER_STATUS_COMPLETED":"405", // 订单已经完成，请走退货退款流程
    "ORDER_STATUS_INVALIDATION":"406", // 订单已经失效
    "ORDER_PAY_METHOD_ONLY_SUPPORT_DIGITAL_WALLET" :"407" ,// 目前仅仅支持用户钱包支付
    "ORDER_PAY_LOCKED" : "408", // 订单被锁定，请稍后再试
    "ORDER_PAY_USER_WALLET_LOCKED" : "409", // 用户钱包被锁定，请稍后再试
    "ORDER_PAY_USER_WALLET_BALANCE_INSUFFICIENT" : "410", // 用户钱包余额不足


    "INTERNAL_ERROR": "500", // 内部错误
    "MONGODB_ERROR": "501" ,    //mongodb 错误
    "REDIS_ERROR":"502",   // redis 错误
    "OUTER_SERVER_ERROR": "503", // 外部服务错误
    "ES_ERROR": "504", // elasticsearch 错误
    "FILE_NO_FOUND_ERROR" : "505", //文件没有找到错误
    "AUTH_ERROR":"506" , // 用户认证错误
    "PARAM_ERROR":"507" , // 参数错误


    "FILE_EXIST_ERROR":"610" ,// 文件已经存在
    "FILE_ORDER_ERROR": "611", // 文件切分块的数量不正确
    "FILE_NO_COMPLETE_ERROR": "612", // 文件切分块内容为空
    "FILE_UPLOAD_TASK_NOT_FOUND": "613", //文件上传任务不存在
    "FILE_UPLOAD_TASK_COMPLETE": "614", //文件上传任务已经完成
    "FILE_SLICE_ERROR" : "615", //文件上传切片错误
    "FILE_GRIDFS_ERROR" :"616" //文件上传 mongo gridFs 错误


}

~~~



### 文件上传和下载

**server:  file_server**

#### 文件上传接口

+ desc

  使用form表单提交， 支持多文件上传

+ router

  /file/v2/api/up

+ method

  POST

+ request param sample

  ~~~shell
  curl --location 'http://192.168.2.2:8080/file/v2/api/up' \
  --form 'spss23=@"/D:/BaiduNetdiskDownload/07_R语言/数据分析与SPSS(完整)共12周/SPSS01/spss01b.mp4"'
  ~~~

  

+ request param table

  **form表单提交，支持多文件， 多文件上传直接往**

  | name | in   | type | desc       |
  | ---- | ---- | ---- | ---------- |
  | ***  | form | file | 待上传文件 |

  

+ response sample

  ~~~json
  {
      "data": [
          {
              "fileId": "66014b5095678b7500795175",
              "url": "http://192.168.2.4:8080/file/v2/api/down/fa7086b521142714d27d9c713aab206f"
          }
      ],
      "msg": "ok",
      "success": true,
      "code": "000000",
      "timeStamp": 1711360851985,
      "error": null
  }
  
  ~~~

  



### 商品相关接口

**server:  shop_server**

#### 新增商品

+ server

  ```
  shop_server
  ```

+ router

  /shop/v1/api/goods

+ method 

  POST

+ request param sample

  ~~~json
  curl --location 'http://192.168.2.2:8090/shop/v1/api/goods' \
  --header 'Content-Type: application/json' \
  --data '{
      "goodsInfo": {
          "goodsType": "CAR",
          "goodsName": "PROSCHE",
          "goodsPrice": 111900000,
          "goodsCount": 10,
          "goodsImgs": [
              "https://img2.baidu.com/it/u=1275372190,3235868667&fm=253&fmt=auto&app=120&f=JPEG?w=889&h=500"
          ]
      },
      "goodsDetail": {
          "extraData": "",
          "contentHtml": "<p class=\"is-style-text-indent-2em \">火车还有六个小时才开，无聊就在候车厅呆呆，实在无聊了，就把自己的<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>词汇书拿出来看了起来，<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>老烂了，但为了解决无聊，就翻了几下。</p><p class=\"is-style-text-indent-2em\">忽然旁边坐过来一年轻小哥哥，瘦瘦的。看我拿本<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>书在看，就问我，“大学生在昆明读书啊？”，我看了一下他，不像是坏人，而且看起来也不讨厌，就弱弱地回答，“不是，在郑州。”</p>"
      }
  }'
  ~~~

  

+ request param table 

  | name        | in   | type          | parent      | required | validator                                                    | desc             |
  | ----------- | ---- | ------------- | ----------- | -------- | ------------------------------------------------------------ | ---------------- |
  | goodsInfo   | body | Object        | null        | true     | null                                                         | 商品基本信息     |
  | goodsType   |      | String        | goodsInfo   | true     | Enums:["CAR","COMPUTER","FASHION","HEALTH CARE","FOOD","SPORT","ELECTRIC", "BOOK","ENTERTAIN","GAME","EDU","PET", "INSURANCE","OTHER" ] | 商品种类         |
  | goodsName   |      | String        | goodsInfo   | true     | Length :[1, 200]                                             | 商品名称         |
  | goodsPrice  |      | Number        | goodsInfo   | true     | More than zero                                               | 商品价格         |
  | goodsCount  |      | Number        | goodsInfo   | true     | More than zero and less than 9999                            | 商品数量         |
  | goodsImgs   |      | Array<String> | goodsInfo   | true     | The array`s length must be more than zero                    | 商品图片         |
  | goodsDetail | body | Object        |             | true     | null                                                         | 商品详情         |
  | extraData   |      | String        | goodsDetail | false    | null                                                         | 商品详情补充信息 |
  | contentHtml |      | String        | goodsDetail | true     | More thant zero                                              | 商品介绍HTML     |
  |             |      |               |             |          |                                                              |                  |

  

+ response sample 

  ~~~JSON
  {
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1710948924166,
      "error": null
  }
  
  ~~~

  

#### 修改商品

+ server

  ```
  shop_server
  ```

+ router

  /shop/v1/api/goods/:goodsId

+ method 

  PUT

+ request param sample 

  ~~~shell
  curl --location --request PUT 'http://192.168.2.2:8090/shop/v1/api/goods/66003b20e7010efe0868effa' \
  --header 'Content-Type: application/json' \
  --data '{
      "goodsInfo": {
          "goodsType": "CAR",
          "goodsName": "PROSCHE",
          "goodsPrice": 112000000,
          "goodsCount": 50,
          "goodsImgs": [
              "https://img2.baidu.com/it/u=1275372190,3235868667&fm=253&fmt=auto&app=120&f=JPEG?w=889&h=500"
          ]
      },
      "goodsDetail": {
          "contentHtml": "<p class=\"is-style-text-indent-2em \">火车还有六个小时才开，无聊就在候车厅呆呆，实在无聊了，就把自己的<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>词汇书拿出来看了起来，<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>老烂了，但为了解决无聊，就翻了几下。</p><p class=\"is-style-text-indent-2em\">忽然旁边坐过来一年轻小哥哥，瘦瘦的。看我拿本<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>书在看，就问我，“大学生在昆明读书啊？”，我看了一下他，不像是坏人，而且看起来也不讨厌，就弱弱地回答，“不是，在郑州。”</p>",
          "extraData": "{\"title\":\"desc\"}"
      }
  }'
  ~~~

  

+ request param table 

  | NAME        | IN   | TYPE          | PARENT | ENUMS       | REQUIRED | DEFAULT | DESC             |
  | ----------- | ---- | ------------- | ------ | ----------- | -------- | ------- | ---------------- |
  | goodsInfo   | body | Object        |        |             | true     |         | 商品信息         |
  | goodsType   |      | String        |        | goodsInfo   | true     |         | 商品类型         |
  | goodsName   |      | String        |        | goodsInfo   | true     |         | 商品名称         |
  | goodsPrice  |      | Number        |        | goodsInfo   | true     |         | 商品价格         |
  | goodsCount  |      | Number        |        | goodsInfo   | true     |         | 商品初始库存量   |
  | goodsImgs   |      | Array<String> |        | goodsInfo   | true     |         | 商品小图         |
  | goodsDetail |      | Object        |        |             | true     |         | 商品详情         |
  | contentHtml |      | String        |        | goodsDetail | true     |         | 商品详情介绍     |
  | extraData   |      | String        |        | goodsDetail | true     |         | 商品详情额外数据 |

+ response sample

  ~~~json
  {
      "data": null,
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711293850388,
      "error": null
  }
  ~~~

  

#### 商品列表(包含检索)

+ server

  ```
  shop_server
  ```

+ desc

  支持商品名称和类型等模糊查询，后期需要模糊查询的字段也可以添加

+ router

  /shop/v1/api/goods

+ method

  GET

+ request param table 

  | NAME          | IN    | TYPE   | ENUMS                                                        | REQUIRED | DEFAULT    | DESC                                             |
  | ------------- | ----- | ------ | ------------------------------------------------------------ | -------- | ---------- | ------------------------------------------------ |
  | orderBy       | query | String | ["goodsPrice","goodsName", "goodsType", "createTime"]        | false    | createTime | 排序字段                                         |
  | orderSeries   | query | String | ["desc", "asc"]                                              | false    | desc       | 排序方式                                         |
  | quickSearch   | query | String |                                                              | false    | null       | 快捷模糊查询；检索字段："goodsName", "goodsType" |
  | goodsType     | query | Number | [  "CAR",   "COMPUTER","FASHION", "HEALTH CARE","FOOD" ,  "SPORT","ELECTRIC",  "BOOK","ENTERTAIN" , "GAME","EDU", "PET",  "INSURANCE", "OTHER" ] | false    | null       | 商品分类                                         |
  | maxGoodsPrice | query | Number | {gt: 0}                                                      | false    | null       | 商品价格范围                                     |
  | minGoodsPrice | query | Number | {gt: 0}                                                      | false    | null       | 商品价格范围                                     |
  | goodsStatus   | query | Number | [1, 2]                                                       | false    | null       | 商品状态                                         |
  | pageSize      | query | Number | {gt: 0}                                                      | false    | 10         | 分页参数                                         |
  | pageNo        | query | Number | {gte: 0}                                                     | false    | 0          | 分页参数                                         |

  

+ request param sample

  ~~~shell
  curl --location 'http://192.168.2.2:8090/shop/v1/api/goods?pageNo=0&pageSize=10&goodsStatus=1&goodsType=CAR&minGoodsPrice=10000000&maxGoodsPrice=99999999&orderSeries=desc&orderBy=goodsPrice'
  
  ~~~

  

+ response param  sample

  ~~~json
  {
      "data": {
          "list": [
              {
                  "_id": "66003b20e7010efe0868effa",
                  "goodsType": "CAR",
                  "goodsName": "PROSCHE",
                  "goodsPrice": 111900000,
                  "goodsCount": 10,
                  "goodsImgs": [
                      "https://img2.baidu.com/it/u=1275372190,3235868667&fm=253&fmt=auto&app=120&f=JPEG?w=889&h=500"
                  ],
                  "goodsStatus": 1,
                  "soldCount": 0,
                  "createTime": 1711291168084,
                  "__v": 0
              },
              {
                  "_id": "66003ad8e7010efe0868eff5",
                  "goodsType": "CAR",
                  "goodsName": "HONDA",
                  "goodsPrice": 1200000,
                  "goodsCount": 900,
                  "goodsImgs": [
                      "https://n.sinaimg.cn/sinakd20108/600/w1920h1080/20200608/297c-iurnkps0366424.jpg"
                  ],
                  "goodsStatus": 1,
                  "soldCount": 0,
                  "createTime": 1711291096586,
                  "__v": 0
              },
              {
                  "_id": "66003a69e7010efe0868eff0",
                  "goodsType": "CAR",
                  "goodsName": "TOYOTA",
                  "goodsPrice": 1000000,
                  "goodsCount": 1000,
                  "goodsImgs": [
                      "https://p9-pc-sign.douyinpic.com/tos-cn-i-0813c001/d3a7899bfa5d41dd94e6bbb18f41a1d8~tplv-dy-aweme-images:q75.webp?biz_tag=aweme_images&from=3213915784&s=PackSourceEnum_AWEME_DETAIL&sc=image&se=false&x-expires=1713535200&x-signature=GTZVlxou69h8AWY%2FfLil6WDqlDA%3D"
                  ],
                  "goodsStatus": 1,
                  "soldCount": 0,
                  "createTime": 1711290985990,
                  "__v": 0
              }
          ],
          "count": 3
      },
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711291573801,
      "error": null
  }
  ~~~

  

#### 根据商品ID获取商品信息

+ server

  ```
  shop_server
  ```

+ desc 

  rt

+ router

  /shop/v1/api/goods/:goodsId

+ method

  GET

+ request param table 

  | NAME    | IN   | TYPE   | ENUMS | REQUIRED | DEFAULT | DESC   |
  | ------- | ---- | ------ | ----- | -------- | ------- | ------ |
  | goodsId | Path | String |       | true     |         | 商品ID |

+ request param sample

  ~~~shel
  curl --location 'http://192.168.2.2:8090/shop/v1/api/goods/66003b20e7010efe0868effa'
  ~~~

  

+ response param sample 

  ~~~json
  {
      "data": {
          "_id": "66003b20e7010efe0868effa",
          "goodsType": "CAR",
          "goodsName": "PROSCHE",
          "goodsPrice": 111900000,
          "goodsCount": 10,
          "goodsImgs": [
              "https://img2.baidu.com/it/u=1275372190,3235868667&fm=253&fmt=auto&app=120&f=JPEG?w=889&h=500"
          ],
          "goodsStatus": 1,
          "soldCount": 0,
          "createTime": 1711291168084,
          "__v": 0
      },
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711293078503,
      "error": null
  }
  ~~~


#### 根据商品ID获取商品详情

+ server

  ```
  shop_server
  ```

+ desc

  RT

+ router

  /shop/v1/api/goods/:orderId/detail

+ method

  GET

+ request param sample

  ```shell
  curl --location 'http://192.168.2.2:8090/shop/v1/api/goods/66003b20e7010efe0868effa/detail'
  ```

+ request param table 
  | NAME    | IN   | TYPE   | ENUMS | REQUIRED | DEFAULT | DESC   |
  | ------- | ---- | ------ | ----- | -------- | ------- | ------ |
  | goodsId | Path | String |       | true     |         | 商品ID |

+ response param sample 

  ~~~json
  {
      "data": {
          "_id": "66003b20e7010efe0868effc",
          "goodsId": "66003b20e7010efe0868effa",
          "contentHtml": "<p class=\"is-style-text-indent-2em \">火车还有六个小时才开，无聊就在候车厅呆呆，实在无聊了，就把自己的<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>词汇书拿出来看了起来，<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>老烂了，但为了解决无聊，就翻了几下。</p><p class=\"is-style-text-indent-2em\">忽然旁边坐过来一年轻小哥哥，瘦瘦的。看我拿本<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>书在看，就问我，“大学生在昆明读书啊？”，我看了一下他，不像是坏人，而且看起来也不讨厌，就弱弱地回答，“不是，在郑州。”</p>",
          "extraData": {},
          "createTime": 1711291168087,
          "__v": 0
      },
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711293387140,
      "error": null
  }
  ~~~

  

+ response param table 

  ~~~JSON
  
  {
      "data": {
          "_id": "66003b20e7010efe0868effc",
          "goodsId": "66003b20e7010efe0868effa",
          "contentHtml": "<p class=\"is-style-text-indent-2em \">火车还有六个小时才开，无聊就在候车厅呆呆，实在无聊了，就把自己的<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>词汇书拿出来看了起来，<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>老烂了，但为了解决无聊，就翻了几下。</p><p class=\"is-style-text-indent-2em\">忽然旁边坐过来一年轻小哥哥，瘦瘦的。看我拿本<a href=\"https://www.nange.cn/tag/%e8%8b%b1%e8%af%ad/\" title=\"【查看含有[英语]标签的文章】\" class=\"atags color-5\" target=\"_blank\">英语</a>书在看，就问我，“大学生在昆明读书啊？”，我看了一下他，不像是坏人，而且看起来也不讨厌，就弱弱地回答，“不是，在郑州。”</p>",
          "extraData": {},
          "createTime": 1711291168087,
          "__v": 0
      },
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711293387140,
      "error": null
  }
  ~~~

  

### 购物车相关接口

**server:  shop_server**

#### 用户购物车列表检索

+ router

  /shop/v1/api/cart

+ method

  GET

+ request param sample

  ~~~shell
  curl --location 'http://192.168.2.2:8090/shop/v1/api/cart?pageNo=0&pageSize=10&goodsName=HONDA'
  ~~~

  

+ request param table 

  | NAME      | IN    | TYPE   | PARENT | ENUMS | REQUIRED | DEFAULT | DESC     |
  | --------- | ----- | ------ | ------ | ----- | -------- | ------- | -------- |
  | goodsName | query | String | null   |       | false    |         | 商品名称 |
  | pageNo    | query | Number | null   |       | false    | 0       | 分页参数 |
  | pageSize  | query | Number | null   |       | false    | 10      | 分页参数 |
  |           |       |        |        |       |          |         |          |

+ response param sample

  ~~~json
  {
      "data": {
          "list": [
              {
                  "createTime": 1711291096586,
                  "soldCount": "0",
                  "goodsCount": 2,
                  "goodsImgs": "https://n.sinaimg.cn/sinakd20108/600/w1920h1080/20200608/297c-iurnkps0366424.jpg",
                  "goodsName": "HONDA",
                  "goodsPrice": "1200000",
                  "_id": "66003ad8e7010efe0868eff5",
                  "goodsType": "CAR",
                  "goodsStatus": "1",
                  "__v": 0,
                  "goodsId": "66003ad8e7010efe0868eff5",
                  "userId": "660036a6c8f9e09dff0bf1f6"
              }
          ],
          "count": 1
      },
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711326829666,
      "error": null
  }
  ~~~

  

#### 添加商品到购物车

+ router

  /shop/v1/api/cart

+ method

  POST

+ request param sample

  ~~~shell
  curl --location 'http://192.168.2.2:8090/shop/v1/api/cart' \
  --header 'Content-Type: application/json' \
  --data '{
      "goodsId": "66003ad8e7010efe0868eff5",
      "goodsCount": 1
  }'
  ~~~

+ request param table

  | NAME       | IN   | TYPE   | ENUMS | REQUIRED | DEFAULT | DESC     |
  | ---------- | ---- | ------ | ----- | -------- | ------- | -------- |
  | goodsId    | body | String |       | true     |         | 商品ID   |
  | goodsCount | body | String |       | true     |         | 商品数量 |

+ response param sample 

  ~~~json
  {
      "data": {
          "_id": "66003ad8e7010efe0868eff5",
          "goodsId": "66003ad8e7010efe0868eff5",
          "goodsName": "HONDA",
          "goodsCount": 2,
          "userId": "660036a6c8f9e09dff0bf1f6",
          "createTime": 1711291096586,
          "__v": 0
      },
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711325179676,
      "error": null
  }
  ~~~

  

#### 修改商品购物车

+ desc

  如果在body中传递空数组，则是清空购物车，删除所有的商品，后台检测body的类型，必须得是Array类型

+ router

  /shop/v1/api/cart

+ method

  PUT

+ request param sample

  ~~~SHELL
  curl --location --request PUT 'http://192.168.2.2:8090/shop/v1/api/cart?pageNo=0&pageSize=10&goodsStatus=2&goodsName=HONDA&orderSeries=desc&orderBy=goodsName' \
  --header 'Content-Type: application/json' \
  --data '[
      {
          "goodsCount": 3,
          "_id": "66003ad8e7010efe0868eff5",
          "goodsId": "66003ad8e7010efe0868eff5",
          "userId": "660036a6c8f9e09dff0bf1f6"
      }
  ]'
  ~~~

  

+ request param table 

  | NAME       | IN          | TYPE   | PARENT | ENUMS | REQUIRED | DEFAULT | DESC     |
  | ---------- | ----------- | ------ | ------ | ----- | -------- | ------- | -------- |
  | goodsId    | Body<Array> | String |        |       | true     |         | 商品ID   |
  | _id        | Body<Array> | String |        |       | true     |         | 购物车id |
  | goodsCount | Body<Array> | Number |        |       | true     |         | 商品数量 |

+ response param sample

  ~~~json
  {
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711328568295,
      "error": null
  }
  ~~~

  

#### 购物车商品生成订单

+ desc

  商品购物车内的商品直接生成订单，同时删除原来的购物车

+ router

  /shop/v1/api/cart/order

+ request param sample

  ~~~shell
  curl --location 'http://192.168.2.2:8090/shop/v1/api/cart/order' \
  --header 'Content-Type: application/json' \
  --data '["66003ad8e7010efe0868eff5"]'
  ~~~

  

+ request param table

  | NAME   | IN   | TYPE          | ENUMS | REQUIRED | DEFAULT | DESC                                  |
  | ------ | ---- | ------------- | ----- | -------- | ------- | ------------------------------------- |
  | cartId | Body | Array<String> |       | true     |         | 商品购物车ID数组，直接存放入data/body |

+ response param sample

  ~~~json
  
  {
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711332209243,
      "error": null
  }
  ~~~

### 订单相关接口

**server:  shop_server**

#### 订单列表检索

+ router

+ method

+ request params sample

  ~~~shell 
  curl --location 'http://192.168.2.2:8090/shop/v1/api/orderAndPay?goodsName=hon&orderStatus=0&pageSize=10&pageNo=0'
  ~~~

  

+ request params table

  | NAME        | IN    | TYPE   | ENUMS | REQUIRED | DEFAULT | DESC     |
  | ----------- | ----- | ------ | ----- | -------- | ------- | -------- |
  | goodsName   | query | String |       | false    |         | 商品名称 |
  | orderStatus | query | Number |       | false    |         | 订单状态 |
  | pageNo      | query | Number |       | false    | 0       | 分页参数 |
  | pageSize    | query | Number |       | false    | 10      | 分页参数 |

+ response param sample

  ~~~json
  {
      "data": {
          "list": [
              {
                  "_id": "6600db7190d9d0181f644c35",
                  "userId": "660036a6c8f9e09dff0bf1f6",
                  "createTime": 1711332209212,
                  "expiredDate": 1711334009212,
                  "orderStatus": 0,
                  "totalPrice": 1200000,
                  "totalCount": 1,
                  "orderGoodsInfo": [
                      {
                          "goodsId": "66003ad8e7010efe0868eff5",
                          "goodsName": "HONDA",
                          "goodsCount": 1,
                          "goodsImgs": [
                              "https://n.sinaimg.cn/sinakd20108/600/w1920h1080/20200608/297c-iurnkps0366424.jpg"
                          ],
                          "goodsPrice": 1200000,
                          "_id": "6600db7190d9d0181f644c36"
                      }
                  ],
                  "__v": 0
              }
          ],
          "count": 1
      },
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711336675171,
      "error": null
  }
  ~~~

#### 新增订单

+ router

  /shop/v1/api/orderAndPay

+ method

  POST

+ request param sample

  ~~~json
  curl --location 'http://192.168.2.2:8090/shop/v1/api/orderAndPay' \
  --header 'Content-Type: application/json' \
  --data '[
      {
          "goodsId" :"66003b20e7010efe0868effa",
          "goodsCount" : 9
      }
  ]'
  ~~~

  

+ request param table

  | NAME       | IN   | TYPE   | PARENT | ENUMS | REQUIRED | DEFAULT | DESC     |
  | ---------- | ---- | ------ | ------ | ----- | -------- | ------- | -------- |
  | goodsId    | body | String |        |       | true     |         | 商品ID   |
  | goodsCount | body | Number |        |       | true     |         | 商品数量 |

+ response param sample

  ~~~json
  {
      "data": {
          "userId": "660036a6c8f9e09dff0bf1f6",
          "createTime": 1711338825748,
          "expiredDate": 1711340625748,
          "orderStatus": 0,
          "totalPrice": 1007100000,
          "totalCount": 9,
          "orderGoodsInfo": [
              {
                  "goodsId": "66003b20e7010efe0868effa",
                  "goodsName": "PROSCHE",
                  "goodsCount": 9,
                  "goodsImgs": [
                      "https://img2.baidu.com/it/u=1275372190,3235868667&fm=253&fmt=auto&app=120&f=JPEG?w=889&h=500"
                  ],
                  "goodsPrice": 111900000,
                  "_id": "6600f5494963f8e8a0b9f3bc"
              }
          ],
          "_id": "6600f5494963f8e8a0b9f3bb",
          "__v": 0
      },
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711338825759,
      "error": null
  }
  ~~~

#### 删除订单

+ desc

  没有完成的订单，商品会回库

+ router

  /shop/v1/api/orderAndPay/:orderId

+ method

  DELETE

+ request param sample 

  ~~~shell
  curl --location --request DELETE 'http://192.168.2.2:8090/shop/v1/api/orderAndPay/6600f5494963f8e8a0b9f3bb'
  ~~~

  

+ request param table
  | NAME    | IN   | TYPE   | PARENT | ENUMS | REQUIRED | DEFAULT | DESC   |
  | ------- | ---- | ------ | ------ | ----- | -------- | ------- | ------ |
  | orderId | path | String |        |       | true     |         | 订单ID |

+ response param sample

  ~~~json
  {
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711340252650,
      "error": null
  }
  ~~~


#### 订单取消

+ router

  /shop/v1/api/orderAndPay/:orderId/cancel

+ method

  PUT

+ request param sample

  ~~~shell
  curl --location --request PUT 'http://192.168.2.2:8090/shop/v1/api/orderAndPay/6600fe99159c34e701197719/cancel'
  ~~~

+ request param table 

  | NAME    | IN   | TYPE   | PARENT | ENUMS | REQUIRED | DEFAULT | DESC   |
  | ------- | ---- | ------ | ------ | ----- | -------- | ------- | ------ |
  | orderId | path | String |        |       | true     |         | 订单ID |

+ response param sample

  ~~~json
  
  {
      "msg": "ok",
      "success": true,
      "code": "100000",
      "timeStamp": 1711341313863,
      "error": null
  }
  ~~~

  

#### 订单支付

+ desc 

  目前仅仅支持用户钱包支付

+ router

  /shop/v1/api/orderAndPay/:orderId/pay

+ method

  POST

+ request param sample

  ~~~shell
  
  
  ~~~

  

+ request param table

  | NAME      | IN   | TYPE   | PARENT | ENUMS     | REQUIRED | DEFAULT | DESC                                                         |
  | --------- | ---- | ------ | ------ | --------- | -------- | ------- | ------------------------------------------------------------ |
  | orderId   | path | String |        |           | true     |         | 订单ID                                                       |
  | payMethod | Body | Number |        | [1,2,3,4] |          |         | 支付方式： 1: "digital wallet", 2: "credit card", 3: "bitcoin", 4: "wechat", |

+ response param sample

  ~~~json
  {
      "msg": "ok",
      "success": true,
      "code": "000000",
      "timeStamp": 1711343615521,
      "error": null
  }
  
  ~~~

  

  



## 运维部分

### 依赖组件

+ consul

+ docker 

+ redis 

  version :5 +

+ mongodb

  version : 4 +

  mode: replSet 复制集模式

+ elasticsearch 

  version: 7.** +

+ node.js 

  version: 12+

### consul 配置部分

+ file_server

~~~json
{
    "redis": { 
      "host":"192.168.2.4",
      "port":"6379",
      "password":"123456"
    },
    "mongodb":{
        "url":"mongodb://oreo:89287503@192.168.2.4:27017,192.168.2.4:27018,192.168.2.4:27019/shop?readPreference=primaryPreferred&tls=false&replicaSet=rs&authSource=admin",
        "maxPoolSize": 20
    },
  	"gridfs":{
     "url":"mongodb://oreo:89287503@192.168.2.4:27017,192.168.2.4:27018,192.168.2.4:27019/file?readPreference=primaryPreferred&tls=false&replicaSet=rs&authSource=admin",
        "maxPoolSize": 20
    },
    "rabbitmq":{},
  	"port": 8080,
  	"filePath":"/data/upload",// 文件上传服务器
  	"downloadPath":"/data/download",
  	"downloadDomain":"http://192.168.2.4:8080",// 文件下载服务器
  	"sliceFileSize": 1048576,  // v1 版本的文件切片大小
  	"maxTempFilePersistTime": 43200000 // 临时文件最大保存时间
  }
~~~

+ shop_server

  ~~~json
  
  {
      "redis": {
        "host":"192.168.2.4",
        "port":"6379",
        "password":"123456"
      },
      "mongodb":{
          "url":"mongodb://oreo:89287503@192.168.2.4:27017,192.168.2.4:27018,192.168.2.4:27019/shop?readPreference=primary&tls=false&replicaSet=rs&authSource=admin",
          "maxPoolSize": 20
      },
      "es": {
        "url":"http://elastic:89287503@192.168.2.4:9200"
      },
    	"port": 8090
    }
  
  ~~~
  

#### 本地启动

~~~shell
# 进入项目目录
cd ./project dir

# 安装包
npm install 

# npm 启动shop_server
npm  run shop
# node 启动 shop_server 
node ./shop_server.js

# npm 启动file_server
npm  run file
# node 启动 file_server 
node ./file_server.js

~~~



### 构建docker镜像

~~~shell

# 进入项目目录
cd ./project dir

# 构建file_Server 镜像
docker build -f .\Dockerfile_file -t file_server .

 
 # 构建shop_server 镜像 
 docker build -f .\Dockerfile_shop -t shop_server .

 
~~~







