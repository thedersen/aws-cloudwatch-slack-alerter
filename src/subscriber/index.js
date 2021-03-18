const https = require('https');
const AWS = require('aws-sdk');
const cw = new AWS.CloudWatchLogs();

exports.handler = async function(event)  {
  const {account, detail} = event;
  const {logGroupName} = detail.requestParameters;
  const region = process.env.AWS_REGION;

  if (new RegExp(process.env.SUBSCRIPTION_REGEX).test(logGroupName)) {
    const params = {
      logGroupName,
      destinationArn: process.env.ALERTER_ARN,
      filterName: 'SlackAlerter',
      filterPattern: '?"Error: Runtime exited" ?"Task timed out after" ?"\tERROR\t" ?"\\"level\\":\\"error\\"" ?"\tINFO\tALERT\t"'
    };
    await cw.putSubscriptionFilter(params).promise();
    await postToSlack({
      text: 'Subscribed to new log group',
      blocks: [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Subscribed to *${logGroupName}* in *${region}* on account ${account}`,
        }
      }, {
        type: 'divider'
      }]
    });
    console.log(`Subscribed to ${logGroupName} in ${region} on account ${account}`);
  }
}

function postToSlack(payload) {
  return new Promise((resolve, reject) => {
    const slackUrl = new URL(process.env.SLACK_WEBHOOK_URL);
    const options = {
      method: 'POST',
        hostname: slackUrl.hostname,
        path: slackUrl.pathname,
        headers: {
          'Content-Type': 'application/json'
        }
    };
    const req = https.request(options, () => {
      resolve('Success');
    });
    req.on('error', (e) => {
      reject(e.message);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}
