const https = require('https');
const util = require('util');
const zlib = require('zlib');
const JSON5 = require('json5');
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
        text: `Timestamp:\n*${timestamp.replace('T', ' ').replace('Z', ' UTC')}*`
      },{
        type: 'mrkdwn',
        text: `Error Type:\n*${errorType}*`
      }]
    }, {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`\n${errorMessage.substring(0, 2990)}\n\`\`\``, // Max 3000 chars in a Slack block
      }
    }, {
			type: 'divider'
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

function logGroupUrl(logGroup, logStream, region) {
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${encodeURIComponent(encodeURIComponent(logGroup))}/log-events/${encodeURIComponent(encodeURIComponent(logStream))}`
}

function getEventData(logEvent) {
  const messageArray = logEvent.message.trim().split('\t');
  // Unhandled exception
  // [
  // '2021-01-09T20:56:33.421Z',
  // '43871784-d045-449f-b91b-d0e26c865485',
  // 'ERROR',
  // 'Invoke Error ',
  // '{"errorType": "ReferenceError", "errorMessage": "x is not defined", "stack": [ "ReferenceError: x is not defined", "    at Runtime.exports.handler (/var/task/lambda.js:13:5)", "    at Runtime.handleOnce (/var/runtime/Runtime.js:66:25)"]}'
  // ]
  if(messageArray.length === 5) {
    return {
      timestamp: messageArray[0],
      errorType: messageArray[3].trim(),
      errorMessage: tryJsonFormatMessage(messageArray[4]),
    }
  }
  // Timeout
  // ['2021-01-09T20:56:36.472Z 5d01b916-f8b8-4c27-9457-24cdc7e51813 Task timed out after 2.00 seconds']
  if(messageArray.length === 1) {
    const [timestamp, _, ...errorMessage] = messageArray[0].split(' ');
    return {
      timestamp,
      errorType: 'Timeout',
      errorMessage: errorMessage.join(' ').trim(),
    }
  }

  // console.error
  // [
  //   '2021-01-09T20:56:32.120Z',
  //   'c5dc7d60-0654-42cd-98b0-c50ef5108925',
  //   'ERROR',
  //   "{ test: 'console' }"
  // ]
  return {
    timestamp: messageArray[0],
    errorType: 'console.error()',
    errorMessage: tryJsonFormatMessage(messageArray[3]),
  }
}

// When console.error({test: 'console'}) it is logged as "{ test: 'console' }"
// Not valid JSON, but valid JSON5
function tryJsonFormatMessage(string) {
  try {
    return JSON5.stringify(JSON5.parse(string), null, 2);
  } catch {
    return string;
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
