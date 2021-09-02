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
import {useCollection} from '@awsui/collection-hooks';
import {useHistory} from 'react-router-dom';
import {
    Box,
    Button,
    ButtonDropdown,
    CollectionPreferences,
    Header,
    Modal,
    Pagination,
    Table,
    TextFilter,
    SpaceBetween,
} from '@awsui/components-react';
import {API} from 'aws-amplify';
import {columnDefinitions, getMatchesCountText, paginationLabels, collectionPreferencesProps} from './table-config';

function EmptyState({title, subtitle, action}) {
    return (
        <Box textAlign="center" color="inherit">
            <Box variant="strong" textAlign="center" color="inherit">
                {title}
            </Box>
            <Box variant="p" padding={{bottom: 's'}} color="inherit">
                {subtitle}
            </Box>
            {action}
        </Box>
    );
}

export default function S3ObjectLambdaTable() {
    let history = useHistory();
    const [visibleModal, setVisibleModal] = React.useState(false);
    const [modalTitle, setModalTitle] = React.useState('Delete policy');
    const [modalDesc, setModalDesc] = React.useState('Confirm the deletion of policy?')
    const [allItems, setAllItems] = React.useState([]);
    const [loadingState, setLoadingState] = React.useState(true)
    const [preferences, setPreferences] = useState({
        pageSize: 10,
        visibleContent: ['name', 'description', 'lastModified']
    });
    const {items, actions, filteredItemsCount, collectionProps, filterProps, paginationProps} = useCollection(
        allItems,
        {
            filtering: {
                empty: (
                    <EmptyState
                        title="No policies"
                        subtitle="No policies to display."
                        action={<Button onClick={CreatePolicy}>Create policy</Button>}
                    />
                ),
                noMatch: (
                    <EmptyState
                        title="No matches"
                        subtitle="We can’t find a match."
                        action={<Button onClick={() => actions.setFiltering('')}>Clear filter</Button>}
                    />
                )
            },
            pagination: {pageSize: preferences.pageSize},
            sorting: {},
            selection: {}
        }
    );

    async function getData() {
        try {
            const response = await API.get('S3ObjectLambda', '/policy', {});
            console.log(response);
            setAllItems(JSON.parse(response.message));
            setLoadingState(false);
        } catch (e) {
            console.log(e);
        }
    }

    React.useEffect(function getTableData() {
        getData().then(r => console.log('Table refresh ' + r));
    }, []);

    const {selectedItems} = collectionProps;

    function CreatePolicy() {
        history.push('/create');
    }

    function EditPolicy(id, policy_name) {
        history.push(`/edit/${id}?policy_name=${policy_name}`);
    }

    function onItemClick(item){
        if (item.detail.id === 'remove'){
            console.log(selectedItems[0].id);
            setModalTitle('Delete IAM-X policy');
            setModalDesc(`Confirm the delete of policy: ${selectedItems[0].policy_name}?`);
            setVisibleModal(true);
        }else if (item.detail.id === 'edit'){
            if(selectedItems[0].id){
                EditPolicy(selectedItems[0].id, selectedItems[0].policy_name);
            }else{
                console.log('Edit invoked without selected item or without id');
            }
            console.log('Edit');
        }
    }

    function onModalCancel(){
        setVisibleModal(false);
    }

    async function onModalDelete(){
        console.log('Deleting: ' + selectedItems[0].id);
        setVisibleModal(false);
        try {
            const response = await API.del('S3ObjectLambda', '/policy', {
                'queryStringParameters': {
                    'id': selectedItems[0].id,
                    'policy_name': selectedItems[0].policy_name
                }}
            );
            console.log(response);
            await getData();
        } catch (e) {
            console.log(JSON.stringify(e.response.data));
        }
    }

    return (
        <div>
            <Modal
                onDismiss={() => setVisibleModal(false)}
                visible={visibleModal}
                closeAriaLabel="Close modal"
                size="medium"
                footer={
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="link" onClick={onModalCancel}>Cancel</Button>
                            <Button variant="primary" onClick={onModalDelete}>Delete</Button>
                        </SpaceBetween>
                    </Box>
                }
                header={modalTitle}
            >
                {modalDesc}
            </Modal>
            <Table
                {...collectionProps}
                selectionType="single"
                loading={loadingState}
                loadingText="Loading policies"
                header={
                    <Header
                        counter={selectedItems.length ? `(${selectedItems.length}/${allItems.length})` : `(${allItems.length})`}
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button variant="primary" onClick={CreatePolicy}>
                                    Create Policy
                                </Button>
                                <ButtonDropdown
                                    disabled={!selectedItems.length}
                                    items={[
                                        {text: "Delete", id: "remove", disabled: false},
                                        {text: "Edit", id: "edit", disabled: false},
                                        {text: "Attach", id: "attach", disabled: true}
                                    ]}
                                    onItemClick={(item) => onItemClick(item)}
                                >
                                    Action
                                </ButtonDropdown>
                            </SpaceBetween>
                        }
                    >
                        Policies
                    </Header>

                }
                columnDefinitions={columnDefinitions}
                visibleColumns={preferences.visibleContent}
                items={items}
                pagination={<Pagination {...paginationProps} ariaLabels={paginationLabels}/>}
                filter={
                    <TextFilter
                        {...filterProps}
                        countText={getMatchesCountText(filteredItemsCount)}
                        filteringAriaLabel="Filter policies"
                    />
                }
                preferences={
                    <CollectionPreferences
                        {...collectionPreferencesProps}
                        preferences={preferences}
                        onConfirm={({detail}) => setPreferences(detail)}
                    />
                }
            />
        </div>
    );
}