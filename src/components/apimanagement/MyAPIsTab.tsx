import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  EmptyState,
  EmptyStateBody,
  Alert,
  Card,
  CardBody,
  CardTitle,
  Title,
  Content,
  Label,
  Button,
  ExpandableSection,
  Grid,
  GridItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import {
  CubeIcon,
  ExternalLinkAltIcon,
  EyeIcon,
  EyeSlashIcon,
  CopyIcon,
} from '@patternfly/react-icons';
import { useK8sWatchResource, useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';
import { ApiKeyRequest, APIKeyRequestGVK } from '../../types/api-management';
import { filterRequestsByUser } from '../../utils/api-key-utils';
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode';
import './MyAPIsTab.css';

interface ApiCardProps {
  request: ApiKeyRequest;
  isKeyRevealed: boolean;
  onToggleReveal: (requestName: string) => void;
}

const ApiCard: React.FC<ApiCardProps> = ({ request, isKeyRevealed, onToggleReveal }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const apiKey = request.status?.apiKey || '';
  const displayKey = isKeyRevealed ? apiKey : '••••••••••••••••';
  const baseUrl = `https://${request.status?.apiHostname}${request.status?.apiBasePath || ''}`;
  const planTier = request.spec.planTier;

  const copyToClipboard = (text: string, type: 'key' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const curlExample = `curl -H "Authorization: APIKEY ${apiKey}" \\
  ${baseUrl}/your-endpoint`;

  const jsExample = `fetch('${baseUrl}/your-endpoint', {
  headers: {
    'Authorization': 'APIKEY ${apiKey}'
  }
});`;

  const pythonExample = `import requests

response = requests.get(
  '${baseUrl}/your-endpoint',
  headers={'Authorization': 'APIKEY ${apiKey}'}
)`;

  const goExample = `package main

import (
  "net/http"
)

func main() {
  req, _ := http.NewRequest("GET", "${baseUrl}/your-endpoint", nil)
  req.Header.Add("Authorization", "APIKEY ${apiKey}")
  client := &http.Client{}
  resp, _ := client.Do(req)
}`;

  return (
    <GridItem key={request.metadata.name} span={12} lg={6}>
      <Card isFullHeight className="kuadrant-api-card">
        <CardTitle>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Title headingLevel="h3" size="lg">
              {request.spec.apiName}
            </Title>
            <Label
              color={
                planTier === 'gold' ? 'yellow' : planTier === 'silver' ? 'grey' : 'orange'
              }
            >
              {planTier}
            </Label>
          </div>
        </CardTitle>
        <CardBody>
          {request.status?.apiDescription && (
            <Content component="p" style={{ marginBottom: '16px' }}>
              {request.status.apiDescription}
            </Content>
          )}

          <div style={{ marginBottom: '16px' }}>
            <strong>{t('Endpoint')}:</strong>
            <br />
            <code style={{ fontSize: '13px' }}>{baseUrl}</code>
          </div>

          {request.status?.planLimits && (
            <div style={{ marginBottom: '16px' }}>
              <strong>{t('Rate Limits')}:</strong>
              <ul style={{ marginTop: '4px', marginBottom: 0 }}>
                {request.status.planLimits.daily && (
                  <li>{t('Daily')}: {request.status.planLimits.daily.toLocaleString()} requests</li>
                )}
                {request.status.planLimits.weekly && (
                  <li>{t('Weekly')}: {request.status.planLimits.weekly.toLocaleString()} requests</li>
                )}
                {request.status.planLimits.monthly && (
                  <li>{t('Monthly')}: {request.status.planLimits.monthly.toLocaleString()} requests</li>
                )}
                {request.status.planLimits.custom?.map((limit, idx) => (
                  <li key={idx}>{limit.limit.toLocaleString()} requests per {limit.window}</li>
                ))}
              </ul>
            </div>
          )}

          {(request.status?.apiOasUrl || request.status?.apiOasUiUrl) && (
            <div style={{ marginBottom: '16px' }}>
              {request.status.apiOasUiUrl && (
                <Button
                  variant="link"
                  isInline
                  icon={<ExternalLinkAltIcon />}
                  iconPosition="end"
                  component="a"
                  href={request.status.apiOasUiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('View API Documentation')}
                </Button>
              )}
              {request.status.apiOasUrl && (
                <Button
                  variant="link"
                  isInline
                  icon={<ExternalLinkAltIcon />}
                  iconPosition="end"
                  component="a"
                  href={request.status.apiOasUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: '8px' }}
                >
                  {t('OpenAPI Spec')}
                </Button>
              )}
            </div>
          )}

          <ExpandableSection toggleText={t('Show API Key & Examples')}>
            <div style={{ marginTop: '8px' }}>
              <strong>{t('Your API Key')}:</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <code
                  style={{
                    fontSize: '12px',
                    flex: 1,
                    padding: '4px 8px',
                    backgroundColor: 'var(--pf-v6-global--BackgroundColor--dark-100)',
                    borderRadius: 'var(--pf-v6-global--BorderRadius--sm)',
                  }}
                >
                  {displayKey}
                </code>
                <Button
                  variant="plain"
                  onClick={() => onToggleReveal(request.metadata.name)}
                  aria-label={isKeyRevealed ? 'hide key' : 'show key'}
                >
                  {isKeyRevealed ? <EyeSlashIcon /> : <EyeIcon />}
                </Button>
                {isKeyRevealed && (
                  <Button
                    variant="plain"
                    onClick={() => copyToClipboard(apiKey, 'key')}
                    aria-label="copy api key"
                  >
                    <CopyIcon />
                  </Button>
                )}
                {copiedKey && <span style={{ fontSize: '12px', color: 'var(--pf-v6-global--success-color--100)' }}>Copied!</span>}
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <strong>{t('Code Examples')}:</strong>
              <Tabs
                activeKey={activeTabKey}
                onSelect={(_event, tabIndex) => setActiveTabKey(tabIndex)}
                style={{ marginTop: '8px' }}
              >
                <Tab eventKey={0} title={<TabTitleText>cURL</TabTitleText>}>
                  <div style={{ marginTop: '8px', position: 'relative' }}>
                    <SyntaxHighlightedCode code={curlExample} language="bash" />
                    <Button
                      variant="plain"
                      onClick={() => copyToClipboard(curlExample, 'code')}
                      aria-label="copy code"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                    >
                      <CopyIcon />
                    </Button>
                    {copiedCode === curlExample && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '40px',
                          fontSize: '12px',
                          color: 'var(--pf-v6-global--success-color--100)',
                        }}
                      >
                        Copied!
                      </span>
                    )}
                  </div>
                </Tab>
                <Tab eventKey={1} title={<TabTitleText>JavaScript</TabTitleText>}>
                  <div style={{ marginTop: '8px', position: 'relative' }}>
                    <SyntaxHighlightedCode code={jsExample} language="javascript" />
                    <Button
                      variant="plain"
                      onClick={() => copyToClipboard(jsExample, 'code')}
                      aria-label="copy code"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                    >
                      <CopyIcon />
                    </Button>
                    {copiedCode === jsExample && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '40px',
                          fontSize: '12px',
                          color: 'var(--pf-v6-global--success-color--100)',
                        }}
                      >
                        Copied!
                      </span>
                    )}
                  </div>
                </Tab>
                <Tab eventKey={2} title={<TabTitleText>Python</TabTitleText>}>
                  <div style={{ marginTop: '8px', position: 'relative' }}>
                    <SyntaxHighlightedCode code={pythonExample} language="python" />
                    <Button
                      variant="plain"
                      onClick={() => copyToClipboard(pythonExample, 'code')}
                      aria-label="copy code"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                    >
                      <CopyIcon />
                    </Button>
                    {copiedCode === pythonExample && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '40px',
                          fontSize: '12px',
                          color: 'var(--pf-v6-global--success-color--100)',
                        }}
                      >
                        Copied!
                      </span>
                    )}
                  </div>
                </Tab>
                <Tab eventKey={3} title={<TabTitleText>Go</TabTitleText>}>
                  <div style={{ marginTop: '8px', position: 'relative' }}>
                    <SyntaxHighlightedCode code={goExample} language="go" />
                    <Button
                      variant="plain"
                      onClick={() => copyToClipboard(goExample, 'code')}
                      aria-label="copy code"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                    >
                      <CopyIcon />
                    </Button>
                    {copiedCode === goExample && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '40px',
                          fontSize: '12px',
                          color: 'var(--pf-v6-global--success-color--100)',
                        }}
                      >
                        Copied!
                      </span>
                    )}
                  </div>
                </Tab>
              </Tabs>
            </div>
          </ExpandableSection>
        </CardBody>
      </Card>
    </GridItem>
  );
};

interface MyAPIsTabProps {
  userId: string;
}

export const MyAPIsTab: React.FC<MyAPIsTabProps> = ({ userId }) => {
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

  // filter to user's approved requests with api metadata populated
  const approvedApis = React.useMemo(() => {
    if (!requestsLoaded) return [];
    const userRequests = filterRequestsByUser(requests, userId);
    // only show approved requests that have api metadata populated
    return userRequests.filter(
      (req) =>
        req.status?.phase === 'Approved' && req.status?.apiKey && req.status?.apiHostname,
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

  if (requestsError) {
    return (
      <Alert variant="danger" title={t('Error loading APIs')} isInline>
        {requestsError.message}
      </Alert>
    );
  }

  if (!requestsLoaded) {
    return <div>{t('Loading...')}</div>;
  }

  if (approvedApis.length === 0) {
    return (
      <EmptyState icon={CubeIcon} titleText={t('No APIs')}>
        <EmptyStateBody>
          {t(
            'You do not have access to any APIs yet. Visit the Browse APIs tab to request access.',
          )}
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Grid hasGutter>
      {approvedApis.map((request) => (
        <ApiCard
          key={request.metadata.name}
          request={request}
          isKeyRevealed={revealedKeys.has(request.metadata.name)}
          onToggleReveal={toggleReveal}
        />
      ))}
    </Grid>
  );
};
