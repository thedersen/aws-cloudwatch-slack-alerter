import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeSubscriptionFiltersCommand,
  DeleteSubscriptionFilterCommand,
  PutSubscriptionFilterCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const logClient = new CloudWatchLogsClient({ region: 'eu-central-1' });

async function addSubscriptionsToExistingLogGroups(destinationArn) {
  try {
    let nextToken;
    do {
      const { logGroups, nextToken: token } = await logClient.send(new DescribeLogGroupsCommand({ nextToken }));
      nextToken = token;
      for (const { logGroupName } of logGroups) {
        if (logGroupName.toLowerCase().includes('production')) {
          console.log(logGroupName);
          await addSubscriptionFilter(logGroupName, destinationArn);
        }
      }
    } while (nextToken);
  } catch (error) {
    console.error(error);
  }
}

async function addSubscriptionFilter(logGroupName, destinationArn) {
  await deleteExistingSubscriptionFilter(logGroupName);
  await logClient.send(new PutSubscriptionFilterCommand({
    logGroupName,
    filterName: 'SlackAlerter',
    filterPattern: '?"Error: Runtime exited" ?"Task timed out after" ?"\tERROR\t" ?"\\"level\\":\\"error\\"" ?"\tINFO\tALERT\t"',
    destinationArn
  }));
}

async function deleteExistingSubscriptionFilter(logGroupName) {
  try {
    const { subscriptionFilters } = await logClient.send(new DescribeSubscriptionFiltersCommand({ logGroupName }));
    for (const { filterName } of subscriptionFilters) {
      await logClient.send(new DeleteSubscriptionFilterCommand({ logGroupName, filterName }));
    }
  } catch (error) {
    console.error(error);
  }
}

const args = process.argv.slice(2);
if (args.length === 1) {
  await addSubscriptionsToExistingLogGroups(args[0]);
} else {
  console.log('Must provide LogDestination ARN. See help');
}
