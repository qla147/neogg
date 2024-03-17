const config = global._config
const utils = require("../utils/utils")
const ErrorCode = require ("../const/ErrorCode")
const mongoose = require("mongoose");



mongoose.connect(config.mongodb.url, {maxPoolSize : config.mongodb.maxPoolSize});




module.exports = mongoose