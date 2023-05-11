# Slack CloudWatch Alerter

Monitor AWS Lambda errors and send alerts to a specified Slack channel.

## Resources
### Subscriber
The subscriber lambda is invoked any time a new log group is created. If the name of the log group matches the specified regex (default `.*[Pp]roduction.*`), it creates a new log subscription filter with the `Alerter` lambda as destination. The filter includes all unhandled exceptions, timeouts and any message logged with `console.error()` or `console.log('ALERT\t', ...)`.


### Alerter
The alerter lambda is invoked by CloudWatch Logs when an error is logged. It parses the log event and posts the error to the specified Slack webhook.

## Deployment

1. Create a new Slack App and enable incoming webhooks (https://api.slack.com/messaging/webhooks)
2. Deploy using `sam deploy --guided`
3. Enter the webhook URL created in step 1 when prompted

If you have existing log groups you want to add the subscription filter to, run the `init-account-alerting.js` script with the `AlerterArn` outputted by sam deploy:

```
$ node init-account-alerting.js arn:aws:lambda:eu-central-1:xxxxxx:function:SlackAlerter
```

## Credits

This is based on the work by [cplankey](https://github.com/cplankey/lambda-errors-to-slack) and code from [aws-samples](https://github.com/aws-samples/amazon-cloudwatch-log-centralizer).
