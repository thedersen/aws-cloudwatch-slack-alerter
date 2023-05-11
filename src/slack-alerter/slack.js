
function toSlackFormat(events) {
  const blocks = events.flatMap(e => {
    const {timestamp, errorType, errorMessage, emoji} = e;
    return [{
      type: 'section',
      fields: [{
        type: 'mrkdwn',
        text: `Timestamp:\n*${timestamp.replace('T', ' ').replace('Z', ' UTC')}*`
      },{
        type: 'mrkdwn',
        text: `Alert Type:\n*${emoji} ${errorType}*`
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
  });

  const {
    errorType,
    functionName,
    logGroupUrl,
    logGroup,
    application,
    functionLogicalId,
    account,
    region
  } = events[0];
  return {
    text: `${errorType} in ${functionName}`,
    blocks: [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Log Group:\n*<${logGroupUrl}|${logGroup}>*`
      }
    },{
      type: 'section',
      fields: [{
        type: 'mrkdwn',
        text: `Application:\n*${application}*`
      },{
        type: 'mrkdwn',
        text: `Lambda:\n*${functionLogicalId}*`
      }]
    },{
      type: 'section',
      fields: [{
        type: 'mrkdwn',
        text: `Account:\n*${account}*`
      },{
        type: 'mrkdwn',
        text: `Region:\n*${region}*`
      }]
    }, ...blocks]
  };
}

export async function postToSlack(event) {
  try {
    const body = toSlackFormat(event);
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(await response.text());
    }
  } catch(err) {
    console.error(err);
  }
}
