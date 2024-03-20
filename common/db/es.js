const config = global._config
const ElasticSearch = require('elasticsearch');

/**
 * *** ElasticSearch *** client
 */
const client = new ElasticSearch.Client({
    host : config.es.url,
});

client.ping().then(res=>{
    console.error("ElasticSearch is ready ")
}).catch(err=>{
    console.error(err)
    console.error("ElasticSearch got error !")
})

module.exports = client;





