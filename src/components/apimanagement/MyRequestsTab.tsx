import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  EmptyState,
  EmptyStateBody,
  Label,
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Form,
  FormGroup,
  TextInput,
  TextArea,
  Pagination,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Select,
  SelectOption,
  InputGroup,
  Title,
} from '@patternfly/react-core';
import { EllipsisVIcon, SearchIcon } from '@patternfly/react-icons';
import {
  useK8sWatchResource,
  k8sDelete,
  k8sPatch,
  VirtualizedTable,
  TableData,
  RowProps,
  TableColumn,
  ListPageBody,
} from '@openshift-console/dynamic-plugin-sdk';
import { APIKey, APIKeyGVK, APIKeyModel } from '../../types/api-management';
import { filterAPIKeysByUser } from '../../utils/api-key-utils';

interface MyRequestsTabProps {
  userId: string;
}

export const MyRequestsTab: React.FC<MyRequestsTabProps> = ({ userId }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<APIKey | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');
  const [editError, setEditError] = React.useState('');

  // edit form state
  const [editUseCase, setEditUseCase] = React.useState('');

  // filter and pagination state
  const [filters, setFilters] = React.useState<string>('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);
  const [filterSelected, setFilterSelected] = React.useState('API');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [perPage, setPerPage] = React.useState<number>(10);
  const [statusFilter, setStatusFilter] = React.useState<string>('All');

  // watch APIKey CRs across all namespaces
  const [apiKeys, apiKeysLoaded, apiKeysError] = useK8sWatchResource<APIKey[]>({
    groupVersionKind: APIKeyGVK,
    isList: true,
    namespaced: false,
  });

  // filter to user's requests
  const userRequests = React.useMemo(() => {
    if (!apiKeysLoaded || !apiKeys) return [];
    return filterAPIKeysByUser(apiKeys, userId);
  }, [apiKeys, apiKeysLoaded, userId]);

  // apply filters
  const filteredData = React.useMemo(() => {
    let data = userRequests;

    // status filter
    if (statusFilter !== 'All') {
      data = data.filter((req) => req.status?.phase === statusFilter);
    }

    // text filter
    if (filters) {
      const filterValue = filters.toLowerCase();
      data = data.filter((item) => {
        if (filterSelected === 'API') {
          return item.spec.apiProductRef.name.toLowerCase().includes(filterValue);
        } else if (filterSelected === 'Namespace') {
          return (item.metadata?.namespace || '').toLowerCase().includes(filterValue);
        } else if (filterSelected === 'Plan') {
          return item.spec.planTier.toLowerCase().includes(filterValue);
        }
        return true;
      });
    }

    return data;
  }, [userRequests, filters, filterSelected, statusFilter]);

  // pagination
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const onToggleClick = () => setIsOpen(!isOpen);

  const onFilterSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    selection: string,
  ) => {
    setFilterSelected(selection);
    setIsOpen(false);
  };

  const onSetPage = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    pageNumber: number,
  ) => {
    setCurrentPage(pageNumber);
  };

  const onPerPageSelect = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    perPageNumber: number,
  ) => {
    setPerPage(perPageNumber);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setCurrentPage(1);
    setFilters(value);
  };

  const handleStatusFilterChange = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    selection: string,
  ) => {
    setStatusFilter(selection);
    setCurrentPage(1);
    setIsStatusOpen(false);
  };

  const handleEditClick = (request: APIKey) => {
    setSelectedRequest(request);
    setEditUseCase(request.spec.useCase || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleEditConfirm = async () => {
    if (!selectedRequest) return;

    setSaving(true);
    setEditError('');

    try {
      await k8sPatch({
        model: APIKeyModel,
        resource: selectedRequest,
        data: [
          {
            op: 'replace',
            path: '/spec/useCase',
            value: editUseCase,
          },
        ],
      });

      setEditModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('error updating request:', error);
      setEditError(error instanceof Error ? error.message : 'unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (request: APIKey) => {
    setSelectedRequest(request);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRequest) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await k8sDelete({
        model: APIKeyModel,
        resource: selectedRequest,
      });

      setDeleteModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('error deleting request:', error);
      setDeleteError(error instanceof Error ? error.message : 'unknown error');
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableColumn<APIKey>[] = [
    {
      title: t('API Product'),
      id: 'api',
      sort: 'spec.apiProductRef.name',
    },
    {
      title: t('Namespace'),
      id: 'namespace',
      sort: 'metadata.namespace',
    },
    {
      title: t('Plan'),
      id: 'plan',
      sort: 'spec.planTier',
    },
    {
      title: t('Use Case'),
      id: 'useCase',
    },
    {
      title: t('Requested Date'),
      id: 'requestedDate',
      sort: 'metadata.creationTimestamp',
    },
    {
      title: t('Status'),
      id: 'status',
      sort: 'status.phase',
    },
    {
      title: '',
      id: 'actions',
      props: { className: 'pf-v6-c-table__action' },
    },
  ];

  const RequestRow: React.FC<RowProps<APIKey>> = ({ obj, activeColumnIDs }) => {
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const status = obj.status?.phase || 'Pending';
    const statusColor = status === 'Pending' ? 'orange' : status === 'Approved' ? 'green' : 'red';
    const isPending = status === 'Pending';

    const requestedDate = obj.metadata?.creationTimestamp
      ? new Date(obj.metadata.creationTimestamp).toLocaleDateString()
      : '-';

    return (
      <>
        <TableData id="api" activeColumnIDs={activeColumnIDs}>
          {obj.spec.apiProductRef.name}
        </TableData>
        <TableData id="namespace" activeColumnIDs={activeColumnIDs}>
          {obj.metadata?.namespace}
        </TableData>
        <TableData id="plan" activeColumnIDs={activeColumnIDs}>
          <Label isCompact>{obj.spec.planTier}</Label>
        </TableData>
        <TableData id="useCase" activeColumnIDs={activeColumnIDs}>
          {obj.spec.useCase
            ? obj.spec.useCase.length > 50
              ? `${obj.spec.useCase.substring(0, 50)}...`
              : obj.spec.useCase
            : '-'}
        </TableData>
        <TableData id="requestedDate" activeColumnIDs={activeColumnIDs}>
          {requestedDate}
        </TableData>
        <TableData id="status" activeColumnIDs={activeColumnIDs}>
          <Label color={statusColor}>{status}</Label>
        </TableData>
        <TableData id="actions" activeColumnIDs={activeColumnIDs} className="pf-v6-c-table__action">
          <Dropdown
            isOpen={isDropdownOpen}
            onSelect={() => setIsDropdownOpen(false)}
            onOpenChange={setIsDropdownOpen}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                aria-label="actions menu"
                variant="plain"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                isExpanded={isDropdownOpen}
              >
                <EllipsisVIcon />
              </MenuToggle>
            )}
          >
            <DropdownList>
              {isPending && (
                <DropdownItem key="edit" onClick={() => handleEditClick(obj)}>
                  {t('Edit')}
                </DropdownItem>
              )}
              <DropdownItem key="delete" onClick={() => handleDeleteClick(obj)}>
                {t('Delete')}
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </TableData>
      </>
    );
  };

  return (
    <>
      {apiKeysError && <Alert variant="danger" title={t('Error loading requests')} isInline />}

      <div className="kuadrant-api-management-requests">
        <ListPageBody>
          <Toolbar>
            <ToolbarContent>
              <ToolbarGroup variant="filter-group">
                <ToolbarItem>
                  <Select
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
                        {filterSelected}
                      </MenuToggle>
                    )}
                    onSelect={onFilterSelect}
                    onOpenChange={setIsOpen}
                    isOpen={isOpen}
                  >
                    {['API', 'Namespace', 'Plan'].map((option, index) => (
                      <SelectOption key={index} value={option}>
                        {option}
                      </SelectOption>
                    ))}
                  </Select>
                </ToolbarItem>

                <ToolbarItem>
                  <InputGroup className="pf-v5-c-input-group co-filter-group">
                    <TextInput
                      type="text"
                      placeholder={t('Search by {{filterValue}}...', {
                        filterValue: filterSelected.toLowerCase(),
                      })}
                      onChange={(_event, value) => handleFilterChange(value)}
                      className="pf-v5-c-form-control co-text-filter-with-icon"
                      aria-label="Request search"
                    />
                  </InputGroup>
                </ToolbarItem>

                <ToolbarItem>
                  <Select
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                        isExpanded={isStatusOpen}
                      >
                        {t('Status')}: {statusFilter}
                      </MenuToggle>
                    )}
                    onSelect={handleStatusFilterChange}
                    isOpen={isStatusOpen}
                    onOpenChange={setIsStatusOpen}
                  >
                    {['All', 'Pending', 'Approved', 'Rejected'].map((option, index) => (
                      <SelectOption key={index} value={option}>
                        {option}
                      </SelectOption>
                    ))}
                  </Select>
                </ToolbarItem>
              </ToolbarGroup>
            </ToolbarContent>
          </Toolbar>

          {paginatedData.length === 0 && apiKeysLoaded ? (
            <EmptyState
              titleText={
                <Title headingLevel="h4" size="lg">
                  {t('No Requests')}
                </Title>
              }
              icon={SearchIcon}
            >
              <EmptyStateBody>
                {userRequests.length === 0
                  ? t('You have not submitted any API key requests yet.')
                  : t('No requests match the current filters.')}
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <VirtualizedTable<APIKey>
              data={paginatedData}
              unfilteredData={filteredData}
              loaded={apiKeysLoaded}
              loadError={apiKeysError}
              columns={columns}
              Row={RequestRow}
            />
          )}

          {filteredData.length > 0 && (
            <div className="kuadrant-pagination-left">
              <Pagination
                itemCount={filteredData.length}
                perPage={perPage}
                page={currentPage}
                onSetPage={onSetPage}
                onPerPageSelect={onPerPageSelect}
                variant="bottom"
                perPageOptions={[
                  { title: '5', value: 5 },
                  { title: '10', value: 10 },
                  { title: '20', value: 20 },
                  { title: '50', value: 50 },
                ]}
              />
            </div>
          )}
        </ListPageBody>
      </div>

      <Modal
        variant="small"
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        aria-label={t('Edit request')}
      >
        <ModalHeader title={t('Edit API Key Request')} />
        <ModalBody>
          {editError && <Alert variant="danger" title={editError} isInline />}
          <Form>
            <FormGroup label={t('API Product')} fieldId="api-name">
              <TextInput
                id="api-name"
                value={selectedRequest?.spec.apiProductRef.name}
                isDisabled
              />
            </FormGroup>
            <FormGroup label={t('Plan')} fieldId="plan-tier">
              <TextInput id="plan-tier" value={selectedRequest?.spec.planTier} isDisabled />
            </FormGroup>
            <FormGroup label={t('Use Case')} fieldId="use-case">
              <TextArea
                id="use-case"
                value={editUseCase}
                onChange={(_event, value) => setEditUseCase(value)}
                rows={5}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleEditConfirm}
            isDisabled={saving}
            isLoading={saving}
          >
            {t('Save')}
          </Button>
          <Button variant="link" onClick={() => setEditModalOpen(false)} isDisabled={saving}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        variant="small"
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        aria-label={t('Delete request confirmation')}
      >
        <ModalHeader title={t('Delete API Key Request?')} />
        <ModalBody>
          {deleteError && <Alert variant="danger" title={deleteError} isInline />}
          <p>
            {t('Are you sure you want to delete this request for')}{' '}
            <strong>{selectedRequest?.spec.apiProductRef.name}</strong>?
          </p>
          {selectedRequest?.status?.phase === 'Approved' && (
            <Alert variant="warning" isInline title={t('Active API Key')} className="pf-v6-u-mt-md">
              {t(
                'This request has an approved API key. The associated secret will also be deleted.',
              )}
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            isDisabled={deleting}
            isLoading={deleting}
          >
            {t('Delete')}
          </Button>
          <Button variant="link" onClick={() => setDeleteModalOpen(false)} isDisabled={deleting}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
