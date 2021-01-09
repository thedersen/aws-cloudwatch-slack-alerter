aws lambda invoke --function-name SlackAlerterTestProduction --payload '{ "test": "console" }' --cli-binary-format raw-in-base64-out test/console.json
aws lambda invoke --function-name SlackAlerterTestProduction --payload '{ "test": "exception" }' --cli-binary-format raw-in-base64-out test/exception.json
aws lambda invoke --function-name SlackAlerterTestProduction --payload '{ "test": "timeout" }' --cli-binary-format raw-in-base64-out test/timeout.json
