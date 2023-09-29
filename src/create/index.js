// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
//
//     Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
//     Author: Rafael M. Koike - koiker@amazon.com
import React, {useEffect, useState} from "react";
import "ace-builds/webpack-resolver";
import {
    CodeEditor,
    FormField,
    Button,
    Box,
    SpaceBetween,
    Input,
    Textarea
} from "@cloudscape-design/components";
import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';
import {API} from "aws-amplify";
import {useNavigate} from "react-router-dom";
import {i18nStrings, readOnlyWithErrors} from '../common/code_i18n_strings';


function CreateForm({setNotifications}) {
    let navigate = useNavigate();
    const [ace, setAce] = useState(undefined);
    const [codeEditorLoading, setCodeEditorLoading] = useState(true);
    const [policyDocument, setPolicyDocument] = useState(readOnlyWithErrors ? '{ invalidJson }' : '');
    const [codeEditorPreferences, setCodeEditorPreferences] = useState(undefined);
    const [policyName, setPolicyName] = useState('');
    const [policyDescription, setPolicyDescription] = useState('');

    useEffect(() => {
        setCodeEditorLoading(true);
        async function loadAce() {
            const ace = await import('ace-builds');
            await import('ace-builds/webpack-resolver');
            ace.config.set('useStrictCSP', true);
            return ace;
        }

        loadAce()
            .then(ace => setAce(ace))
            .finally(() => setCodeEditorLoading(false));
    }, []);

    async function CreatePolicy(policy, description, document) {
        const data = {
            body: {
                policy_name: policy,
                policy_description: description,
                policy_document: document
            }
        }
        try {
            const apiResponse = await API.post('S3ObjectLambda', '/policy', data);
            console.log(apiResponse);
            navigate('/');
        } catch (e) {
            if (e.response.status === 400) {
                const uuid = window.crypto.randomUUID();
                setNotifications(notifications => [{
                        type: "error",
                        dismissible: true,
                        dismissLabel: "Dismiss message",
                        header: "Failed to create policy.",
                        content: `[${new Date().toISOString()}] [ERROR] ${e.response.data.message}`,
                        id: uuid,
                        onDismiss: () =>
                            setNotifications(items =>
                                items.filter(item => item.id !== uuid)
                            )
                    },
                        ...notifications,]
                );
                console.log(e.response.data);
            }
        }
    }


    const onCodeEditorChange = e => {
        !readOnlyWithErrors && setPolicyDocument(e.detail.value);
    };

    const onCodeEditorPreferencesChange = e => {
        !readOnlyWithErrors && setCodeEditorPreferences(e.detail);
    };
    return (
        <SpaceBetween direction="vertical" size="m">
            <FormField label="Policy Name">
                <Input
                    onChange={({detail}) => setPolicyName(detail.value)}
                    value={policyName}
                    autoFocus
                    placeholder="Enter policy name"
                />
            </FormField>
            <FormField label={
                <span>
                Policy Description <i>- optional</i>{" "}
                </span>
            }>
                <Textarea
                    onChange={({detail}) => setPolicyDescription(detail.value)}
                    value={policyDescription}
                    placeholder="Policy description"
                />
            </FormField>
            <FormField label="Policy Document" description="Create a policy for your S3 Object lambda."
                       stretch={true}>
                <CodeEditor
                    ace={ace}
                    value={policyDocument}
                    language="json"
                    onChange={onCodeEditorChange}
                    preferences={codeEditorPreferences}
                    onPreferencesChange={onCodeEditorPreferencesChange}
                    loading={codeEditorLoading}
                    i18nStrings={i18nStrings}
                />
            </FormField>
            <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                    <Button variant="link"
                            onClick={() => navigate("/")}>Cancel</Button>
                    <Button variant="primary"
                            onClick={() => CreatePolicy(policyName, policyDescription, policyDocument)}>Submit</Button>
                </SpaceBetween>
            </Box>
        </SpaceBetween>
    )
}

export default CreateForm;