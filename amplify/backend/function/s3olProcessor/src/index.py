import boto3
import logging
import os
import urllib3
import pandas as pd
import sys
import gc
from io import StringIO
from ol_authorizer import validate_request

_THIS_MODULE = sys.modules[__name__]
logger = logging.getLogger('IAM-X_Authorizer')
logger.addHandler(logging.StreamHandler())
logger.setLevel(getattr(logging, os.getenv('LOG_LEVEL', 'INFO')))
s3 = boto3.client('s3')


def handler(event, context):
    effect, attrs = validate_request(event)
    effect_handler = getattr(
        _THIS_MODULE,
        f'handle_effect_{effect.lower()}',
        handle_effect_noop
    )
    return effect_handler(event, attrs)


def handle_effect_noop(event, attrs):
    s3.write_get_object_response(
        RequestRoute=event["getObjectContext"]["outputRoute"],
        RequestToken=event["getObjectContext"]["outputToken"],
        StatusCode=401,
        ErrorCode="AccessDenied",
        ErrorMessage='Implicit denied. Unable to process authorization request'
    )
    return {'statusCode': 202}


def handle_effect_allow(event, attrs):
    http = urllib3.PoolManager()
    s3_url = event["getObjectContext"]["inputS3Url"]
    logger.debug(f'Authorizer effect: Allow, attributes: {attrs}')
    # Get object from S3
    response = http.request('GET', s3_url)
    # Load the original object into a Pandas DataFrame
    # TODO: Check the original object type: csv, parquet, json. and use the correct loader
    df = pd.read_csv(StringIO(response.data.decode('utf-8')), header=0)
    fp = StringIO()
    transform_remove_data = attrs.get('RemoveData')  # eg: "key=value"
    transform_remove_column = attrs.get('RemoveColumn')  # eg: "key=value"
    transform_anonymize_data = attrs.get('AnonymizeData')  # eg: "key=value"
    logger.debug(
        f'got transform objects; '
        f'RemoveData={transform_remove_data!r};'
        f'RemoveColumn={transform_remove_data!r};'
        f'AnonymizeData={transform_remove_data!r};'
    )

    if transform_remove_data:
        k, v = transform_remove_data.split('=', 1)
        if k == 'column_name':
            # Remove data from column name
            df[v] = None
    if transform_remove_column:
        k, v = transform_remove_column.split('=', 1)
        if k == 'column_name':
            # Remove the column from the data
            df.pop(v)
    if transform_anonymize_data:
        k, v = transform_anonymize_data.split('=', 1)
        if k == 'column_name':
            # Replace the column data with ***
            df[v] = '***'
    # Audit object
    if msg := attrs.get('AuditRequest'):
        # TODO: Implement a full logging schema with meta-data from the requester and the transformed data
        logger.info(f'[AUDIT] Request to object {s3_url.split("?")[0]} logged. {msg}')

    if (transform_anonymize_data
            or transform_remove_data
            or transform_remove_column):
        df.to_csv(path_or_buf=fp, index=False)  # index=False to remove extra enum column added by pandas
        fp.seek(0)
        transformed_object = fp.read().encode()
    else:
        logger.debug(f'No condition found. Returning the object unchanged')
        transformed_object = response.data
    # Cleaning memory (Do we really need this? Maybe for Pandas dataframe. Need to benchmark to validate)
    del response
    del df
    del fp
    gc.collect()
    s3.write_get_object_response(
        Body=transformed_object,
        RequestRoute=event["getObjectContext"]["outputRoute"],
        RequestToken=event["getObjectContext"]["outputToken"])

    return {'statusCode': 200}


def handle_effect_deny(event, attrs):
    logger.debug(f'Authorizer effect: Deny, attributes: {attrs}')
    s3.write_get_object_response(
        RequestRoute=event["getObjectContext"]["outputRoute"],
        RequestToken=event["getObjectContext"]["outputToken"],
        StatusCode=403,
        ErrorCode="AccessDenied",
        ErrorMessage=f"S3 Object Lambda Policy {attrs.get('Evaluation')} denied")
    return {'statusCode': 200}
