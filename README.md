Instabot: Instagram notifications on Slack
==========================================

Simple Node.js application that will post in a Slack channel whenever you get a new, or lose, a follower on your Instagram account.

Application designed to be run as a worker on Heroku, polled every 10 minutes or so using a [scheduler](https://devcenter.heroku.com/articles/scheduler). Uses [Memcached Cloud](https://devcenter.heroku.com/articles/memcachedcloud) to store data.

To have it run the following environment variables must be set:

```
INSTAGRAM_USER_ID=user id of instagram account
INSTAGRAM_CLIENT_ID=your instagram client id
INSTAGRAM_CLIENT_SECRET=your instagram client secret
INSTAGRAM_ACCESS_TOKEN=your instagram access token
SLACK_DOMAIN=your subdomain on Slack
SLACK_TOKEN=your webhook token on Slack
SLACK_CHANNEL=channel on Slack to post message in (without the hash)
SLACK_ICON_URL=url to icon to be used on Slack
SLACK_USERNAME=name of the bot who posts on Slack
MEMCACHEDCLOUD_PASSWORD=memcachedcloud password (automatically set when addon installed)
MEMCACHEDCLOUD_SERVERS=memcachedcloud server (automatically set when addon installed)
MEMCACHEDCLOUD_USERNAME=memcachedcloud username (automatically set when addon installed)
```
