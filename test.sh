mkdir test
touch test/alert.json
touch test/console.json
touch test/exception.json
touch test/timeout.json

aws lambda invoke --function-name SlackAlerter-SlackAlerterTesterProduction --payload '{ "test": "console" }' --cli-binary-format raw-in-base64-out test/console.json
aws lambda invoke --function-name SlackAlerter-SlackAlerterTesterProduction --payload '{ "test": "alert" }' --cli-binary-format raw-in-base64-out test/alert.json
aws lambda invoke --function-name SlackAlerter-SlackAlerterTesterProduction --payload '{ "test": "exception" }' --cli-binary-format raw-in-base64-out test/exception.json
aws lambda invoke --function-name SlackAlerter-SlackAlerterTesterProduction --payload '{ "test": "timeout" }' --cli-binary-format raw-in-base64-out test/timeout.json
