#!/usr/bin/env python

# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

from __future__ import print_function, absolute_import
import boto3

log_client = boto3.client('logs')
ssm_client = boto3.client('ssm')

def add_subscriptions_to_existing_log_groups(destination_arn):
    # Retrieve all of the existing log groups
    log_group_response = log_client.describe_log_groups()

    # Loop over multiple calls to describe_log_groups() as necessary using the next token
    while True:
        # If there are log groups, iterate over each one, retrieve its name, and call code to add the subscription to it
        if log_group_response:

            for log_group in log_group_response['logGroups']:
                log_group_name = log_group['logGroupName']
                if 'production' in log_group_name.lower():
                  print(log_group_name, destination_arn)
                  add_subscription_filter(log_group_name, destination_arn)

            if 'nextToken' in log_group_response:
                log_groups_next_token = log_group_response['nextToken']

                if log_groups_next_token:
                    log_group_response = log_client.describe_log_groups(nextToken=log_groups_next_token)
                else:
                    break

            else:
                break

# Add subscription to centralized logging to the log group with log_group_name
def add_subscription_filter(log_group_name, destination_arn):
    # Error to try to add subscription if one already exists, so delete any existing subscription from this log group
    delete_existing_subscription_filter(log_group_name)

    # Put the new subscription with the destination onto the log group
    log_client.put_subscription_filter(
        logGroupName=log_group_name,
        filterName='SlackAlerter',
        filterPattern='?"Error: Runtime exited" ?"Task timed out after" ?"\tERROR\t" ?"\\"level\\":\\"error\\""',
        destinationArn=destination_arn
    )

# Delete an existing subscription from the log group
def delete_existing_subscription_filter(log_group_name):
    # Retrieve any existing subscription filters (only can be one)
    subscription_filters = log_client.describe_subscription_filters(
        logGroupName=log_group_name
    )

    # Iterate over results if there are any (again, should not be multiple, but to follow the convention of the SDK)
    for subscription_filter in subscription_filters['subscriptionFilters']:
        # Retrieve the subscription filter name to use in the call to delete
        filter_name = subscription_filter['filterName']

        # Delete any subscriptions that are found on the log group
        log_client.delete_subscription_filter(
            logGroupName=log_group_name,
            filterName=filter_name
        )

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("-d", "--destination", help="logs:destination ARN to send logs to")

    args = parser.parse_args()
    if args.destination:
        add_subscriptions_to_existing_log_groups(args.destination)
    else:
        parser.print_help()
        raise ValueError('Must provide LogDestination ARN. See help')
