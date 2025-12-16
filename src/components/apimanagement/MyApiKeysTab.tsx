import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableHeader, TableBody } from '@patternfly/react-table/deprecated';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  Label,
  Alert,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ClipboardCopy,
  Tooltip,
} from '@patternfly/react-core';
import { KeyIcon, EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { APIKey, APIKeyGVK } from '../../types/api-management';
import { filterAPIKeysByUser } from '../../utils/api-key-utils';
import { revealApiKeySecret } from '../../utils/secret-operations';

interface MyApiKeysTabProps {
  userId: string;
}

export const MyApiKeysTab: React.FC<MyApiKeysTabProps> = ({ userId }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [revealedKeys, setRevealedKeys] = React.useState<Map<string, string>>(new Map());
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [selectedKey, setSelectedKey] = React.useState<APIKey | null>(null);
  const [revealing, setRevealing] = React.useState(false);
  const [revealError, setRevealError] = React.useState('');

  // watch APIKey CRs across all namespaces
  const [apiKeys, apiKeysLoaded, apiKeysError] = useK8sWatchResource<APIKey[]>({
    groupVersionKind: APIKeyGVK,
    isList: true,
    namespaced: false,
  });

  // filter to user's approved keys
  const approvedKeys = React.useMemo(() => {
    if (!apiKeysLoaded || !apiKeys) return [];
    const userKeys = filterAPIKeysByUser(apiKeys, userId);
    return userKeys.filter((key) => key.status?.phase === 'Approved');
  }, [apiKeys, apiKeysLoaded, userId]);

  const handleRevealClick = (apiKey: APIKey) => {
    const keyName = apiKey.metadata?.name || '';

    // if already revealed in this session, just toggle visibility
    if (revealedKeys.has(keyName)) {
      setRevealedKeys((prev) => {
        const newMap = new Map(prev);
        newMap.delete(keyName);
        return newMap;
      });
      return;
    }

    // if can't read secret anymore, show tooltip instead
    if (apiKey.status?.canReadSecret === false) {
      return;
    }

    // show confirmation modal
    setSelectedKey(apiKey);
    setRevealError('');
    setConfirmModalOpen(true);
  };

  const handleConfirmReveal = async () => {
    if (!selectedKey) return;

    setRevealing(true);
    setRevealError('');

    const result = await revealApiKeySecret(selectedKey);

    setRevealing(false);

    if (result.success && result.value) {
      const keyName = selectedKey.metadata?.name || '';
      setRevealedKeys((prev) => {
        const newMap = new Map(prev);
        newMap.set(keyName, result.value!);
        return newMap;
      });
      setConfirmModalOpen(false);
    } else {
      setRevealError(result.error || 'failed to reveal key');
    }
  };

  const hideKey = (keyName: string) => {
    setRevealedKeys((prev) => {
      const newMap = new Map(prev);
      newMap.delete(keyName);
      return newMap;
    });
  };

  const formatLimits = (apiKey: APIKey): string => {
    const limits = apiKey.status?.limits;
    if (!limits) return '-';
    const parts: string[] = [];
    if (limits.daily) parts.push(`${limits.daily.toLocaleString()}/day`);
    if (limits.weekly) parts.push(`${limits.weekly.toLocaleString()}/week`);
    if (limits.monthly) parts.push(`${limits.monthly.toLocaleString()}/month`);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const columns = ['API', 'Plan', 'Limits', 'API Key', 'Approved'];

  const rows = approvedKeys.map((apiKey) => {
    const keyName = apiKey.metadata?.name || '';
    const apiProductName = apiKey.spec.apiProductRef.name;
    const planTier = apiKey.spec.planTier;
    const isRevealed = revealedKeys.has(keyName);
    const revealedValue = revealedKeys.get(keyName);
    const canReveal = apiKey.status?.canReadSecret !== false;

    const approvedDate = apiKey.status?.reviewedAt
      ? new Date(apiKey.status.reviewedAt).toLocaleDateString()
      : '-';

    return {
      cells: [
        apiProductName,
        {
          title: <Label isCompact>{planTier}</Label>,
        },
        formatLimits(apiKey),
        {
          title: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isRevealed ? (
                <>
                  <ClipboardCopy
                    isReadOnly
                    hoverTip={t('Copy')}
                    clickTip={t('Copied')}
                    variant="inline-compact"
                  >
                    {revealedValue}
                  </ClipboardCopy>
                  <Button
                    variant="plain"
                    onClick={() => hideKey(keyName)}
                    aria-label={t('hide key')}
                  >
                    <EyeSlashIcon />
                  </Button>
                </>
              ) : canReveal ? (
                <>
                  <code style={{ fontSize: '12px', color: 'var(--pf-v6-global--Color--200)' }}>
                    {'••••••••••••••••'}
                  </code>
                  <Button
                    variant="plain"
                    onClick={() => handleRevealClick(apiKey)}
                    aria-label={t('reveal key')}
                  >
                    <EyeIcon />
                  </Button>
                </>
              ) : (
                <Tooltip
                  content={t('This key has already been revealed and cannot be shown again.')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code style={{ fontSize: '12px', color: 'var(--pf-v6-global--Color--200)' }}>
                      {'••••••••••••••••'}
                    </code>
                    <EyeSlashIcon color="var(--pf-v6-global--Color--200)" />
                  </span>
                </Tooltip>
              )}
            </div>
          ),
        },
        approvedDate,
      ],
    };
  });

  if (apiKeysError) {
    return <Alert variant="danger" title={t('Error loading API keys')} />;
  }

  if (!apiKeysLoaded) {
    return <div>{t('Loading...')}</div>;
  }

  if (approvedKeys.length === 0) {
    return (
      <EmptyState icon={KeyIcon} titleText={t('No API Keys')}>
        <EmptyStateBody>
          {t('You do not have any approved API keys yet. Visit Browse APIs to request access.')}
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Table aria-label="My API keys table" variant="compact" cells={columns} rows={rows}>
        <TableHeader />
        <TableBody />
      </Table>

      <Modal
        variant="small"
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        aria-labelledby="reveal-modal-title"
      >
        <ModalHeader title={t('Reveal API Key')} />
        <ModalBody>
          <Alert variant="warning" isInline title={t('One-time view')}>
            {t(
              'This API key can only be viewed once. After you close this dialog, the key will be masked and cannot be revealed again. Make sure to copy and store it securely.',
            )}
          </Alert>
          {revealError && (
            <Alert variant="danger" isInline title={revealError} className="pf-v6-u-mt-md" />
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            key="reveal"
            variant="primary"
            onClick={handleConfirmReveal}
            isDisabled={revealing}
            isLoading={revealing}
          >
            {t('Reveal Key')}
          </Button>
          <Button key="cancel" variant="link" onClick={() => setConfirmModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
