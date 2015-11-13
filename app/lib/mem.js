// memjs
var memjs = require("memjs");

var memjsClient = memjs.Client.create(
    process.env.MEMCACHEDCLOUD_SERVERS,
    {
        username: process.env.MEMCACHEDCLOUD_USERNAME,
        password: process.env.MEMCACHEDCLOUD_PASSWORD
    });

var mem = {
    MEMJS_INSTAGRAM_DATA: "instagramdata",
    MEMJS_INSTAGRAM_STAT_UPDATES_DATA: "instagramstatsupdatedata"
};

mem.set = function(key, data) {
    memjsClient.set(key, JSON.stringify(data));
};

mem.get = function(key) {
    console.log("mem.get", key);
    return new Promise(function(resolve, reject) {
        memjsClient.get(key,
            function(err, value, key) {
                if (err) {
                    return reject(Error(err));
                }

                resolve(value ? JSON.parse(value.toString()) : "");
            }
        );
    });
};

module.exports = mem;