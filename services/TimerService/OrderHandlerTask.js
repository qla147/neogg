const {TimerTask} = require("./index");

const OrderService = require("../OrderService")
const service = {
    generatorTask :()=>{
        return new TimerTask("shop_server:expired_order_clean", "* */1 * * * *", null, OrderService.checkExpiredOrder)
    }
}

module.exports = service