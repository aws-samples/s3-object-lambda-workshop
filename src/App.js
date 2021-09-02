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
import { Route } from 'react-router-dom';
import React from 'react';
import ListForm from "./list";
import CreateForm from "./create";
import EditForm from "./edit";
import Navbar from "./navbar";
import {withAuthenticator} from '@aws-amplify/ui-react';
import "./styles.css";

function App() {
    return (
        <div className="pad-top bad-bot">
            <div id='h' style={{
                position: "fixed",
                top: 0,
                height: "auto !important",
                zIndex: 1003,
                margin: 0,
                padding: 0,
                border: 0,
                width: "100%",
                display: "block",
                backgroundColor: "#232e3e",
            }}>
                <Navbar/>
            </div>
            <div>
                <Route exact path="/" component={ListForm} />
                <Route path="/create" component={CreateForm} />
                <Route path="/edit/:id" component={EditForm} />
                <Route path="/view/:id" component={EditForm} />
            </div>
        </div>
    );
}

export default withAuthenticator(App)