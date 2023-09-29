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
import {useCollection} from '@cloudscape-design/collection-hooks';
import {useNavigate} from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    ButtonDropdown,
    CollectionPreferences,
    Header,
    Link,
    Modal,
    Pagination,
    Table,
    TextFilter,
    SpaceBetween,
} from '@cloudscape-design/components';
import {API} from 'aws-amplify';
import {columnDefinitions, getMatchesCountText, paginationLabels, collectionPreferencesProps} from './table-config';
import {Amplify} from 'aws-amplify';
import awsconfig from '../aws-exports';

Amplify.configure(awsconfig);


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

function DeleteModal({policies, visible, onDiscard, onDelete}) {
    const isMultiple = policies.length > 1;
    return (
        <Modal
            visible={visible}
            onDismiss={onDiscard}
            header={isMultiple ? 'Delete policies' : 'Delete policy'}
            closeAriaLabel="Close dialog"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" onClick={onDiscard}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={onDelete} data-testid="submit">
                            Delete
                        </Button>
                    </SpaceBetween>
                </Box>
            }
        >
            {policies.length > 0 && (
                <SpaceBetween size="m">
                    {isMultiple ? (
                        <Box variant="span">
                            Permanently delete{' '}
                            <Box variant="span" fontWeight="bold">
                                {policies.length} distributions
                            </Box>
                            ? You can’t undo this action.
                        </Box>
                    ) : (
                        <Box variant="span">
                            Permanently delete policy{' '}
                            <Box variant="span" fontWeight="bold">
                                {policies[0].policy_name}
                            </Box>
                            ? You can’t undo this action.
                        </Box>
                    )}

                    <Alert statusIconAriaLabel="Info">
                        Proceeding with this action will delete the
                        {isMultiple ? ' policies with all their content ' : ' policy with all its content'} and can
                        affect related resources.{' '}
                        <Link external={true} href="#" ariaLabel="Learn more about polic management, opens in new tab">
                            Learn more
                        </Link>
                    </Alert>
                </SpaceBetween>
            )}
        </Modal>
    );
}


export default function PolicyTable({setNotifications}) {
    let history = useNavigate();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [allItems, setAllItems] = useState([]);
    const [loadingState, setLoadingState] = useState(true)
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
    const {selectedItems} = collectionProps;


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



    function CreatePolicy() {
        history('/create');
    }

    function EditPolicy(id, policy_name) {
        history(`/edit/${id}?policy_name=${policy_name}`);
    }

    function onItemClick(item){
        if (item.detail.id === 'remove'){
            console.log("Opening Modal - Delete policy: " + selectedItems[0].id);
            setShowDeleteModal(true);
        }else if (item.detail.id === 'edit'){
            if(selectedItems[0].id){
                EditPolicy(selectedItems[0].id, selectedItems[0].policy_name);
            }else{
                console.log('Edit invoked without selected item or without id');
            }
            console.log('Edit');
        }
    }

    async function onModalDelete(){
        console.log('Deleting: ' + selectedItems[0].id);
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
        setNotifications(notifications => [{
            type: "success",
            dismissible: true,
            dismissLabel: "Dismiss message",
            content: "Successfully deleted policy ",
            id: "message_6",
            onDismiss: () =>
                setNotifications(items =>
                    items.filter(item => item.id !== "message_6")
                )
            },
            ...notifications,]
        );
        setShowDeleteModal(false);
    }

    return (
        <>
            <Table
                variant="full-page"
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
            <DeleteModal
                policies={selectedItems}
                visible={showDeleteModal}
                onDelete={onModalDelete}
                onDiscard={() => setShowDeleteModal(false)}
            />
        </>
    );
}