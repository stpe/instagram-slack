var Slack = require("slack-node");
var _ = require("lodash");

var slackMsg = {
    //channel: "#" + process.env.SLACK_CHANNEL,
    channel: "@stefan",
    icon_emoji: process.env.SLACK_EMOJI,
    username: process.env.SLACK_USERNAME
};

var slack = new Slack();
slack.setWebhook(process.env.SLACK_WEBHOOK);

var slackMessenger = {};

slackMessenger.send = function(msg) {
    console.log(JSON.stringify(msg, 0, 2));

    msg = _.merge(slackMsg, msg);

    slack.webhook(msg, function(err, response) {
        // console.log(response);
    });
}

module.exports = slackMessenger;