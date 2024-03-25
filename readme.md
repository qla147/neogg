[toc]



# 商品项目文档



## 服务划分和介绍

### 服务器划分

本系统根据业务特性和对服务器的要求不一致，个人推荐划分为三个独立的服务

#### 文件存储服务器：

用户存储用户上传的商品信息，生成文件下载或者访问链接；

##### 主要实现逻辑：

1. 使用物理机存储用户的文件信息，不使用数据库存储文件，虽然MongoDB 等是支持文件存储，我一致秉承专业的工具做专业的事情

2. 文件采用文件内容md5值来实现文件的唯一性验证，解决用户多次重复上传文件，或者同资源多用户共享问题，减小服务器资源消耗；

3. 文件上传采用字节分段上传，

   例如100M的视频文件可以每1M一个段，把整个代上传的文件切分100份， 每份文件都标识序号，在所有文件都上传到服务器，按照序号拼合，检验md5值，后写入指定文件夹；

   具体实现中，采用MongoDB 记录用户文件的基本信息和文件物理信息，分2个collection来记录，因为单个相同文件多用户共享，故文件物理信息和用户文件信息需要分开存储；

   使用redis的list数据结构来记录上传进，list的每个unit存储文件已经上传部分的序号，key为文件的md5经过二次md5值(该值作为用户实际上传的文件token)， 同时对key设置过期，可以根据文件大小来设置过期，推荐小于10m的文件设置半个小时；文件上传整体完成删除该redis记录

4. 数据部分

   redis: 存储正在上传文件已经上传的切分文件的序号

   + key : 待上传文件的md5值二次md5值
   + value：完成该文件已经成完成上传的切分文件序号
   + format: list
   + expired: 自动过期删除（根据文件大小动态设置）和手动删除（上传完成就手动删除）

   mongodb collection:

   + file（文件物理信息表） : 存储文件的基本物理信息

     ~~~js
     const Schema = mongoose.Schema
     const FileSchema = new Schema({
         fileMd5 : {
             type : String ,
             desc :"文件md5",
             required: true
         },
         filePath :{
             type: String ,
             desc:"文件物理存储地址",
             required: true
         },
         isShare :{
             type : Boolean ,
             default : false ,
             desc :"是否为共享文件"
         }
     },{
         collection: "file"
     })
     ~~~

   + fileInfo（文件记录表）: 存储用户上传文件的记录，需要记录引用file表

     ~~~js
     const Schema = mongoose.Schema
     const FileInfoSchema = new Schema({
         fileSize :{
             required : true ,
             type : Number ,
             desc :"文件大小"
         },
         fileMd5 :{
             required : true ,
             type : String ,
             desc : "文件md5值"
         },
         fileType :{
           type : String,
           // enum :["video","audio","doc" , "pdf", "xls","xlsx","img"],
           desc :"文件类型"
         },
         fileUrl : {
           type : String ,
           desc :"文件下载url"
         },
         fileStatus :{
           type: Number ,
           desc :{
               0: "待上传",
               1: "上传完成",
               2: "正在上传中"
           },
           enum: [1, 2, 0],
           default : 0
         },
         isShared: {
             default : false ,
             type : Boolean ,
             desc :"共享文件"
         },
         userId :{
             type : mongoose.Types.ObjectId,
             desc :"上传用户ID",
             ref: "userInfo"
         },
         autoDelete: {
             type: Number ,
             desc : "上传没有完成-自动删除时间"
         },
         completeTime : {
             type : Number ,
             desc :"完成上传的时间"
         },
         createTime : {
             type : Number ,
             desc :"创建时间"
         },
         fileId:{
             type : mongoose.Types.ObjectId,
             ref :"file",
             desc :"文件物理存储表"
         }
     
     },{
         collection :"fileInfo"
     })
     ~~~

5. 接口部分：设计4个接口即可完成文件服务器； 

   + 文件信息上传接口；

     获取用户需要上传文件的基本信息，同时判断该文件的相同的文件是否已经存在；如果该文件已经被上传过了，生成文件下载url地址，写入fileInfo(文件记录表)数据库，用户不需要上传文件实体，随后返回该信息；

     如果没有找到该文件相同的md5值的文件； 那么生成基本fileInfo（文件记录表）写入数据库。 生成该待上传的上传token 和切分信息 返回客户端；切分上传信息写入redis ;

   + 文件上传接口

     在文件没有被上传，且相同md5值的文件在服务器中不存在时，根据“文件信息上传接口”返回的文件切分上传信息和token，上传文件；

     node.js主流支持文件上传的中间件有multer 和formidable，可以使用该中间实现表单提交文件接口服务（我常用formidable）；

     提交表单数据需要包含用户信息，文件上传token，文件切片标号；

     把上传的切片文件写入临时文件，并写入redis;同时检测所有的切片文件是否已经上传完成， 上传完成就合并文件，写入文件夹， 生成file（文件物理信息）写入库，同时更新fileInfo表; 并返回fileInfo信息给客户端

   + 文件下载接口

     客户端拿到fileInfo中的fileUrl，直接访问获取文件；在该接口中需要提供用户鉴权信息，进行检测；同时需要根据待下载的文件大小，来判断使用何种方式回传数据，如果文件大小超过一定的阈值需要使用文件流方式来读取文件进行回传下载，如果是小文件直接回传即可

##### 设计优势

+ 支持同文件多用户共享，避免重复上传，存储
+ 支持多文件并行上传，高速（需要服务器支持）
+ 独立服务使用http访问，支持横向扩展（需要ng支持，需同一文件的切分文件上传访问相同服务器）

#####  设计劣势

+ 复杂度增加
+ 需要定时器删除上传一半不再上传的文件记录

#### 商品信息服务

主要用商品信息展示和检索功能，以及订单生成功能（支付功能需要独立出来）

##### 主要实现逻辑

1. 商品列表页面的实现

   数据存储使用 MongoDB + ElasticSearch存储解决方案，采用空间换性能的解决方案；

   简单说就是Mongodb存储商品的详细信息，ElasticSearch中存储需要被客户端全局检索商品字段和MongDB商品信息主键；

   为什么要这样做，在使用实际产品过程，特别是购物类产品，常常需要 模糊的全局检索，那么问题就来了，mongodb对查询的优化仅仅支持左端开头字符串模糊查询优化，官方文档也是说明了需要全文或全字段模糊查询最好使用ElasticSearch支持；这里指定了MongoDB作为必选数据库，所以只能加一层ElasticSearch是目前的最优解，即使选了mysql（常用innoDB）作为主存储，其索引数据结构和mongodb(4.0版本后默认引擎)具有相似性，因此对全文检索或者like“%{value}%”的支持也不足的，根本没法优化(我遇到过)，数量少还好说，数据多了简直就是噩梦；

   同时商品在写入mongo之时，需要使用redis缓存起来，格式使用list格式，key使用商品的主键ID, valus为实际商品购买者ID , 在支付之前可以为零值， list长度应该是等于该商品的数量； 为什么这么设计呢？防止超卖！如果商品数量非常多，导致redis消耗资源比较多可以使用360团队出品的pika兼容redis

2. 商品详细页面, 展示商品的具体信息(文字/图片/视频元素都需要);

   商品详情页面这边，由于存在自己搭建的文件服务，所以这里商品详情就很好解决了，由于图片或者视频元素采用url的形式存在，所以直接从库中取html模板，加载文件url 直接渲染即可; 这种静态的资源完全采用CDN形式加速

3. 商品的添加购物车和支付

   1. 这部分也是整个系统最难的点； 首先是关联的数据collection较多，同时需要事务的支持，而mongodb的“事务”是基于复制集模式，因此在搭建mongodb服务器之时需要采用复制集模式；
   2. 为了增大系统吞吐量，独立出来支付系统，开发成为一个可以横向扩展的服务，支付订单采用专用redis数据锁和rabbitmq来交换支付信息，同时结合mongodb的事务；防止发生重复支付或者其他数据问题。如果还想增加容量可以考虑mongodb的分片思想

## MongoDB字段

### File collection

文件物理表 存放于oss.fileInfo

#### model & index

~~~js
const FileSchema = new Schema({
    fileMd5 : {
        type : String ,
        desc :"文件md5",
        required: true,
        index:true ,
        unique: true
    },
    filePath :{
        type: String ,
        desc:"文件物理存储地址",
        required: true
    },
    isShare :{
        type : Boolean ,
        default : false ,
        desc :"是否为共享文件"
    }
},{
    collection: "file"
})

FileSchema.index({ fileMd5: 1 }); // 查询索引
FileSchema.index({ fileMd5: 1, isShare: 1}) // 定时器删除索引

~~~

### FileInfo collection

文件上传信息表， 存放于oss.fileInfo

#### model & index 

~~~js


const FileInfoSchema = new Schema({
    fileSize :{
        required : true ,
        type : Number ,
        desc :"文件大小"
    },
    fileMd5 :{
        required : true ,
        type : String ,
        desc : "文件md5值"
    },
    fileType :{
      type : String,
      // enum :["video","audio","doc" , "pdf", "xls","xlsx","img"],
      desc :"文件类型"
    },
    fileUrl : {
      type : String ,
      desc :"文件下载url"
    },
    fileStatus :{
      type: Number ,
      desc :{
          0: "待上传",
          1: "上传完成",
          2: "正在上传中"
      },
      enum: [1, 2, 0],
      default : 0
    },
    isShared: {
        default : false ,
        type : Boolean ,
        desc :"共享文件"
    },
    userId :{
        type : mongoose.Types.ObjectId,
        desc :"上传用户ID",
        ref: "userInfo"
    },
    autoDelete: {
        type: Number ,
        desc : "上传没有完成-自动删除时间"
    },
    completeTime : {
        type : Number ,
        desc :"完成上传的时间"
    },
    createTime : {
        type : Number ,
        desc :"创建时间"
    },
    fileId:{
        type : mongoose.Types.ObjectId,
        ref :"file",
        desc :"文件物理存储表"
    }

},{
    collection :"fileInfo"
})


FileInfoSchema.index({fileMd5:1 , userId :1 })
FileInfoSchema.index({autoDelete:1 , fileStatus: 1 })
~~~



### GoodsInfo collection

商品信息表，存放于goods.goodsInfo 

#### model & index

~~~js
const GoodsInfo = new Schema({
    goodsType:{
        type: String ,
        desc :"商品类型"
    },
    goodsName:{
        type : String  ,
        desc : "商品名称"
    },
    saleTime :{
        type : Number ,
        desc : "开售时间, 格式timestamp",
    },
    goodsUsdPrice:{
        type: Number ,
        desc :"商品售价,以美分为单位",
        min: 0
    },
    goodsCount : {
        type: Number ,
        desc :"商品可售数量",
        min:0 ,
        max:9999
    },
    status:{
        type: Number ,
        desc :{
            detail : "商品状态",
            enums:{
                0 : "待上架",
                1 : "上架售卖中",
                2 : "下架",
                3 : "售罄"
            }
        },
        enum:[0,1,2,3]
    },
    goodsDetailId :{
        type : mongoose.Types.ObjectId,
        ref :"goodsDetail",
        desc :"商品详情信息"
    },
    SoldCount:{
        type: Number,
        desc:"以后售卖的数量",
        default: 0
    },
    createTime : {
        type : Number,
        desc :  "创建时间"
    },
}, {collection:"goodsInfo"})

GoodsInfo.index({goodsName : 1 ,goodsType : 1 , saleTime : -1 })

~~~



### GoodDetail

商品详情表 存放于goods.goodsDetail

#### model & index 

~~~json

const GoodsDetail = new Schema({
    goodsId :{
        type: mongoose.Types.ObjectId,
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
        type: mongoose.Types.Map,
        desc :"渲染需要的参数"
    }
}, {collection: "goodsDetail"})


~~~

### CartInfo 

购物车信息 存放于 goods.cartInfo 

#### model & index

~~~json

const  CartInfo = new Schema({
    goodsId :{
        type : mongoose.Types.ObjectId,
        desc : "商品ID",
        ref:"goodsInfo"
    },
    goodsPrice:{
        type: Number , 
        desc :"商品单价 没分计价",
    	min: 0 
    },
    count :{
        type : Number,
        min: 0 ,
        max: 9999,
        desc :"商品数量"
    },
    userId:{
      type : mongoose.Types.ObjectId,
      desc : "用户ID",
      ref: "userInfo",
      required : true   
    },
    addTime :{
        type: Number ,
        desc :"添加时间"
    }
},{collection:"cartInfo"})


CartInfo.index({goodsId: 1 , userId : 1 })
CartInfo.index({ userId : 1 , addTime : -1 })
~~~



### OrderInfo

订单表 存放于 order.orderInfo

~~~json
const OrderGoodsInfo = new Schema({
    goodsId : {
        type : mongoose.Types.ObjectId,
        ref :"goodsInfo",
        desc :"商品信息ID"
    },
    goodsName :{
        type : String ,
        desc :"商品名称"
    },
    count :{
        type : Number ,
        desc :"商品数量",
        min: 0
    },
    price :{
        type : Number ,
        desc :"商品单价",
        min: 0
    }
})

const OrderInfo = new Schema({
    userId :{
        type : mongoose.Types.ObjectId,
        desc : "用户ID",
        ref: "userInfo",
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
    status :{
        type: Number  ,
        enum:[0,1,2,3],
        default : 0 ,
        desc :{
            detail : "订单状态",
            enums :{
                0: "待支付",
                3: "支付成功",
                2: "过期",
                1: "取消"
            }
        }
    },
    totalPrice:{
        type : Number ,
        desc :"订单金额",
        min: 0
    },
    goodsInfos : {
        type: [OrderGoodsInfo],
        desc :"订单包含商品列表"
    },
    payTime :{
      type : Number ,
      desc :"支付时间"
    },
    payMethod :{
        type : String ,
        desc :"支付方式"
    }
},{collection: "orderInfo"})

OrderInfo.index({userId :1 ,createTime : -1 })
OrderInfo.index({userId :1 ,status : 1 ,createTime : -1 }) 

~~~



## API 部分

### 错误码部分

~~~js
{
    "GOODS_DETAIL_NOT_FOUND" :"100", // 商品详情没有找到
    "GOODS_INFO_NOT_FOUND" :"101", // 商品信息没有找到
    "GOODS_INFO_EXIST": "102",      // 商品已经存在


    "LOCK_GOODS_INFO": "200", // 商品被锁住，请稍后再试


    "INTERNAL_ERROR": "500", // 内部错误
    "MONGODB_ERROR": "501" ,    //mongodb 错误
    "REDIS_ERROR":" 502",   // redis 错误
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
}

~~~



### 商品相关接口

#### 新增商品

+ desc 

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

+ desc 

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

+ 



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
    "redis": {  // redis config 
      "host":"192.168.2.4",
      "port":"6379",
      "password":"123456"
    },
    "mongodb":{ // mongodb config 
        "url":"mongodb://oreo:89287503@192.168.2.4:27017,192.168.2.4:27018,192.168.2.4:27019/oss?readPreference=primaryPreferred&tls=false&replicaSet=rs&authSource=admin",
        "maxPoolSize": 20
    },
  	"gridfs":{ // mongodb GirdFs config 
     "url":"mongodb://oreo:89287503@192.168.2.4:27017,192.168.2.4:27018,192.168.2.4:27019/gridfs?readPreference=primaryPreferred&tls=false&replicaSet=rs&authSource=admin",
        "maxPoolSize": 20
    },
    "es": { // elasticsearch config 
      "url":"192.168.2.4:9200",
      "username": "elastic",
      "password": "89287503"
    },
  	"port": 8080, // server port 
  	"filePath":"/data/upload",  // the temp dir for uploaded files 
  	"downloadPath":"/data/download",  // 文件存储目录
  	"downloadDomain":"http://192.168.2.4:8080/v1/api/file/download", // 文件服务下载链接
  	"sliceFileSize": 1048576, 	// 文件切片大小
  	"maxTempFilePersistTime": 43200000 // 文件切片文件最大保存时间（second）
  }
~~~

+ shop_server

  ~~~json
  
  
  
  ~~~

  



## 更新记录

### 20240319 商品部分接口代码开发完成





