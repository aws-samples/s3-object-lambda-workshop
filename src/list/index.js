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
import React, {useState} from 'react';
import { withRouter } from 'react-router-dom';
import {AppLayout} from "@awsui/components-react";
import {appLayoutLabels} from '../labels';
import "../styles.css";
import ServiceNavigation from "../navigation";
import PolicyTable from "../table";
import Container from "@awsui/components-react/container";
import Header from "@awsui/components-react/header";

const Content = () => {
    return (
        <Container
            id="s3-object-lambda-policy-panel"
            header={
                <Header variant="h2">
                    IAM-X Policy
                </Header>
            }
        >
            <PolicyTable/>
        </Container>
    );
};

function TableView() {
    const [navigationOpen, setNavigationOpen] = useState(true);

    return (
        <AppLayout
            content={<Content/>}
            headerSelector='#h'
            navigation={<ServiceNavigation/>}
            navigationOpen={navigationOpen}
            onNavigationChange={({detail}) => setNavigationOpen(detail.open)}
            ariaLabels={appLayoutLabels}
        />
    );
}

export default withRouter(TableView);