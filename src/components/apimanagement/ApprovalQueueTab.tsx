import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableHeader, TableBody } from '@patternfly/react-table/deprecated';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  Alert,
  Content,
  Label,
  Checkbox,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { ClipboardCheckIcon } from '@patternfly/react-icons';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { APIKey, APIKeyGVK } from '../../types/api-management';
import {
  approveRequest,
  rejectRequest,
  bulkApproveRequests,
  bulkRejectRequests,
} from '../../utils/approval-operations';

interface ApprovalQueueTabProps {
  userId: string;
}

export const ApprovalQueueTab: React.FC<ApprovalQueueTabProps> = ({ userId }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [approveModalOpen, setApproveModalOpen] = React.useState(false);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = React.useState(false);
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<APIKey | null>(null);
  const [selectedRequests, setSelectedRequests] = React.useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState('');

  // watch all APIKey CRs across all namespaces
  const [apiKeys, apiKeysLoaded, apiKeysError] = useK8sWatchResource<APIKey[]>({
    groupVersionKind: APIKeyGVK,
    isList: true,
    namespaced: false,
  });

  // filter to pending requests only
  const pendingRequests = React.useMemo(() => {
    if (!apiKeysLoaded || !apiKeys) return [];
    return apiKeys.filter((key) => !key.status?.phase || key.status.phase === 'Pending');
  }, [apiKeys, apiKeysLoaded]);

  const toggleSelection = (keyName: string) => {
    setSelectedRequests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyName)) {
        newSet.delete(keyName);
      } else {
        newSet.add(keyName);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRequests.size === pendingRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(pendingRequests.map((r) => r.metadata?.name || '')));
    }
  };

  const handleApproveClick = (request: APIKey) => {
    setSelectedRequest(request);
    setError('');
    setApproveModalOpen(true);
  };

  const handleRejectClick = (request: APIKey) => {
    setSelectedRequest(request);
    setRejectReason('');
    setError('');
    setRejectModalOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    setError('');

    const result = await approveRequest({
      request: selectedRequest,
      reviewedBy: userId,
    });

    setProcessing(false);

    if (result.success) {
      setApproveModalOpen(false);
      setSelectedRequest(null);
    } else {
      setError(result.error || 'failed to approve request');
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;

    if (!rejectReason.trim()) {
      setError('rejection reason is required');
      return;
    }

    setProcessing(true);
    setError('');

    const result = await rejectRequest({
      request: selectedRequest,
      reviewedBy: userId,
      reason: rejectReason.trim(),
    });

    setProcessing(false);

    if (result.success) {
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
    } else {
      setError(result.error || 'failed to reject request');
    }
  };

  const handleBulkApprove = async () => {
    const requestsToApprove = pendingRequests.filter((r) =>
      selectedRequests.has(r.metadata?.name || ''),
    );

    setProcessing(true);
    setError('');

    const result = await bulkApproveRequests(requestsToApprove, userId);

    setProcessing(false);

    if (result.failed === 0) {
      setBulkApproveModalOpen(false);
      setSelectedRequests(new Set());
    } else {
      setError(`${result.success} approved, ${result.failed} failed: ${result.errors.join(', ')}`);
    }
  };

  const handleBulkReject = async () => {
    if (!rejectReason.trim()) {
      setError('rejection reason is required');
      return;
    }

    const requestsToReject = pendingRequests.filter((r) =>
      selectedRequests.has(r.metadata?.name || ''),
    );

    setProcessing(true);
    setError('');

    const result = await bulkRejectRequests(requestsToReject, userId, rejectReason.trim());

    setProcessing(false);

    if (result.failed === 0) {
      setBulkRejectModalOpen(false);
      setSelectedRequests(new Set());
      setRejectReason('');
    } else {
      setError(`${result.success} rejected, ${result.failed} failed: ${result.errors.join(', ')}`);
    }
  };

  const columns = ['', 'User', 'API Product', 'Plan', 'Use Case', 'Requested', 'Actions'];

  const rows = pendingRequests.map((apiKey) => {
    const keyName = apiKey.metadata?.name || '';
    const isSelected = selectedRequests.has(keyName);
    const requestedDate = apiKey.metadata?.creationTimestamp
      ? new Date(apiKey.metadata.creationTimestamp).toLocaleDateString()
      : '-';

    const useCase = apiKey.spec.useCase
      ? apiKey.spec.useCase.length > 40
        ? `${apiKey.spec.useCase.substring(0, 40)}...`
        : apiKey.spec.useCase
      : '-';

    return {
      cells: [
        {
          title: (
            <Checkbox
              id={`select-${keyName}`}
              isChecked={isSelected}
              onChange={() => toggleSelection(keyName)}
              aria-label={`Select ${keyName}`}
            />
          ),
        },
        {
          title: (
            <div>
              <strong>{apiKey.spec.requestedBy.userId}</strong>
              {apiKey.spec.requestedBy.email && (
                <div style={{ fontSize: '12px', color: 'var(--pf-v6-global--Color--200)' }}>
                  {apiKey.spec.requestedBy.email}
                </div>
              )}
            </div>
          ),
        },
        {
          title: (
            <div>
              {apiKey.spec.apiProductRef.name}
              <div style={{ fontSize: '12px', color: 'var(--pf-v6-global--Color--200)' }}>
                {apiKey.metadata?.namespace}
              </div>
            </div>
          ),
        },
        {
          title: <Label isCompact>{apiKey.spec.planTier}</Label>,
        },
        useCase,
        requestedDate,
        {
          title: (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="primary" size="sm" onClick={() => handleApproveClick(apiKey)}>
                {t('Approve')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleRejectClick(apiKey)}>
                {t('Reject')}
              </Button>
            </div>
          ),
        },
      ],
    };
  });

  if (apiKeysError) {
    return <Alert variant="danger" title={t('Error loading approval queue')} />;
  }

  if (!apiKeysLoaded) {
    return <div>{t('Loading...')}</div>;
  }

  if (pendingRequests.length === 0) {
    return (
      <EmptyState icon={ClipboardCheckIcon} titleText={t('No Pending Requests')}>
        <EmptyStateBody>{t('There are no pending API key requests to review.')}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Checkbox
              id="select-all"
              isChecked={
                selectedRequests.size === pendingRequests.length && pendingRequests.length > 0
              }
              onChange={toggleSelectAll}
              label={t('Select all')}
            />
          </ToolbarItem>
          <ToolbarItem>
            <Button
              variant="primary"
              isDisabled={selectedRequests.size === 0}
              onClick={() => {
                setError('');
                setBulkApproveModalOpen(true);
              }}
            >
              {t('Approve Selected')} ({selectedRequests.size})
            </Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button
              variant="danger"
              isDisabled={selectedRequests.size === 0}
              onClick={() => {
                setError('');
                setRejectReason('');
                setBulkRejectModalOpen(true);
              }}
            >
              {t('Reject Selected')} ({selectedRequests.size})
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <Table aria-label="Approval queue table" variant="compact" cells={columns} rows={rows}>
        <TableHeader />
        <TableBody />
      </Table>

      {/* Single Approve Modal */}
      <Modal
        variant="small"
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        aria-labelledby="approve-modal-title"
      >
        <ModalHeader title={t('Approve API Key Request')} />
        <ModalBody>
          <div>
            {t('Are you sure you want to approve this request?')}
            <br />
            <br />
            <strong>{t('User')}:</strong> {selectedRequest?.spec.requestedBy.userId}
            <br />
            <strong>{t('API')}:</strong> {selectedRequest?.spec.apiProductRef.name}
            <br />
            <strong>{t('Plan')}:</strong> {selectedRequest?.spec.planTier}
            <br />
            <br />
            {t('An API key will be generated and made available to the user.')}
          </div>
          {error && <Alert variant="danger" title={error} isInline className="pf-v6-u-mt-md" />}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleApproveConfirm}
            isDisabled={processing}
            isLoading={processing}
          >
            {t('Approve')}
          </Button>
          <Button variant="link" onClick={() => setApproveModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Single Reject Modal */}
      <Modal
        variant="small"
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        aria-labelledby="reject-modal-title"
      >
        <ModalHeader title={t('Reject API Key Request')} />
        <ModalBody>
          <div>
            <strong>{t('User')}:</strong> {selectedRequest?.spec.requestedBy.userId}
            <br />
            <strong>{t('API')}:</strong> {selectedRequest?.spec.apiProductRef.name}
            <br />
            <strong>{t('Plan')}:</strong> {selectedRequest?.spec.planTier}
            <br />
            <br />
            <Content component="h4">{t('Rejection Reason')} *</Content>
            <TextArea
              value={rejectReason}
              onChange={(_event, value) => setRejectReason(value)}
              placeholder={t('Please provide a reason for rejection...')}
              rows={4}
              isRequired
            />
          </div>
          {error && <Alert variant="danger" title={error} isInline className="pf-v6-u-mt-md" />}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={handleRejectConfirm}
            isDisabled={processing}
            isLoading={processing}
          >
            {t('Reject')}
          </Button>
          <Button variant="link" onClick={() => setRejectModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Bulk Approve Modal */}
      <Modal
        variant="small"
        isOpen={bulkApproveModalOpen}
        onClose={() => setBulkApproveModalOpen(false)}
        aria-labelledby="bulk-approve-modal-title"
      >
        <ModalHeader title={t('Approve Selected Requests')} />
        <ModalBody>
          <div>
            {t('Are you sure you want to approve')} <strong>{selectedRequests.size}</strong>{' '}
            {t('request(s)?')}
            <br />
            <br />
            {t('API keys will be generated and made available to the users.')}
          </div>
          {error && <Alert variant="danger" title={error} isInline className="pf-v6-u-mt-md" />}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleBulkApprove}
            isDisabled={processing}
            isLoading={processing}
          >
            {t('Approve All')}
          </Button>
          <Button variant="link" onClick={() => setBulkApproveModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Bulk Reject Modal */}
      <Modal
        variant="small"
        isOpen={bulkRejectModalOpen}
        onClose={() => setBulkRejectModalOpen(false)}
        aria-labelledby="bulk-reject-modal-title"
      >
        <ModalHeader title={t('Reject Selected Requests')} />
        <ModalBody>
          <div>
            {t('Are you sure you want to reject')} <strong>{selectedRequests.size}</strong>{' '}
            {t('request(s)?')}
            <br />
            <br />
            <Content component="h4">{t('Rejection Reason')} *</Content>
            <TextArea
              value={rejectReason}
              onChange={(_event, value) => setRejectReason(value)}
              placeholder={t('Please provide a reason for rejection...')}
              rows={4}
              isRequired
            />
          </div>
          {error && <Alert variant="danger" title={error} isInline className="pf-v6-u-mt-md" />}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={handleBulkReject}
            isDisabled={processing}
            isLoading={processing}
          >
            {t('Reject All')}
          </Button>
          <Button variant="link" onClick={() => setBulkRejectModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
