const Consul = require("consul")



class  ConsulClient {
    constructor() {
        this.client = new Consul({
            host: commonConfig.consul.host,
            port : commonConfig.consul.port
        })
    }





}