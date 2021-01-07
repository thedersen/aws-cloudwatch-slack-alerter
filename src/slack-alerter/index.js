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
  const {owner, logGroup, logStream, logEvents} = event;
  const region = process.env.AWS_REGION;
  const functionName = logGroup.split('/').pop();

  const blocks = logEvents.flatMap(e => {
    const {timestamp, errorType, errorMessage} = getEventData(e);
    return [{
      type: 'section',
      fields: [{
        type: 'mrkdwn',
        text: `Timestamp:\n*${timestamp.replace('T', ' ').substring(0, 19)} UTC*`
      },{
        type: 'mrkdwn',
        text: `Error Type:\n*${errorType}*`
      }]
    }, {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`${errorMessage.substring(0, 2000)}\`\`\``
      }
    }];
  })

  return {
    text: `Error in ${functionName}`,
    blocks: [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Log Group:\n*<${logGroupUrl(logGroup, logStream, region)}|${logGroup}>*`
      }
    },{
      type: 'section',
      fields: [{
        type: 'mrkdwn',
        text: `Account:\n*${owner}*`
      },{
        type: 'mrkdwn',
        text: `Region:\n*${region}*`
      }]
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

function logGroupUrl(logGroup, logStream, region) {
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${encodeURIComponent(encodeURIComponent(logGroup))}/log-events/${encodeURIComponent(encodeURIComponent(logStream))}`
}

function getEventData(logEvent) {
  const messageArray = logEvent.message.split('\t');
  // Unhandled exception
  // [
  //   '2020-09-04T00:38:00.810Z',
  //   'd440b814-371d-4077-a11d-47615727f4ec',
  //   'ERROR',
  //   'Invoke Error ',
  //   '{"errorType":"TypeError","errorMessage":"Cannot read property \'x\' of undefined","stack":["TypeError: Cannot read property \'x\' of undefined","    at Runtime.exports.main [as handler] (/var/task/services/webhooks/webpack:/tmp/example.js:1:1)","    at Runtime.handleOnce (/var/runtime/Runtime.js:66:25)"]}\n'
  // ]
  if(messageArray.length === 5) {
    const errorMessage = JSON.parse(messageArray[4]);
    return {
      timestamp: messageArray[0],
      errorType: errorMessage.errorType,
      errorMessage: JSON.stringify(errorMessage, null, 2),
    }
  }
  // Timeout
  // ['2020-09-06T13:57:55.672Z 64cad227-917f-4159-8791-f1c3818dc206 Task timed out after 1.00 seconds\n\n']
  if(messageArray.length === 1) {
    const [timestamp, _, ...errorMessage] = messageArray[0].split(' ');
    return {
      timestamp,
      errorType: 'Timeout',
      errorMessage: errorMessage.join(' '),
    }
  }

  // console.error
  // [
  //     '2020-09-06T13:02:05.184Z',
  //     '466e6c7a-8cbf-4e53-bbf2-3409486f4b59',
  //     'ERROR',
  //     'THIS IS A CONSOLE ERROR TYPE\n'
  // ]
  return {
    timestamp: messageArray[0],
    errorType: 'console.error()',
    errorMessage: tryJsonFormatMessage(messageArray[3]),
  }
}

function tryJsonFormatMessage(string) {
  try {
    return JSON.stringify(JSON.parse(string), null, 2);
  } catch {
    return string;
  }
}
