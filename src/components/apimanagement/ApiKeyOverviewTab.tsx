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
  Label,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { CubeIcon } from '@patternfly/react-icons';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Table, TableHeader, TableBody } from '@patternfly/react-table/deprecated';
import { APIKey, APIKeyGVK } from '../../types/api-management';

export const ApiKeyOverviewTab: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [filterText, setFilterText] = React.useState('');

  // watch all APIKey CRs across all namespaces
  const [apiKeys, apiKeysLoaded, apiKeysError] = useK8sWatchResource<APIKey[]>({
    groupVersionKind: APIKeyGVK,
    isList: true,
    namespaced: false,
  });

  // compute stats
  const stats = React.useMemo(() => {
    if (!apiKeysLoaded || !apiKeys) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        byProduct: {} as Record<string, number>,
      };
    }

    const pending = apiKeys.filter((k) => !k.status?.phase || k.status.phase === 'Pending').length;
    const approved = apiKeys.filter((k) => k.status?.phase === 'Approved').length;
    const rejected = apiKeys.filter((k) => k.status?.phase === 'Rejected').length;

    const byProduct: Record<string, number> = {};
    apiKeys.forEach((k) => {
      const productName = k.spec.apiProductRef.name;
      byProduct[productName] = (byProduct[productName] || 0) + 1;
    });

    return { total: apiKeys.length, pending, approved, rejected, byProduct };
  }, [apiKeys, apiKeysLoaded]);

  // filter approved keys for the table
  const approvedKeys = React.useMemo(() => {
    if (!apiKeysLoaded || !apiKeys) return [];
    return apiKeys.filter((k) => k.status?.phase === 'Approved');
  }, [apiKeys, apiKeysLoaded]);

  // apply filter
  const filteredKeys = React.useMemo(() => {
    if (!filterText) return approvedKeys;
    const lower = filterText.toLowerCase();
    return approvedKeys.filter(
      (key) =>
        key.spec.requestedBy.userId.toLowerCase().includes(lower) ||
        (key.spec.requestedBy.email || '').toLowerCase().includes(lower) ||
        key.spec.apiProductRef.name.toLowerCase().includes(lower) ||
        key.spec.planTier.toLowerCase().includes(lower),
    );
  }, [approvedKeys, filterText]);

  if (apiKeysError) {
    return (
      <Alert variant="danger" title={t('Error loading API keys')} isInline>
        {(apiKeysError as any).message}
      </Alert>
    );
  }

  if (!apiKeysLoaded) {
    return <div>{t('Loading...')}</div>;
  }

  const columns = [t('User'), t('API Product'), t('Plan'), t('Namespace'), t('Approved')];

  const rows = filteredKeys.map((key) => ({
    cells: [
      {
        title: (
          <div>
            <strong>{key.spec.requestedBy.userId}</strong>
            {key.spec.requestedBy.email && (
              <div style={{ fontSize: '12px', color: 'var(--pf-v6-global--Color--200)' }}>
                {key.spec.requestedBy.email}
              </div>
            )}
          </div>
        ),
      },
      key.spec.apiProductRef.name,
      {
        title: <Label isCompact>{key.spec.planTier}</Label>,
      },
      key.metadata?.namespace,
      key.status?.reviewedAt ? new Date(key.status.reviewedAt).toLocaleDateString() : '-',
    ],
  }));

  return (
    <>
      {/* Stats Cards */}
      <Grid hasGutter style={{ marginBottom: '24px' }}>
        <GridItem span={3}>
          <Card isCompact>
            <CardTitle>{t('Total API Keys')}</CardTitle>
            <CardBody>
              <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</span>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card isCompact>
            <CardTitle>{t('Pending')}</CardTitle>
            <CardBody>
              <span
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: 'var(--pf-v6-global--warning-color--100)',
                }}
              >
                {stats.pending}
              </span>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card isCompact>
            <CardTitle>{t('Approved')}</CardTitle>
            <CardBody>
              <span
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: 'var(--pf-v6-global--success-color--100)',
                }}
              >
                {stats.approved}
              </span>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card isCompact>
            <CardTitle>{t('Rejected')}</CardTitle>
            <CardBody>
              <span
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: 'var(--pf-v6-global--danger-color--100)',
                }}
              >
                {stats.rejected}
              </span>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Keys by Product */}
      {Object.keys(stats.byProduct).length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <CardTitle>{t('Keys by API Product')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal isCompact>
              {Object.entries(stats.byProduct)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([product, count]) => (
                  <DescriptionListGroup key={product}>
                    <DescriptionListTerm>{product}</DescriptionListTerm>
                    <DescriptionListDescription>{count} keys</DescriptionListDescription>
                  </DescriptionListGroup>
                ))}
            </DescriptionList>
          </CardBody>
        </Card>
      )}

      {/* Approved Keys Table */}
      <Card>
        <CardTitle>{t('Active API Keys')}</CardTitle>
        <CardBody>
          {approvedKeys.length === 0 ? (
            <EmptyState icon={CubeIcon} titleText={t('No active API keys')}>
              <EmptyStateBody>{t('No approved API keys have been issued yet.')}</EmptyStateBody>
            </EmptyState>
          ) : (
            <>
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <SearchInput
                      placeholder={t('Filter by user, API, or plan')}
                      value={filterText}
                      onChange={(_event, value) => setFilterText(value)}
                      onClear={() => setFilterText('')}
                    />
                  </ToolbarItem>
                  <ToolbarItem variant="separator" />
                  <ToolbarItem>
                    <span style={{ fontWeight: 'bold' }}>
                      {t('Showing: {{count}} of {{total}}', {
                        count: filteredKeys.length,
                        total: approvedKeys.length,
                      })}
                    </span>
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>

              {filteredKeys.length === 0 ? (
                <EmptyState variant="sm" titleText={t('No results found')}>
                  <EmptyStateBody>
                    {t('No API keys match the current filter criteria.')}
                  </EmptyStateBody>
                </EmptyState>
              ) : (
                <Table aria-label="API keys table" variant="compact" cells={columns} rows={rows}>
                  <TableHeader />
                  <TableBody />
                </Table>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
};
