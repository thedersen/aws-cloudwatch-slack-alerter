import JSON5 from 'json5';
import { gunzipSync } from 'zlib';
import { postToSlack } from './slack.js';
import { postToNotion} from './notion.js';

export async function handler(event)  {
  const payload = Buffer.from(event.awslogs.data, 'base64');
  const gunzipped = gunzipSync(payload).toString('utf8');
  const eventDetails = JSON.parse(gunzipped);

  const events = getEvents(eventDetails);

  await Promise.all([
    postToNotion(events),
    postToSlack(events)
  ]);
}

function getEvents(eventDetails) {
  const {owner, logGroup, logStream, logEvents} = eventDetails;
  const region = process.env.AWS_REGION;
  const functionName = logGroup.split('/').pop();
  const [application, functionLogicalId] = functionName.split('-');
  const logGroupUrl = getLogGroupUrl(logGroup, logStream, region);

  return logEvents.flatMap(e => {
    const {timestamp, errorType, errorMessage, emoji} = getEventData(e);

    return {
      timestamp,
      timestampFormatted: formatDate(timestamp),
      account: owner,
      functionName,
      application,
      functionLogicalId,
      region,
      errorType,
      errorMessage,
      emoji,
      logGroup,
      logGroupUrl,
    }
  });
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
  // OR
  // Alerts
  // [
  // '2021-01-09T20:56:33.421Z',
  // '43871784-d045-449f-b91b-d0e26c865485',
  // 'INFO',
  // 'ALERT',
  // 'Something nice happened:)'
  // ]
  if(messageArray.length === 5) {
    return {
      timestamp: messageArray[0],
      errorType: messageArray[3].trim(),
      errorMessage: tryJsonFormatMessage(messageArray[4]),
      emoji: messageArray[2] === 'INFO' ? ':grey_exclamation:' : ':bangbang:',
    }
  }
  // Timeout
  // ['2021-01-09T20:56:36.472Z 5d01b916-f8b8-4c27-9457-24cdc7e51813 Task timed out after 2.00 seconds']
  if(messageArray.length === 1) {
    const [timestamp, id, ...errorMessage] = messageArray[0].split(' ');
    return {
      timestamp,
      errorType: 'Timeout',
      errorMessage: errorMessage.join(' ').trim(),
      emoji: ':bangbang:',
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
    emoji: ':bangbang:',
  }
}

// When console.error({test: 'console'}) it is logged as "{ test: 'console' }"
// Not valid JSON, but valid JSON5
function tryJsonFormatMessage(string) {
  try {
    return JSON5.stringify(JSON5.parse(string), null, 2);
  } catch {
    return string.trim();
  }
}

function getLogGroupUrl(logGroup, logStream, region) {
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${encodeURIComponent(encodeURIComponent(logGroup))}/log-events/${encodeURIComponent(encodeURIComponent(logStream))}`
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const optionsDate = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Oslo',
  };
  const optionsTime = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Oslo',
    timeZoneName: 'short'
  };

  // Only way to get the format YYYY-MM-DD hh:mm:ss GMT+2 as far as I know...
  const datePart = Intl.DateTimeFormat('sv-SE', optionsDate).format(date);
  const timePart = Intl.DateTimeFormat('en-US', optionsTime).format(date);

  return `${datePart} ${timePart}`;
}
