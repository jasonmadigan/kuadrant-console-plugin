import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableHeader, TableBody } from '@patternfly/react-table/deprecated';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  Modal /* data-codemods */,
  ModalBody /* data-codemods */,
  ModalFooter /* data-codemods */,
  ModalHeader /* data-codemods */,
  TextArea,
  Alert,
  Content,
} from '@patternfly/react-core';
import { ClipboardCheckIcon } from '@patternfly/react-icons';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { ApiKeyRequest, APIKeyRequestGVK } from '../../types/api-management';
import { approveRequest, rejectRequest } from '../../utils/approval-operations';

interface ApprovalQueueTabProps {
  userId: string;
}

export const ApprovalQueueTab: React.FC<ApprovalQueueTabProps> = ({ userId }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [approveModalOpen, setApproveModalOpen] = React.useState(false);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<ApiKeyRequest | null>(null);
  const [rejectComment, setRejectComment] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState('');

  // watch all APIKeyRequest CRs across all namespaces
  const [requests, requestsLoaded, requestsError] = useK8sWatchResource<ApiKeyRequest[]>({
    groupVersionKind: APIKeyRequestGVK,
    isList: true,
    namespace: undefined, // watch all namespaces
  });

  // filter to pending requests only
  // include requests with undefined status (newly created CRs)
  const pendingRequests = React.useMemo(() => {
    if (!requestsLoaded) return [];
    return requests.filter((req) => !req.status?.phase || req.status.phase === 'Pending');
  }, [requests, requestsLoaded]);

  const handleApproveClick = (request: ApiKeyRequest) => {
    setSelectedRequest(request);
    setError('');
    setApproveModalOpen(true);
  };

  const handleRejectClick = (request: ApiKeyRequest) => {
    setSelectedRequest(request);
    setRejectComment('');
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
      comment: '',
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

    if (!rejectComment.trim()) {
      setError('rejection reason is required');
      return;
    }

    setProcessing(true);
    setError('');

    const result = await rejectRequest({
      request: selectedRequest,
      reviewedBy: userId,
      comment: rejectComment.trim(),
    });

    setProcessing(false);

    if (result.success) {
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectComment('');
    } else {
      setError(result.error || 'failed to reject request');
    }
  };

  const columns = ['User', 'Email', 'API', 'Namespace', 'Plan', 'Use Case', 'Requested', 'Actions'];

  const rows = pendingRequests.map((req) => {
    const requestedDate = req.spec.requestedAt
      ? new Date(req.spec.requestedAt).toLocaleDateString()
      : 'unknown';

    const useCase = req.spec.useCase
      ? req.spec.useCase.length > 50
        ? `${req.spec.useCase.substring(0, 50)}...`
        : req.spec.useCase
      : '-';

    return {
      cells: [
        req.spec.requestedBy.userId,
        req.spec.requestedBy.email,
        req.spec.apiName,
        req.spec.apiNamespace,
        req.spec.planTier,
        useCase,
        requestedDate,
        {
          title: (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="primary" size="sm" onClick={() => handleApproveClick(req)}>
                {t('Approve')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleRejectClick(req)}>
                {t('Reject')}
              </Button>
            </div>
          ),
        },
      ],
    };
  });

  if (requestsError) {
    return <Alert variant="danger" title={t('Error loading approval queue')} />;
  }

  if (!requestsLoaded) {
    return <div>{t('Loading...')}</div>;
  }

  if (pendingRequests.length === 0) {
    return (
      <EmptyState icon={ClipboardCheckIcon} titleText={t('No Pending Requests')}>
        <EmptyStateBody>{t('There are no pending API access requests to review.')}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Table aria-label="Approval queue table" variant="compact" cells={columns} rows={rows}>
        <TableHeader />
        <TableBody />
      </Table>

      <Modal
        variant="small"
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        aria-labelledby="approve-modal-title"
        aria-describedby="approve-modal-body"
      >
        <ModalHeader title={t('Approve API Access Request')} />
        <ModalBody>
          <div>
            {t('Are you sure you want to approve this request?')}
            <br />
            <br />
            <strong>{t('User')}:</strong> {selectedRequest?.spec.requestedBy.userId}
            <br />
            <strong>{t('API')}:</strong> {selectedRequest?.spec.apiName}
            <br />
            <strong>{t('Plan')}:</strong> {selectedRequest?.spec.planTier}
            <br />
            <br />
            {t('An API key will be generated and made available to the user.')}
          </div>
          {error && <Alert variant="danger" title={error} isInline />}
        </ModalBody>
        <ModalFooter>
          <Button
            key="approve"
            variant="primary"
            onClick={handleApproveConfirm}
            isDisabled={processing}
            isLoading={processing}
          >
            {t('Approve')}
          </Button>
          <Button key="cancel" variant="link" onClick={() => setApproveModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        variant="small"
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        aria-labelledby="reject-modal-title"
        aria-describedby="reject-modal-body"
      >
        <ModalHeader title={t('Reject API Access Request')} />
        <ModalBody>
          <div>
            <strong>{t('User')}:</strong> {selectedRequest?.spec.requestedBy.userId}
            <br />
            <strong>{t('API')}:</strong> {selectedRequest?.spec.apiName}
            <br />
            <strong>{t('Plan')}:</strong> {selectedRequest?.spec.planTier}
            <br />
            <br />
            <Content component="h4">{t('Rejection Reason')} *</Content>
            <TextArea
              value={rejectComment}
              onChange={(_event, value) => setRejectComment(value)}
              placeholder={t('Please provide a reason for rejection...')}
              rows={4}
              isRequired
            />
          </div>
          {error && <Alert variant="danger" title={error} isInline />}
        </ModalBody>
        <ModalFooter>
          <Button
            key="reject"
            variant="danger"
            onClick={handleRejectConfirm}
            isDisabled={processing}
            isLoading={processing}
          >
            {t('Reject')}
          </Button>
          <Button key="cancel" variant="link" onClick={() => setRejectModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
