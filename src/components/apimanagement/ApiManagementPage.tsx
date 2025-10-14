import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useHistory } from 'react-router-dom';
import { PageSection, Title, Tabs, Tab, TabTitleText } from '@patternfly/react-core';
import { BrowseAPIsTab } from './BrowseAPIsTab';
import { MyAPIsTab } from './MyAPIsTab';
import { MyApiKeysTab } from './MyApiKeysTab';
import { MyRequestsTab } from './MyRequestsTab';
import { ApprovalQueueTab } from './ApprovalQueueTab';
import { ApiKeyOverviewTab } from './ApiKeyOverviewTab';
import {
  useK8sWatchResource,
  NamespaceBar,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';

const ApiManagementPage: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const { ns } = useParams<{ ns: string }>();
  const [activeNamespace, setActiveNamespace] = useActiveNamespace();
  const history = useHistory();
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);
  const [requestRefresh, setRequestRefresh] = React.useState(0);

  // sync namespace from URL
  React.useEffect(() => {
    if (ns && ns !== activeNamespace) {
      setActiveNamespace(ns);
    }
  }, [ns, activeNamespace, setActiveNamespace]);

  // get current user - for now use a default, this will be replaced with actual console SDK user context
  const userId = 'developer';
  const userEmail = 'developer@example.com';

  // check if user has permission to view approval queue by watching configmaps across all namespaces
  const [configMaps, loaded] = useK8sWatchResource<any[]>({
    groupVersionKind: { group: '', version: 'v1', kind: 'ConfigMap' },
    isList: true,
    namespace: undefined, // watch all namespaces to check admin permissions
  });

  // simple permission check - if we can list all configmaps across namespaces, show admin tabs
  const canApproveRequests = loaded && Array.isArray(configMaps);

  const handleTabClick = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  const handleRequestCreated = () => {
    // trigger refresh of My Requests tab by incrementing counter
    setRequestRefresh((prev) => prev + 1);
    // switch to My Requests tab
    setActiveTabKey(3);
  };

  const tabs = React.useMemo(() => {
    const allTabs = [
      <Tab
        key="browse"
        eventKey={0}
        title={<TabTitleText>{t('Browse APIs')}</TabTitleText>}
        aria-label="Browse APIs tab"
      >
        <div className="pf-v6-u-mt-md">
          <BrowseAPIsTab
            userId={userId}
            userEmail={userEmail}
            onRequestCreated={handleRequestCreated}
          />
        </div>
      </Tab>,
      <Tab
        key="my-apis"
        eventKey={1}
        title={<TabTitleText>{t('My APIs')}</TabTitleText>}
        aria-label="My APIs tab"
      >
        <div className="pf-v6-u-mt-md">
          <MyAPIsTab userId={userId} />
        </div>
      </Tab>,
      <Tab
        key="my-keys"
        eventKey={2}
        title={<TabTitleText>{t('My API Keys')}</TabTitleText>}
        aria-label="My API Keys tab"
      >
        <div className="pf-v6-u-mt-md">
          <MyApiKeysTab userId={userId} />
        </div>
      </Tab>,
      <Tab
        key="my-requests"
        eventKey={3}
        title={<TabTitleText>{t('My Requests')}</TabTitleText>}
        aria-label="My Requests tab"
      >
        <div className="pf-v6-u-mt-md">
          <MyRequestsTab key={requestRefresh} userId={userId} />
        </div>
      </Tab>,
    ];

    if (canApproveRequests) {
      allTabs.push(
        <Tab
          key="approval-queue"
          eventKey={4}
          title={<TabTitleText>{t('Approval Queue')}</TabTitleText>}
          aria-label="Approval Queue tab"
        >
          <div className="pf-v6-u-mt-md">
            <ApprovalQueueTab userId={userId} />
          </div>
        </Tab>,
        <Tab
          key="api-key-overview"
          eventKey={5}
          title={<TabTitleText>{t('API Key Overview')}</TabTitleText>}
          aria-label="API Key Overview tab"
        >
          <div className="pf-v6-u-mt-md">
            <ApiKeyOverviewTab />
          </div>
        </Tab>,
      );
    }

    return allTabs;
  }, [canApproveRequests, userId, userEmail, requestRefresh, handleRequestCreated, t]);

  const handleNamespaceChange = (newNamespace: string) => {
    if (newNamespace !== '#ALL_NS#') {
      history.replace(`/api-management/ns/${newNamespace}`);
    } else {
      history.replace('/api-management/all-namespaces');
    }
  };

  return (
    <>
      <NamespaceBar onNamespaceChange={handleNamespaceChange} />
      <PageSection variant="default">
        <Title headingLevel="h1" className="pf-v6-u-mb-md">
          {t('API Management')}
        </Title>
        <p className="pf-v6-u-mb-lg">
          {t('Request and manage API keys with plan-based rate limiting')}
        </p>

        <Tabs
          activeKey={activeTabKey}
          onSelect={handleTabClick}
          aria-label="API Management tabs"
          role="region"
        >
          {tabs}
        </Tabs>
      </PageSection>
    </>
  );
};

export default ApiManagementPage;
