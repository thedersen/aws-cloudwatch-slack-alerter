const https = require('https');
const util = require('util');
const zlib = require('zlib');
const gunzip = util.promisify(zlib.gunzip);

exports.handler = async function(event)  {
  const payload = Buffer.from(event.awslogs.data, 'base64');
  const gunzipped = await gunzip(payload);
  const eventDetails = JSON.parse(gunzipped.toString('utf8'));

  await postToSlack(toSlackFormat(eventDetails));
}

function toSlackFormat(event) {
  const {owner, logGroup, logEvents} = event;
  const blocks = logEvents.map(e => {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`${e.message.replace(/\t/g, '\n').substring(0, 2000)}\`\`\``
      }
    };
  })

  return {
    text: `Error in ${logGroup} (account ${owner})`,
    blocks: [{
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Error in ${logGroup} (account ${owner})`
      }
    }, ...blocks]
  };
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
    const req = https.request(options, (res) => {
        resolve('Success');
    });
    req.on('error', (e) => {
        reject(e.message);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}
