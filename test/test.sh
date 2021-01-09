aws lambda invoke --function-name SlackAlerterTestProduction --payload '{ "test": "console" }' --cli-binary-format raw-in-base64-out console.json
aws lambda invoke --function-name SlackAlerterTestProduction --payload '{ "test": "exception" }' --cli-binary-format raw-in-base64-out exception.json
aws lambda invoke --function-name SlackAlerterTestProduction --payload '{ "test": "timeout" }' --cli-binary-format raw-in-base64-out timeout.json
