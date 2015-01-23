var Promise = require('es6-promise').Promise;
var ig = require('instagram-node').instagram();
var Slack = require('node-slack');
var promisify = require("es6-promisify");

// instagram
ig.use({ access_token: process.env.INSTAGRAM_ACCESS_TOKEN });
ig.use({ client_id: process.env.INSTAGRAM_CLIENT_ID,
         client_secret: process.env.INSTAGRAM_CLIENT_SECRET });

// slack
var slack = new Slack(process.env.SLACK_DOMAIN, process.env.SLACK_TOKEN);

// promisify stuff for convenience
var igUser = promisify(ig.user);
var igUserFollowers = promisify(ig.user_followers);

Promise.all([
    igUser(process.env.INSTAGRAM_USER_ID),
    igUserFollowers(process.env.INSTAGRAM_USER_ID)
])
.then(function(data) {
    var user = data[0];
    var follower = data[1][0];

    slack.send({
        text: 'Vi har en till follower, totalt *' + user.counts.followed_by + '* :boom:',
        channel: process.env.SLACK_CHANNEL,
        icon_url: process.env.SLACK_ICON_URL,
        username: process.env.SLACK_USERNAME,
        attachments: [{
            "fallback": "Vi har en ny follower, totalt " + user.counts.followed_by + ": " + follower.full_name + " " + follower.bio,
            "title": follower.full_name,
            "title_link": "http://instagram.com/" + follower.username,
            "text": follower.bio + "\n" + follower.website,
            "color": "#7CD197"
        }]
    });
})
.catch(function(err) {
    console.log(err);
});