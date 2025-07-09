const NodeCache = require( "node-cache" );
const cache = new NodeCache();

function setCache(key, value) {
    cache.set(key, value);
    return getCache(key);
}
function clearCache(key) {
    cache.del(key);
}

function getCache(key) {
    return cache.get(key);
}

function hasCache(key) {
    return cache.has(key);
}

module.exports = {
    setCache,
    clearCache,
    getCache,
    hasCache
}
