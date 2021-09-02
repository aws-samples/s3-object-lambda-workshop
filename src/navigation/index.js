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
import {withRouter, useLocation, useHistory} from 'react-router-dom';
import SideNavigation from '@awsui/components-react/side-navigation';

function ServiceNavigation() {
    const location = useLocation();
    let history = useHistory();

    function onFollowHandler(event) {
        if (!event.detail.external) {
            event.preventDefault();
            history.push(event.detail.href);
        }
    }

    return (
        <SideNavigation
            activeHref={location.pathname}
            header={{ href: "/", text: "S3 Object Lambda" }}
            onFollow={onFollowHandler}
            items={[
                { type: "link", text: "Policies", href: "/" },
                // { type: "link", text: "Create Policy", href: "/create" },
                { type: "divider" },
                {
                    type: "link",
                    text: "AWS Workshops",
                    href: "https://workshops.aws",
                    external: true
                }
            ]}
        />
    );
}

export default withRouter(ServiceNavigation);