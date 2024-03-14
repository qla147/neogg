const config = global._config
const ElasticSearch = require('elasticsearch');

/**
 * *** ElasticSearch *** client
 */
const client = new ElasticSearch.Client({
    node : config.es.url,
    auth: {
        username: config.es.username,
        password: config.es.password
    }
});


module.exports = client;



