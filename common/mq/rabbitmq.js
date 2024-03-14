const amqp = require("amqplib")
const utils = require("../utils/utils");
const config = global._config

class RabbitMQOrderPay {
    constructor() {
        this.connection = amqp.connect(config.rabbitmq.url)
        this.index = 0
        this.queueName = "pay"
        this.send = this.send.bind(this)
        this.messageHandler = {} // 用于处理队列监听到的消息的处理方法， 采用注入方法注入
    }


    /**
     * @author hhh
     * @date 2024年3月13日08:55:08
     * @param handler
     * @param handlerName
     */
    loadHandler(handler , handlerName ){
        this.messageHandler[handlerName] = handler
    }


    async send(msg) {
        let channel
        try{
            let conn = await this.connection()
            channel =await  conn.createChannel()
            await channel.assertQueue(this.queueName , {durable: true})
            let data = await channel.sendToQueue(this.queueName , new Buffer(msg), {persistent: true })
            return utils.Success(data)
        }catch (e) {
            console.error(e)
            return utils.Error(e)
        }finally {
            if (channel) {
                channel.close()
            }
        }
    }



}