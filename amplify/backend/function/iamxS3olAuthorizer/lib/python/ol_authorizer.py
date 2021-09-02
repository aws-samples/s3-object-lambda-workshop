# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of
# this software and associated documentation files (the "Software"), to deal in
# the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
# the Software, and to permit persons to whom the Software is furnished to do so.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
# COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
# IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#
# Author: Rafael M. Koike - koiker@amazon.com
import boto3
import json
import os
import logging
import re
from botocore.exceptions import ClientError
from typing import Union

logger = logging.getLogger('IAM-X_Authorizer')
logger.addHandler(logging.StreamHandler())
logger.setLevel(getattr(logging, os.getenv('LOG_LEVEL', 'INFO')))
dynamodb = boto3.resource('dynamodb')
ENV = os.getenv('ENV')
TABLE_NAME = 's3policy'
OBJECT_PATTERN = re.compile(r'(https://[a-zA-Z0-9-].+\.s3-object-lambda\.[a-zA-Z0-9-].+-\d\.amazonaws\.com\/)(.+)')

if not ENV:
    logger.critical('Unable to get the ENV to compose the dynamodb table name')
    exit(os.EX_DATAERR)

table = dynamodb.Table(f'{TABLE_NAME}-{ENV}')


def get_policies() -> list:
    # This function scan the DynamoDB table as an example.
    # Optimized functions will use caching and query only the policies related to the service and resource
    # To reduce resource consumption we retrieve only the policy document
    # TODO: Implement pagination as now we return up to 1MB of policies per request
    try:
        resp = table.scan(AttributesToGet=['policy_document'])
    except ClientError as e:
        logger.debug('Unable to retrieve DynamoDB items')
        logger.exception(e)
        resp = {'Items': []}
    return resp.get('Items', [])


def get_identity(user_identity: dict) -> (str, Union[str, None]):
    identity = 'anonymous'
    user_type = user_identity.get('type')
    account_id = user_identity.get('accountId')
    if user_type == 'Role':
        identity = user_identity.get('sessionContext', {}).get('sessionIssuer')  # TODO: Add other attributes
    elif user_type == 'IAMUser':
        identity = user_identity.get('arn')
    return identity, account_id


def match_resource(requested_resource: str, resource: Union[str, list]) -> bool:
    resources = resource
    if isinstance(resource, str):
        resources = [resource]
    for item in resources:
        if item[-1] == '*':
            # Replace wildcard with regex expression .+
            resource_pattern = f'({item[:-1]}.+)'
            if '*' in resource_pattern:
                logger.debug('Unexpected wildcard in the resource name')
        else:
            resource_pattern = f'({item})'
        search_resource = re.compile(resource_pattern)
        if search_resource.match(requested_resource):
            return True
    return False


def match_principal(identity: str, account_id: str, principal: Union[str, list]) -> bool:
    root = f'arn:aws:iam::{account_id}:root'
    if isinstance(principal, list):
        for item in principal:
            if item == '*' or identity == item or account_id == item or root == item:
                return True  # TODO: Optimize to find * early and return instead of iterating over all items
    elif principal == '*' or identity == principal or account_id == principal or root == principal:
        return True
    return False


def validate_request(request: dict) -> (str, dict):
    effect = 'Deny'  # implicit Deny
    attrs = {'Evaluation': 'Implicit'}
    logger.debug(f'Request: {request}')
    user_request = request.get('userRequest', {})
    user_identity = request.get('userIdentity', {})
    identity, account_id = get_identity(user_identity)
    requested_resource = user_request.get('url')
    if not requested_resource or not identity:
        logger.debug('Unable to process. Missing required request parameters')
        logger.debug(f'Requested resource: {requested_resource}')
        logger.debug(f'Requester: {identity}')
        return effect, attrs
    ap_arn = request.get('configuration', {}).get('accessPointArn')
    object_key = OBJECT_PATTERN.match(requested_resource)[2]
    requested_resource = f'{ap_arn}/{object_key}'
    requested_action = 's3lambda:GetObject'  # TODO: Implement logic to receive action from the request.
    policies = get_policies()
    # TODO: Instead of looping through all policies, we should just get the policy attached to resource
    # Implementing a policy attachment to S3 Object Lambda Access points will be much faster than getting all items
    # The current implementation could match multiple policies with Allow, just the first will be used.
    for policy in policies:
        statements = policy['policy_document']['Statement']
        if isinstance(statements, dict):
            statements = [statements]
        for statement in statements:
            if (match_resource(requested_resource, statement['Resource']) and
                    match_principal(identity, account_id, statement['Principal'])):
                effect = statement['Effect']
                attrs = statement.get('Condition', {})
                logger.debug(f'Found a match. Effect is: {effect}')
                if effect == 'Deny':
                    attrs = {'Evaluation': 'Explicit'}
                    return effect, attrs
    return effect, attrs


# Local testing
if __name__ == '__main__':
    try:
        event = json.loads(open('event2.json', 'r').read())
    except Exception as e:
        logger.debug('Error opening the event file')
        logger.exception(e)
        event = {}
    result, extras = validate_request(event)
    print(f'Effect: {result}')
    print(f'Extras: {extras}')
