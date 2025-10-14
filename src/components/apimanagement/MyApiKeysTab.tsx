import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableHeader, TableBody } from '@patternfly/react-table/deprecated';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  Label,
  Alert,
} from '@patternfly/react-core';
import { KeyIcon, EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { useK8sWatchResource, useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';
import { ApiKeyRequest, APIKeyRequestGVK } from '../../types/api-management';
import { filterRequestsByUser } from '../../utils/api-key-utils';

interface MyApiKeysTabProps {
  userId: string;
}

export const MyApiKeysTab: React.FC<MyApiKeysTabProps> = ({ userId }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [activeNamespace] = useActiveNamespace();
  const [revealedKeys, setRevealedKeys] = React.useState<Set<string>>(new Set());

  // watch APIKeyRequest CRs in active namespace
  const watchNamespace = activeNamespace === '#ALL_NS#' ? undefined : activeNamespace;

  const [requests, requestsLoaded, requestsError] = useK8sWatchResource<ApiKeyRequest[]>({
    groupVersionKind: APIKeyRequestGVK,
    isList: true,
    namespace: watchNamespace,
  });

  // filter to user's approved requests with api keys
  const approvedApis = React.useMemo(() => {
    if (!requestsLoaded) return [];
    const userRequests = filterRequestsByUser(requests, userId);
    // only show approved requests that have api keys
    return userRequests.filter(
      (req) => req.status?.phase === 'Approved' && req.status?.apiKey,
    );
  }, [requests, requestsLoaded, userId]);

  const toggleReveal = (requestName: string) => {
    setRevealedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(requestName)) {
        newSet.delete(requestName);
      } else {
        newSet.add(requestName);
      }
      return newSet;
    });
  };

  const columns = ['API Name', 'Namespace', 'Plan Tier', 'API Key', 'Approved Date'];

  const rows = approvedApis.map((request) => {
    const apiName = request.spec.apiName || 'unknown';
    const planTier = request.spec.planTier || 'unknown';
    const isRevealed = revealedKeys.has(request.metadata.name);
    const keyValue = isRevealed ? request.status?.apiKey : '••••••••••••••••';

    const approvedDate = request.status?.reviewedAt
      ? new Date(request.status.reviewedAt).toLocaleDateString()
      : 'unknown';

    return {
      cells: [
        apiName,
        request.spec.apiNamespace,
        {
          title: (
            <Label
              color={planTier === 'gold' ? 'yellow' : planTier === 'silver' ? 'grey' : 'orange'}
            >
              {planTier}
            </Label>
          ),
        },
        {
          title: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{ fontSize: '12px' }}>{keyValue}</code>
              <Button
                variant="plain"
                onClick={() => toggleReveal(request.metadata.name)}
                aria-label={isRevealed ? 'hide key' : 'show key'}
              >
                {isRevealed ? <EyeSlashIcon /> : <EyeIcon />}
              </Button>
            </div>
          ),
        },
        approvedDate,
      ],
    };
  });

  if (requestsError) {
    return <Alert variant="danger" title={t('Error loading API keys')} />;
  }

  if (!requestsLoaded) {
    return <div>{t('Loading...')}</div>;
  }

  if (approvedApis.length === 0) {
    return (
      <EmptyState icon={KeyIcon} titleText={t('No API Keys')}>
        <EmptyStateBody>
          {t('You do not have any API keys yet. Visit the Browse APIs tab to request access.')}
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label="My API keys table" variant="compact" cells={columns} rows={rows}>
      <TableHeader />
      <TableBody />
    </Table>
  );
};
