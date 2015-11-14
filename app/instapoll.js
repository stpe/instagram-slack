var Promise = require("es6-promise").Promise;
var promisify = require("es6-promisify");
var ig = require("instagram-node").instagram();

var mem = require("./lib/mem");
var slack = require("./lib/slack");

var mediaStats = require("./tasks/mediaStats")(mem, slack);

// instagram
ig.use({ access_token: process.env.INSTAGRAM_ACCESS_TOKEN });
ig.use({ client_id: process.env.INSTAGRAM_CLIENT_ID,
         client_secret: process.env.INSTAGRAM_CLIENT_SECRET });

// promisify stuff for convenience
var igUser = promisify(ig.user);
var igUserFollowers = promisify(ig.user_followers);
var igUserMediaRecent = promisify(ig.user_media_recent);

Promise.all([
    igUser(process.env.INSTAGRAM_USER_ID),
    igUserFollowers(process.env.INSTAGRAM_USER_ID),
    igUserMediaRecent(process.env.INSTAGRAM_USER_ID, { count: 10 }),
    mem.get(mem.MEMJS_INSTAGRAM_DATA)
])
.then(function(data) {
    console.log("Data length: ", data.length);

    var result = {
        user: data[0][0],
        follower: data[1][0],  // get user info of most recent follower
        media: data[2][0],
        cached: data[3] || {
            last_counts_followed_by: 0,
            last_follower_username: ""
        }
    }

    return igUser(result.follower.id)
        .then(function(followerData) {
            result.follower = followerData;
            return result;
        }, function() {
            return result;
        });
})
.then(function(data) {
    var user = data.user;
    var follower = data.follower;
    var cached = data.cached;
    var media = data.media;

    var followerName = follower.full_name ? follower.full_name : follower.username;

    var slackMsg = {};
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
        slack.send(slackMsg)

        // update cache with recent values
        mem.set(mem.MEMJS_INSTAGRAM_DATA, {
            last_counts_followed_by: user.counts.followed_by,
            last_follower_username: follower.username
        });
    }

    console.log("Current follower count: " + user.counts.followed_by);

    mediaStats.parseData(media);
})
.catch(function(err) {
    console.log(err);
    console.log(err.stack);
    throw err;
});
