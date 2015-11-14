var Slack = require("slack-node");
var _ = require("lodash");

var slackMsg = {
    channel: "#" + process.env.SLACK_CHANNEL,
    icon_emoji: process.env.SLACK_ICON_URL,
    username: process.env.SLACK_USERNAME
};

var slack = new Slack();
slack.setWebhook(process.env.SLACK_WEBHOOK);

var slackMessenger = {};

slackMessenger.send = function(msg) {
    msg = _.merge(slackMsg, msg);

    slack.webhook(msg, function(err, response) {
        // console.log(response);
    });
}

module.exports = slackMessenger;