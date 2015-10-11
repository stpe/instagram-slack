var Promise = require("es6-promise").Promise;
var promisify = require("es6-promisify");
var ig = require("instagram-node").instagram();
var Slack = require("slack-node");

// instagram
ig.use({ access_token: process.env.INSTAGRAM_ACCESS_TOKEN });
ig.use({ client_id: process.env.INSTAGRAM_CLIENT_ID,
         client_secret: process.env.INSTAGRAM_CLIENT_SECRET });

// slack
var slack = new Slack();
slack.setWebhook(process.env.SLACK_WEBHOOK);

// memjs
var memjs = require("memjs");
var memjsClient = memjs.Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
  username: process.env.MEMCACHEDCLOUD_USERNAME,
  password: process.env.MEMCACHEDCLOUD_PASSWORD
});

// promisify stuff for convenience
var igUser = promisify(ig.user);
var igUserFollowers = promisify(ig.user_followers);

var memjsGet = function(key) {
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

var memjsSet = function(key, data) {
    memjsClient.set(key, JSON.stringify(data));
};

var MEMJS_INSTAGRAM_DATA = "instagramdata";

var slackMsg = {
    channel: "#" + process.env.SLACK_CHANNEL,
    icon_emoji: process.env.SLACK_EMOJI,
    username: process.env.SLACK_USERNAME
};

Promise.all([
    igUser(process.env.INSTAGRAM_USER_ID),
    igUserFollowers(process.env.INSTAGRAM_USER_ID),
    memjsGet(MEMJS_INSTAGRAM_DATA)
])
.then(function(data) {
    // get user info of most recent follower
    var follower = data[1][0];

    return igUser(follower.id)
        .then(function(followerData) {
            data.push(followerData);
            return data;
        }, function() {
            // if fail (most likely due to private account), stick to original profile
            data.push(follower);
            return data;
        });
})
.then(function(data) {

    var user = data[0];
    var follower = data[3];
    var cached = data[2] || {
        last_counts_followed_by: 0,
        last_follower_username: ""
    };

    var followerName = follower.full_name ? follower.full_name : follower.username;

    if (user.counts.followed_by > cached.last_counts_followed_by) {
        // got a follower
        slackMsg.text = "We got a new follower! Total followers now *" + user.counts.followed_by + "*! :heart_eyes: :boom: :fist:";

        var attachment = {
            "fallback": "We got a new follower! Total followers now " + user.counts.followed_by + ". The new one: " + follower.full_name + " " + follower.bio,
            "title": followerName,
            "title_link": "http://instagram.com/" + follower.username,
            "color": "#7CD197"
        };

        var text = [];
        if (follower.bio) {
            text.push(follower.bio);
        }
        if (follower.website) {
            text.push(follower.website);
        }
        if (text.length > 0) {
            attachment.text = text.join("\n");
        }

        if (follower.counts) {
            // user is public
            attachment.fields = [
                {
                    "title": "Follows",
                    "value": follower.counts.follows,
                    "short": true
                },
                {
                    "title": "Followed by",
                    "value": follower.counts.followed_by,
                    "short": true
                }
            ];
        } else {
            // private account
            attachment.title += " :lock:";
        }

        slackMsg.attachments = [attachment];
    } else if (user.counts.followed_by < cached.last_counts_followed_by) {
        // lost a follower
        slackMsg.text = "We lost a follower :frowning: Now a total of *" + user.counts.followed_by + "*.";
    }

    // send msg to Slack
    if (user.counts.followed_by != cached.last_counts_followed_by) {
        slack.webhook(slackMsg, function(err, response) {
            // console.log(response);
        });

        // update cache with recent values
        memjsSet(MEMJS_INSTAGRAM_DATA, {
            last_counts_followed_by: user.counts.followed_by,
            last_follower_username: follower.username
        });
    }

    console.log("Current follower count: " + user.counts.followed_by);
})
.catch(function(err) {
    console.log(err);
});
