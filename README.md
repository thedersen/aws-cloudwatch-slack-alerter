# Slack CloudWatch Alerter

Monitor AWS Lambda errors and send alerts to a specified slack channel.

Adds a subscription filter to all log groups with 'Production' in the name at the creation of the log group. Subscribes to all unhandled exceptions, timeouts and any message logged with `console.error()`.


## Resources
### Subscriber
The subscriber lambda is invoked any time a new log group is created. If the name of the log group contains `production`, it creates a new log subscription to the `Alerter` lambda.

### Alerter
This lambda is invoked by Cloudwatch Logs when an error is logged. It parses the log event and posts the error to the specified Slack webhook.

## Deployment

1. Create a new Slack App and enable incoming webhooks (https://api.slack.com/messaging/webhooks)
2. Deploy using `sam deploy --guided`
3. Enter the webhook URL created in step 1 when prompted

If you have existing log groups you want to add subscription filter to, run the `init_account_alerting.py` script with the AlerterArn outputted by sam deploy

```
$ python3 src/init_account_alerting.py --destination arn:aws:lambda:eu-central-1:xxxxxx:function:SlackAlerter
```

## Credits

This is based on the work by [cplankey](https://github.com/cplankey/lambda-errors-to-slack) and code from [aws-samples](https://github.com/aws-samples/amazon-cloudwatch-log-centralizer).
