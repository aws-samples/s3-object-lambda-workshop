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
import * as React from 'react';
import { Link } from 'react-router-dom';

export function getMatchesCountText(count) {
    return count === 1 ? `1 match` : `${count} matches`;
}

function formatDate(date) {
    const dateObject = new Date(parseInt(date));
    const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });
    const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short', hour12: false });
    try{
        return `${dateFormatter.format(dateObject)}, ${timeFormatter.format(dateObject)}`;
    }catch(e){
        return '-';
    }

}

function createLabelFunction(columnName) {
    return ({ sorted, descending }) => {
        const sortState = sorted ? `sorted ${descending ? 'descending' : 'ascending'}` : 'not sorted';
        return `${columnName}, ${sortState}.`;
    };
}

export const columnDefinitions = [
    {
        id: 'name',
        header: 'Policy Name',
        cell: item => <Link to={`/edit/${item.id}?policy_name=${item.policy_name}`}>{item.policy_name}</Link>,
        ariaLabel: createLabelFunction('name'),
        sortingField: 'name'
    },
    {
        id: 'description',
        header: 'Description',
        cell: item => item.policy_description,
        ariaLabel: createLabelFunction('Description'),
        sortingField: 'description'
    },
    {
        id: 'creationDate',
        header: 'Creation date',
        cell: item => formatDate(item.creation_date),
        ariaLabel: createLabelFunction('Creation date'),
        sortingComparator: (a, b) => a.creation_date.valueOf() - b.creation_date.valueOf()
    },
    {
        id: 'lastModified',
        header: 'Last modified',
        cell: item => formatDate(item.last_modified),
        ariaLabel: createLabelFunction('Last modified'),
        sortingComparator: (a, b) => a.last_modified.valueOf() - b.last_modified.valueOf()
    }
];

export const paginationLabels = {
    nextPageLabel: 'Next page',
    pageLabel: pageNumber => `Go to page ${pageNumber}`,
    previousPageLabel: 'Previous page'
};

const pageSizePreference = {
    title: 'Select page size',
    options: [
        { value: 10, label: '10 resources' },
        { value: 20, label: '20 resources' }
    ]
};

const visibleContentPreference = {
    title: 'Select visible content',
    options: [
        {
            label: 'Main properties',
            options: columnDefinitions.map(({ id, header }) => ({ id, label: header, editable: id !== 'policy_name' }))
        }
    ]
};
export const collectionPreferencesProps = {
    pageSizePreference,
    visibleContentPreference,
    cancelLabel: 'Cancel',
    confirmLabel: 'Confirm',
    title: 'Preferences'
};