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
// eslint-disable-next-line
import ace from "ace-builds";
import "ace-builds/webpack-resolver";
import {
    Alert,
    CodeEditor,
    FormField,
    Button,
    Box,
    SpaceBetween,
    Input,
    Textarea
} from "@awsui/components-react";
import {API} from "aws-amplify";
import {useHistory} from "react-router-dom";

function CreateForm() {
    let history = useHistory();
    const CODE_EDITOR_I18N_STRINGS = {
        loadingState: 'Loading code editor',
        errorState: 'There was an error loading the code editor.',
        errorStateRecovery: 'Retry',

        editorGroupAriaLabel: 'Code editor',
        statusBarGroupAriaLabel: 'Status bar',

        cursorPosition: (row, column) => `Ln ${row}, Col ${column}`,
        errorsTab: 'Errors',
        warningsTab: 'Warnings',
        preferencesButtonAriaLabel: 'Preferences',

        paneCloseButtonAriaLabel: 'Close',

        preferencesModalHeader: 'Preferences',
        preferencesModalCancel: 'Cancel',
        preferencesModalConfirm: 'Confirm',
        preferencesModalWrapLines: 'Wrap lines',
        preferencesModalTheme: 'Theme',
        preferencesModalLightThemes: 'Light themes',
        preferencesModalDarkThemes: 'Dark themes'
    };
    const readOnlyWithErrors = false;
    const [ace, setAce] = useState(undefined);
    const [codeEditorLoading, setCodeEditorLoading] = useState(true);
    const [policyDocument, setPolicyDocument] = useState(readOnlyWithErrors ? '{ invalidJson }' : '');
    const [codeEditorPreferences, setCodeEditorPreferences] = useState(undefined);
    const [policyName, setPolicyName] = useState('');
    const [policyDescription, setPolicyDescription] = useState('');
    const [visibleAlert, setVisibleAlert] = React.useState(false);
    const [headerAlert, setHeaderAlert] = React.useState('');
    const [textAlert, setTextAlert] = React.useState('');

    useEffect(() => {
        setCodeEditorLoading(true);
        import('ace-builds').then(ace => {
            ace.config.set('basePath', '../libs/ace/');
            setAce(ace);
            setCodeEditorLoading(false);
        });
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
            history.push('/');
        } catch (e) {
            if (e.response.status === 400) {
                setHeaderAlert('Create policy error');
                setTextAlert(JSON.stringify(e.response.data.message));
                setVisibleAlert(true);
                console.log(e.response.data);
            }
        }
        ;
    }


    const onCodeEditorChange = e => {
        !readOnlyWithErrors && setPolicyDocument(e.detail.value);
    };

    const onCodeEditorPreferencesChange = e => {
        !readOnlyWithErrors && setCodeEditorPreferences(e.detail);
    };
    return (
        <SpaceBetween direction="vertical" size="m">
            <Alert
                onDismiss={() => setVisibleAlert(false)}
                visible={visibleAlert}
                dismissAriaLabel="Close alert"
                dismissible
                type="error"
                header={headerAlert}
            >
                <pre>{textAlert}</pre>
            </Alert>
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
                    i18nStrings={CODE_EDITOR_I18N_STRINGS}
                />
            </FormField>
            <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                    <Button href="/" variant="link">Cancel</Button>
                    <Button variant="primary"
                            onClick={(e) => CreatePolicy(policyName, policyDescription, policyDocument)}>Submit</Button>
                </SpaceBetween>
            </Box>
        </SpaceBetween>
    )
}

export default CreateForm;