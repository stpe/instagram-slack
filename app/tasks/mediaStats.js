var _ = require("lodash");
var moment = require("moment");

moment().format();

var postStatisticsInterval = [
    //Math.round(new Date().getTime() / 1000) - 1447344881 - (60*2), // for testing to automatically trigger a post
    1,
    60 * 60 * 3,        // 3h
    60 * 60 * 24,       // 24h
    60 * 60 * 24 * 7    // 1 week
];

var maxIntervalOverlapse = 60 * 30; // max allowed overlapse of postStatisticInterval checkpoint to post statistics

var mediaStats = {};

var mem = null;

mediaStats.saveStats = function(stats) {
    // delete keys with a created time older than threshold
    var threshold = Math.round(new Date().getTime() / 1000) - postStatisticsInterval[postStatisticsInterval.length - 1] - maxIntervalOverlapse;

    Object.keys(stats).forEach(function(key) {
        if (stats[key] < threshold) {
            delete stats[key];
        }
    });

    mediaStats.mem.set(mediaStats.mem.MEMJS_INSTAGRAM_STAT_UPDATES, JSON.stringify(stats));
};

mediaStats.sendSlackMsg = function(post) {
    var since = Math.round(new Date().getTime() / 1000) - post.created_time;

    mediaStats.slack.send({
        attachments: [{
            author_name: "Statistics for Instagram " + post.type + " posted " + moment.duration(-since, "seconds").humanize(true),
            author_link: "instagram://media?id=" + post.id,
            author_icon: "http://test.rebelandbird.com/slackbird/icon-instagram.png",

            text: post.caption.text + "\n" + post.link,
            fields: [
                {
                    "title": "Likes",
                    "value": post.likes.count,
                    "short": true
                },
                {
                    "title": "Comments",
                    "value": post.comments.count,
                    "short": true
                }
            ],
            color: "#125688"
        }]
    });
};

mediaStats.parseData = function(media) {
    mediaStats.mem.get(mediaStats.mem.MEMJS_INSTAGRAM_STAT_UPDATES)
        .then(function(memStats) {
            if (typeof memStats == "string") {
                memStats = JSON.parse(memStats);
            } else {
                memStats = {};
            }

            var now = Math.round(new Date().getTime() / 1000);

            media = media
                .filter(function(post) {
                    var createdTime = parseInt(post.created_time, 10);

                    // is in interval to post and not already posted?
                    return postStatisticsInterval.some(function(interval) {
                        if (
                            now > createdTime + interval &&
                            now < createdTime + interval + maxIntervalOverlapse &&
                            !_.get(memStats, post.id + '-' + interval, false)
                        ) {
                            post._interval = interval;
                            return true;
                        }
                        return false;
                    });
                })
                .forEach(function(post) {
                    mediaStats.sendSlackMsg(post);
                    _.set(memStats, post.id + '-' + post._interval, post.created_time);
                });

            mediaStats.saveStats(memStats);
        })
        .catch(function(err) {
            console.log(err);
            console.log(err.stack);
            throw err;
        });
};

module.exports = function(mem, slack) {
    mediaStats.mem = mem;
    mediaStats.slack = slack;

    return mediaStats;
}
