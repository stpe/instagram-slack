var Promise = require("es6-promise").Promise;
var ig = require("instagram-node").instagram();
var Slack = require("node-slack");
var promisify = require("es6-promisify");

// instagram
ig.use({ access_token: process.env.INSTAGRAM_ACCESS_TOKEN });
ig.use({ client_id: process.env.INSTAGRAM_CLIENT_ID,
         client_secret: process.env.INSTAGRAM_CLIENT_SECRET });

// slack
var slack = new Slack(process.env.SLACK_DOMAIN, process.env.SLACK_TOKEN);

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

var MEMJS_INSTAGRAM_DATA = "instagramdata";

var slackMsg = {
    channel: "#" + process.env.SLACK_CHANNEL,
    icon_url: process.env.SLACK_ICON_URL,
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
        });
})
.then(function(data) {
    var user = data[0];
    var follower = data[3];
    var cached = data[2] || {
        last_counts_followed_by: 0,
        last_follower_username: ""
    };

    if (user.counts.followed_by > cached.last_counts_followed_by) {
        // got a follower
        slackMsg.text = "We got a new follower! Total followers now *" + user.counts.followed_by + "*! :heart_eyes: :boom: :fist:";
        slackMsg.attachments = [{
            "fallback": "We got a new follower! Total followers now " + user.counts.followed_by + ". The new one: " + follower.full_name + " " + follower.bio,
            "title": follower.full_name,
            "title_link": "http://instagram.com/" + follower.username,
            "text": follower.bio + "\n" + follower.website,
            "color": "#7CD197",
            "fields": [
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
            ]
        }];
    } else if (user.counts.followed_by < cached.last_counts_followed_by) {
        // lost a follower
        slackMsg.text = "We lost a follower :frowning: Now a total of *" + user.counts.followed_by + "*.";
    }

    // send msg to Slack
    if (user.counts.followed_by != cached.last_counts_followed_by) {
        slack.send(slackMsg);

        // update cache with recent values
        memjsClient.set(MEMJS_INSTAGRAM_DATA, JSON.stringify({
            last_counts_followed_by: user.counts.followed_by,
            last_follower_username: follower.username
        }));
    }

    console.log("Current follower count: " + user.counts.followed_by);
})
.catch(function(err) {
    console.log(err);
});
