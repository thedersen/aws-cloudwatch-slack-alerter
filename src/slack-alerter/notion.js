import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_KEY })

async function addPage(clientId, name) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_TASKS_DB },
      properties: {
        Name: {
          title:[
            {
              text: {
                content: name
              }
            }
          ]
        },
        Client: {
          relation: [
            {
              id: clientId
            },
          ]
        },
        Tags: {
          multi_select: [
            {
              name: 'Bug',
              color: 'red',
            },
            {
              name: 'Web',
            },
          ]
        },
        Status: {
          select: {
            name: 'Next Up',
          },
        }
      },
    })
    return response;
  } catch (error) {
    console.error(error.body)
  }
}


async function getPage(clientID, name) {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_TASKS_DB,
      filter: {
        and: [{
          property: 'Client',
          relation: {
            contains: clientID,
          }
        }, {
          property: 'Name',
          rich_text: {
            contains: name

          }
        }, {
          property: 'Status',
          select: {
            does_not_equal: 'Completed'
          }
        }]
      },
    });

    return response.results[0];
  } catch (error) {
    console.error(error.body)
  }
}

async function getClient(awsAccount) {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_CLIENTS_DB,
      filter: {
        property: 'AWS Account',
        rich_text: {
          equals: awsAccount,
        },
      },
    });

    return response.results[0];
  } catch (error) {
    console.error(error.body)
  }
}

async function getOrCreatePage(clientId, name) {
  const page = await getPage(clientId, name);

  if (page) {
    return page;
  }
  const newPage = await addPage(clientId, name);
  if (newPage) {
    return newPage;
  }
}

async function appendBlock(pageId, timestampFormatted, code, logGroup, logGroupUrl) {
  try {
    const response = await notion.blocks.children.append({
      database_id: process.env.NOTION_TASKS_DB,
      block_id: pageId,
      children: [{
        type: 'toggle',
        toggle: {
          rich_text: [{
            type: 'text',
            text: {
              content: timestampFormatted,
            },
          }],
          children:[{
            type: 'code',
            code: {
              rich_text: [{
                type: 'text',
                text: {
                  content: code
                }
              }],
              language: 'javascript',
              caption: [{
                text: {
                  content: logGroup,
                  link: {
                    url: logGroupUrl,
                  },
                },
              }]
            },
          }]
        }
      }]
    });

    return response.results[0];
  } catch (error) {
    console.error(error.body)
  }
}

export async function postToNotion(events) {
  try {
    const {account} = events[0];
    const client = await getClient(account);
    if (!client) {
      return;
    }

    for (const event of events) {
      const {errorType, functionName, timestampFormatted, errorMessage, logGroup, logGroupUrl, region} = event;
      if (errorType === 'ALERT') {
        continue;
      }

      const page = await getOrCreatePage(client.id, `${errorType} in ${functionName} (${region})`);
      if (page) {
        await appendBlock(page.id, timestampFormatted, errorMessage, logGroup, logGroupUrl);
      }
    }
  } catch (err) {
    console.error(err);
  }
}
