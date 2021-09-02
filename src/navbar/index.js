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
import React, {useState, useEffect} from 'react';
import {Auth, Hub} from "aws-amplify";
import {AmplifySignOut} from "@aws-amplify/ui-react";
import {TextContent} from "@awsui/components-react";

const Navbar = () => {
    const title = 'S3 Object Lambda Workshop';
    const [user, setUser] = useState(null);

    useEffect(() => {
        let unmounted = false;
        Hub.listen('auth', ({payload: {event, data}}) => {
            switch (event) {
                case 'signIn':
                case 'cognitoHostedUI':
                    if (!unmounted){
                        getUser().then(userData => setUser(userData));
                    }
                    break;
                case 'signOut':
                    if (!unmounted){
                        setUser(null);
                    }
                    break;
                case 'signIn_failure':
                case 'cognitoHostedUI_failure':
                    if (!unmounted){
                        console.log('Sign in failure', data);
                    }
                    break;
                default:
                    return;
            }
        });

        getUser().then(userData => setUser(userData));
        return () => { unmounted = true };
    }, []);

    function getUser() {
        return Auth.currentAuthenticatedUser()
            .then(userData => userData)
            .catch(() => console.log('Not signed in'));
    }

    return (
        <div>
            <span>
            <TextContent>
                <h1 style={
                    {
                        paddingLeft: '3rem',
                        fontFamily: 'Noto Sans',
                        fontWeight: 'bold',
                        fontSize: 'large',
                        color: 'white',
                        float: 'left',
                    }
                }>{title}</h1>
                <div style={
                    {
                        float: 'right',
                        marginTop: '5px',
                        marginRight: '15px',
                    }
                }>
                    <p style={
                        {
                            paddingLeft: '3rem',
                            paddingRight: '3rem',
                            fontFamily: 'Noto Sans',
                            fontSize: 'small',
                            color: 'white',
                            float: 'left',
                        }
                    }>{user ? user.attributes.email : 'None'}</p>
                    <AmplifySignOut style={
                        {
                            fontFamily: 'Noto Sans',
                            fontWeight: 'bold',
                            fontSize: 'large',
                            color: 'white',
                            float: 'left',
                        }
                    }
                                    buttonText="Logout"/>
                </div>
            </TextContent>
            </span>
        </div>
    );

};

export default Navbar;
