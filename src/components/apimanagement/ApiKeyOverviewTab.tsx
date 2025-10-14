import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  EmptyState,
  EmptyStateBody,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { CubeIcon } from '@patternfly/react-icons';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Table, TableHeader, TableBody } from '@patternfly/react-table/deprecated';
import { ApiKeyRequest, APIKeyRequestGVK } from '../../types/api-management';

export const ApiKeyOverviewTab: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [filterText, setFilterText] = React.useState('');

  // watch all APIKeyRequest CRs across all namespaces
  const [requests, requestsLoaded, requestsError] = useK8sWatchResource<ApiKeyRequest[]>({
    groupVersionKind: APIKeyRequestGVK,
    isList: true,
    namespace: undefined, // watch all namespaces
  });

  // filter and map approved requests with keys
  const apiKeyMappings = React.useMemo(() => {
    if (!requestsLoaded) return [];

    console.log('ApiKeyOverviewTab - Total requests:', requests.length);
    console.log('ApiKeyOverviewTab - Requests:', requests);

    const approved = requests.filter((req) => req.status?.phase === 'Approved');

    console.log('ApiKeyOverviewTab - Approved requests:', approved.length);
    console.log('ApiKeyOverviewTab - Approved:', approved);

    return approved.map((req) => ({
      user: req.spec.requestedBy.userId || 'unknown',
      email: req.spec.requestedBy.email || '',
      apiName: req.spec.apiName || 'unknown',
      planTier: req.spec.planTier || 'unknown',
      apiKey: req.status?.apiKey || 'not set',
      hostname: req.status?.apiHostname || 'not set',
      createdAt: req.status?.reviewedAt || '',
      requestName: req.metadata.name,
    }));
  }, [requests, requestsLoaded]);

  // apply filter
  const filteredMappings = React.useMemo(() => {
    if (!filterText) return apiKeyMappings;
    const lower = filterText.toLowerCase();
    return apiKeyMappings.filter(
      (mapping) =>
        mapping.user.toLowerCase().includes(lower) ||
        mapping.email.toLowerCase().includes(lower) ||
        mapping.apiName.toLowerCase().includes(lower) ||
        mapping.planTier.toLowerCase().includes(lower) ||
        mapping.hostname.toLowerCase().includes(lower),
    );
  }, [apiKeyMappings, filterText]);

  if (requestsError) {
    return (
      <Alert variant="danger" title={t('Error loading API key mappings')} isInline>
        {requestsError.message}
      </Alert>
    );
  }

  if (!requestsLoaded) {
    return <div>{t('Loading...')}</div>;
  }

  if (apiKeyMappings.length === 0) {
    return (
      <EmptyState icon={CubeIcon} titleText={t('No API keys')}>
        <EmptyStateBody>{t('No approved API keys have been issued yet.')}</EmptyStateBody>
      </EmptyState>
    );
  }

  const columns = [
    t('User'),
    t('Email'),
    t('API'),
    t('Plan'),
    t('Hostname'),
    t('API Key'),
    t('Created'),
  ];

  const rows = filteredMappings.map((mapping) => ({
    cells: [
      mapping.user,
      mapping.email,
      mapping.apiName,
      mapping.planTier,
      {
        title: <code style={{ fontSize: '12px' }}>{mapping.hostname}</code>,
      },
      {
        title: (
          <code style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            {mapping.apiKey.substring(0, 16)}...
          </code>
        ),
      },
      mapping.createdAt ? new Date(mapping.createdAt).toLocaleDateString() : '-',
    ],
  }));

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder={t('Filter by user, API, or hostname')}
              value={filterText}
              onChange={(_event, value) => setFilterText(value)}
              onClear={() => setFilterText('')}
            />
          </ToolbarItem>
          <ToolbarItem variant="separator" />
          <ToolbarItem>
            <span style={{ fontWeight: 'bold' }}>
              {t('Total: {{count}} API keys', { count: apiKeyMappings.length })}
            </span>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filteredMappings.length === 0 ? (
        <EmptyState variant="sm" titleText={t('No results found')}>
          <EmptyStateBody>
            {t('No API keys match the current filter criteria.')}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="API key mappings table" variant="compact" cells={columns} rows={rows}>
          <TableHeader />
          <TableBody />
        </Table>
      )}
    </>
  );
};
