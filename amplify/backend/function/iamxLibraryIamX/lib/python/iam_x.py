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
import re
from pydantic import BaseModel, Field, StrictStr, validator
from typing import (
    List, Optional, Union
)

VALID_VERSION = '2021-08-24'
VALID_EFFECT = ['Allow', 'Deny']
VALID_ACTION = ['s3lambda:GetObject']
VALID_RESOURCE = r"(arn):(aws|aws-cn|aws-us-gov):(s3|s3-object-lambda):([a-z0-9-]*):([0-9]{0,12}):([a-zA-Z0-9\.\/!-_\*\(\)']+)"
VALID_PRINCIPAL = r"^([*]|" \
                  r"[0-9]{12}|" \
                  r"arn:aws:iam::[0-9]{12}:root|" \
                  r"arn:aws:iam::[0-9]{12}:user\/[a-zA-Z0-9-_]+|" \
                  r"arn:aws:iam::[0-9]{12}:role\/[a-zA-Z0-9-+\/]+)"
EXCLUSIVE_CONDITION_KEYS = ['RemoveData', 'RemoveColumn', 'AnonymizeData']
resource_pattern = re.compile(VALID_RESOURCE)
principal_pattern = re.compile(VALID_PRINCIPAL)


class IamConditionModel(BaseModel):
    class Config:
        """
        Enforce only declared types to be allowed.
        https://pydantic-docs.helpmanual.io/usage/model_config/
        """
        extra = 'forbid'
    remove_data: Optional[StrictStr] = Field(alias='RemoveData')
    remove_column: Optional[StrictStr] = Field(alias='RemoveColumn')
    anonymize_data: Optional[StrictStr] = Field(alias='AnonymizeData')
    audit_request: Optional[StrictStr] = Field(alias='AuditRequest')

    @validator('*', pre=False)
    def condition_key_validator(cls, value):
        return value


class StatementModel(BaseModel):
    class Config:
        """
        Enforce only declared types to be allowed.
        https://pydantic-docs.helpmanual.io/usage/model_config/
        """
        extra = 'forbid'

    effect: StrictStr = Field(..., alias='Effect')
    action: Union[StrictStr, List[StrictStr]] = Field(..., alias='Action')
    resource: Union[StrictStr, List[StrictStr]] = Field(..., alias='Resource')
    principal: Union[StrictStr, List[StrictStr]] = Field(..., alias='Principal')
    condition: Union[IamConditionModel, List[IamConditionModel]] = Field(..., alias='Condition')

    @validator('effect')
    def validate_effect(cls, value):
        if value not in VALID_EFFECT:
            raise ValueError(f'Invalid Effect. Must be {VALID_EFFECT}')
        return value

    @validator('action')
    def validate_action(cls, value):
        if value not in VALID_ACTION:
            raise ValueError(f'Invalid Action. Must be {VALID_ACTION}')
        return value

    @validator('resource')
    def validate_resource(cls, value):
        if resource_pattern.match(value):
            return value
        else:
            raise ValueError(f'Invalid Resource. Must match {VALID_RESOURCE}')

    @validator('principal')
    def validate_principal(cls, value):
        if principal_pattern.match(value):
            return value
        else:
            raise ValueError(f'Invalid Principal. Must match {VALID_PRINCIPAL}')

    @validator('condition')
    def condition_key_validator(cls, value):
        if isinstance(value, List):
            count = 0
            for item in value:
                condition_statement = item.dict(by_alias=True, exclude_none=True)
                for k, v in condition_statement.items():
                    if k in EXCLUSIVE_CONDITION_KEYS:
                        count += 1
            if count > 1:
                raise ValueError(f'Invalid condition statement. Must be one of {EXCLUSIVE_CONDITION_KEYS}')
            if count < 1:
                raise ValueError('Must contain at least one condition match')
        return value


class IamX(BaseModel):
    version: StrictStr = Field(..., alias='Version')
    id: Optional[StrictStr] = Field(alias='Id')
    statement: Union[StatementModel, List[StatementModel]] = Field(..., alias='Statement')

    @validator('version')
    def validate_version(cls, value):
        if not value == VALID_VERSION:
            raise ValueError('Invalid Version Id')
        return value
