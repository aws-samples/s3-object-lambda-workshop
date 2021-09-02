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
import logging
import os
import uuid
import re

from botocore.exceptions import ClientError
from datetime import datetime, timezone
from enum import Enum
from iam_x import IamX
from pydantic import ValidationError
from typing import Optional, Union

logger = logging.getLogger('IAM-X')
logger.setLevel(getattr(logging, os.getenv('LOG_LEVEL', 'INFO')))
dynamodb = boto3.resource('dynamodb')
ENV = os.getenv('ENV')
TABLE_NAME = 's3policy'
POLICY_NAME_REGEX = r"^([a-zA-Z0-9_-]+)$"
POLICY_NAME_MAX_SIZE = 256


class ApiActions(Enum):
    CREATE = 1
    UPDATE = 2
    DELETE = 3
    LIST = 4


API_ACTIONS = (
    (ApiActions.CREATE, 'POST'),
    (ApiActions.UPDATE, 'PUT'),
    (ApiActions.DELETE, 'DELETE'),
    (ApiActions.LIST, 'GET')
)
if not ENV:
    logger.critical('Unable to get the ENV to compose the dynamodb table name')
    exit(os.EX_DATAERR)

table = dynamodb.Table(f'{TABLE_NAME}-{ENV}')


def api_response(msg, code: int, context: object, headers: Optional[dict] = None):
    if not headers:
        headers = {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT,GET,DELETE',
            'Content-Type': 'application/json'
        }
    if code > 299 and not headers.get('X-Amzn-ErrorType'):
        headers['X-Amzn-ErrorType'] = 'ApiError'
    response = {
        'statusCode': code,
        'headers': headers,
        'body': json.dumps({'message': json.dumps(msg), 'requestId': context.aws_request_id})
    }
    logger.debug(f'Response: {response}')
    return response


class PolicyError(Exception):
    def __init__(self, msg, code, context):
        self.msg = msg
        self.code = code
        self.context = context
        self.message = api_response(msg, code, context)
        self._msg = f'API error: {msg}'
        super().__init__(self._msg)

    def __str__(self) -> str:
        return json.dumps(self.message)

    @property
    def api_response(self) -> dict:
        return self.message


def parse_policy_error(msg: list):
    return f'{msg[0]["loc"]} -> {msg[0]["msg"]}'


def validate_policy(document, context) -> dict:
    try:
        logger.debug('Validating policy document')
        policy = json.loads(document.get('policy_document', {}))
        policy = IamX(**policy)
        policy_name = document.get('policy_name')

    except ValidationError as e:
        logger.debug(f'Error validating the policy document')
        logger.exception(e)
        raise

    except TypeError as e:
        logger.debug(f'Error')
        logger.exception(e)
        raise

    if not policy_name:
        logger.debug('Missing policy name')
        raise PolicyError('Missing policy name', 400, context)
    if len(policy_name) > POLICY_NAME_MAX_SIZE:
        logger.debug('Policy name exceed max size')
        raise PolicyError(f'Policy name max size is {POLICY_NAME_MAX_SIZE}', 400, context)
    if not re.match(POLICY_NAME_REGEX, policy_name):
        logger.debug('Invalid policy name')
        raise PolicyError(f'Invalid policy name. Allowed: [{POLICY_NAME_REGEX}]', 400, context)
    return policy.dict(by_alias=True, exclude_none=True)


def get_policy_params(payload, context):
    try:
        if isinstance(payload, dict):
            parameters = payload
        else:
            parameters = json.loads(payload)
        return parameters.get('id'), parameters.get('policy_name')
    except json.decoder.JSONDecodeError as e:
        logger.debug(f'Error loading the document data')
        logger.exception(e)
        raise PolicyError('Invalid parameter format', 400, context) from json.decoder.JSONDecodeError


def create_policy(payload: str, context: object) -> dict:
    try:
        document = json.loads(payload)
        policy_document = validate_policy(document, context)
        policy_name = document.get('policy_name')
        policy_description = document.get('policy_description')

        logger.debug(f'Policy Name: {policy_name}')
        logger.debug(f'Policy Description: {policy_description}')
        logger.debug(f'Policy Document: {policy_document}')
        creation_date = str(datetime.now(timezone.utc).timestamp() * 1000)

        new_policy = {
            'id': str(uuid.uuid4()),
            'policy_name': policy_name,
            'policy_description': policy_description,
            'policy_document': policy_document,
            'creation_date': creation_date,
            'last_modified': creation_date

        }
        response = table.put_item(Item=new_policy)
        logger.debug(f'DynamoDB response {response}')
    except ClientError as e:
        logger.debug(f'Error in DynamoDB put_item: {e}')
        return api_response('Internal error', 400, context)
    except PolicyError as e:
        logger.exception(e)
        return e.api_response
    except TypeError:
        return api_response('Type error', 400, context)
    except ValidationError as e:
        msg = parse_policy_error(e.errors())
        logger.exception(msg)
        return api_response(msg, 400, context)
    except json.decoder.JSONDecodeError as e:
        logger.debug(f'Error loading the document data')
        logger.exception(e)
        raise PolicyError(e, 400, context)

    return api_response({'Attributes': new_policy}, 200, context)


def update_policy(payload: str, context: object) -> dict:
    try:
        policy_id, policy_name = get_policy_params(payload, context)
        document = json.loads(payload)
        policy_document = validate_policy(document, context)
        policy_description = document.get('policy_description')
        table.update_item(
            Key={
                'id': policy_id,
                'policy_name': policy_name
            },
            UpdateExpression="set policy_description=:e, policy_document=:d",
            ExpressionAttributeValues={
                ':e': policy_description,
                ':d': policy_document
            },
            ReturnValues="UPDATED_NEW"
        )
        return api_response(payload, 200, context)
    except ClientError as e:
        logger.debug(f'Error in DynamoDB update_item: {e}')
        return api_response('Internal error', 400, context)
    except PolicyError as e:
        logger.exception(e)
        return e.api_response
    except TypeError:
        return api_response('Type error', 400, context)
    except ValidationError as e:
        msg = parse_policy_error(e.errors())
        logger.exception(msg)
        return api_response(msg, 400, context)


def delete_policy(payload: dict, context: object) -> dict:
    logger.debug(f'Payload received: {payload}')
    try:
        policy_id, policy_name = get_policy_params(payload, context)
    except PolicyError as e:
        logger.exception(e)
        return e.api_response
    if not policy_id or not policy_name:
        return api_response('Missing policy Id and/or policy_name', 400, context)
    try:
        table.delete_item(Key={'id': policy_id, 'policy_name': policy_name})
    except ClientError as e:
        logger.debug(f'ClientError: {e.response["Error"]["Message"]}')
        return api_response(f'Unable to delete Policy ID: {policy_id}', 400, context)

    return api_response(payload, 200, context)


def list_policies(payload: str, context: object) -> dict:

    logger.debug(payload)
    if payload:
        try:
            policy_id, policy_name = get_policy_params(payload, context)
        except PolicyError as e:
            logger.exception(e)
            return e.api_response

        if not policy_id or not policy_name:
            if not policy_id:
                return api_response(f'Missing Policy Id', 400, context)
            if not policy_name:
                return api_response(f'Missing Policy name', 400, context)
        response = table.get_item(Key={'id': policy_id, 'policy_name': policy_name})
        return api_response(response['Item'], 200, context)
    else:
        response = table.scan(ProjectionExpression='id, policy_name, policy_description, creation_date, last_modified')
        return api_response(response['Items'], 200, context)


def not_implemented(context) -> dict:
    return api_response('API Method not implemented', 501, context)


def handler(event: dict, context: object) -> dict:
    logger.debug(f'received event: {event}')
    http_method = event.get('httpMethod')
    api_action = None
    for v, s in API_ACTIONS:
        if http_method == s:
            api_action = API_ACTIONS[v.value - 1][0]

    payload: str = event['body']
    if api_action == ApiActions.CREATE:
        logger.debug('Create API action')
        return create_policy(payload, context)
    elif api_action == ApiActions.UPDATE:
        logger.debug('Update API action')
        return update_policy(payload, context)
    elif api_action == ApiActions.DELETE:
        logger.debug('Delete API action')
        payload: dict = event['queryStringParameters']
        return delete_policy(payload, context)
    elif api_action == ApiActions.LIST:
        payload = event['queryStringParameters']
        logger.debug('List API action')
        return list_policies(payload, context)
    logger.error('API Action not implemented')
    return not_implemented(context)


if __name__ == '__main__':
    mock_context = {}
    mock_event = json.load(open('event.json', 'r'))
    print(handler(mock_event, mock_context))
