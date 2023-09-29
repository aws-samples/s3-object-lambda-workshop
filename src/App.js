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

import {Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import '@aws-amplify/ui-react/styles.css';
import "./styles.css";
import 'ace-builds/src-noconflict/ace';
import logo from './common/s3ol.svg';
import PolicyTable from "./table";
import CreateForm from "./create";
import EditForm from "./edit";
import {
    AppLayout,
    SideNavigation,
    BreadcrumbGroup,
    TopNavigation, Flashbar
} from "@cloudscape-design/components";
import {Amplify, Auth} from 'aws-amplify';
import {Authenticator} from '@aws-amplify/ui-react';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);


const appLayoutLabels = {
    navigation: 'Side navigation',
    navigationToggle: 'Open side navigation',
    navigationClose: 'Close side navigation',
    notifications: 'Notifications',
    tools: 'Help panel',
    toolsToggle: 'Open help panel',
    toolsClose: 'Close help panel'
};

const breadcrumbs = [
    {
        text: 'IAM-X',
        href: '#',
    },
    {
        text: 'Policies',
        href: '#',
    },
];


const ServiceNavigation = () => {
    const location = useLocation();
    let navigate = useNavigate();

    function onFollowHandler(event) {
        if (!event.detail.external) {
            event.preventDefault();
            navigate(event.detail.href);
        }
    }

    return (
        <SideNavigation
            activeHref={location.pathname}
            header={{href: "/", text: "Custom Policies"}}
            onFollow={onFollowHandler}
            items={[
                {type: "link", text: "Policies", href: "/"},
                {type: "divider"},
                {
                    type: "link",
                    text: "AWS Solutions Architect",
                    href: "https://workshops.aws",
                    external: true
                }
            ]}
        />
    );
}

function App() {
    const [navigationOpen, setNavigationOpen] = useState(true);
    const navbarItemClick = e => {
        console.log(e);
        if (e.detail.id === 'signout') {
            Auth.signOut().then(() => {
                window.location.reload();
            });
        }
    }
    const [notifications, setNotifications] = useState([]);

    return (
        <Authenticator>
            {({_signOut, user}) => (
                <>
                    <div id="navbar" style={{fontSize: 'body-l !important', position: 'sticky', top: 0, zIndex: 1002}}>
                        <TopNavigation
                            identity={{
                                href: "#",
                                title: "S3 Object Lambda Workshop",
                                logo: {
                                    src: logo,
                                    alt: "S3 Object Lambda Workshop"
                                }
                            }}
                            utilities={[
                                {
                                    type: "button",
                                    text: "AWS",
                                    href: "https://aws.amazon.com/",
                                    external: true,
                                    externalIconAriaLabel: " (opens in a new tab)"
                                },
                                {
                                    type: "menu-dropdown",
                                    text: user.username,
                                    description: user.attributes.email,
                                    iconName: "user-profile",
                                    onItemClick: navbarItemClick,
                                    items: [
                                        {id: "profile", text: "Profile"},
                                        {id: "preferences", text: "Preferences"},
                                        {id: "security", text: "Security"},
                                        {
                                            id: "feedback",
                                            text: "Feedback",
                                            href: "#",
                                            external: true,
                                            externalIconAriaLabel:
                                                " (opens in new tab)"
                                        },
                                        {id: "signout", text: "Sign out"}
                                    ]
                                }
                            ]}
                            i18nStrings={{
                                searchIconAriaLabel: "Search",
                                searchDismissIconAriaLabel: "Close search",
                                overflowMenuTriggerText: "More"
                            }}
                        />
                    </div>
                    <AppLayout
                        stickyNotifications
                        notifications={<Flashbar items={notifications} stackItems={true} />}
                        contentType="table"
                        content={
                        <Routes>
                            <Route path="/" element={<PolicyTable setNotifications={setNotifications}/>} />
                            <Route path="/create" element={<CreateForm setNotifications={setNotifications}/>}/>
                            <Route path="/edit/:id" element={<EditForm setNotifications={setNotifications}/>} />
                            <Route path="/view/:id" element={<EditForm/>} />
                        </Routes>
                        }
                        breadcrumbs={<BreadcrumbGroup items={breadcrumbs} expandAriaLabel="Show path" ariaLabel="Breadcrumbs" />}
                        navigation={<ServiceNavigation/>}
                        navigationOpen={navigationOpen}
                        onNavigationChange={({detail}) => setNavigationOpen(detail.open)}
                        ariaLabels={appLayoutLabels}
                    />
                </>
            )}
        </Authenticator>
    );
}

export default App