// memjs
var memjs = require("memjs");
var Promise = require("es6-promise").Promise;

var memjsClient = memjs.Client.create(
    process.env.MEMCACHEDCLOUD_SERVERS,
    {
        username: process.env.MEMCACHEDCLOUD_USERNAME,
        password: process.env.MEMCACHEDCLOUD_PASSWORD
    });

var mem = {
    MEMJS_INSTAGRAM_DATA: "instagramdata",
    MEMJS_INSTAGRAM_STAT_UPDATES: "igstatsupdate"
};

mem.set = function(key, data) {
    memjsClient.set(key, JSON.stringify(data), function(err, val) {
        if (err) {
            throw Error(err);
        }

    });
};

mem.get = function(key) {
    return new Promise(function(resolve, reject) {
        memjsClient.get(key,
            function(err, value, key) {
                if (err) {
                    return reject(Error(err));
                }

                if (value) {
                    resolve(JSON.parse(value.toString()));
                } else {
                    resolve("");
                }
            }
        );
    });
};

module.exports = mem;