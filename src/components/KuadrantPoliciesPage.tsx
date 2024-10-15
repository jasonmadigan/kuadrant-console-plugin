import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sortable } from '@patternfly/react-table';
import {
  NamespaceBar,
  HorizontalNav,
  TableColumn,
  K8sResourceCommon,
  useActiveNamespace,
  useActivePerspective,
  ListPageCreateLink,
  ListPageBody,
} from '@openshift-console/dynamic-plugin-sdk';
import { Title, Flex, Spinner, FlexItem, Alert, AlertGroup } from '@patternfly/react-core';
import { getKindGroupLatestVersion } from '../utils/getModelFromResource'; // Make sure you import this
import ResourceList from './ResourceList';
import './kuadrant.css';

interface Resource {
  name: string;
  gvk: {
    group: string;
    version: string;
    kind: string;
  };
}

export const AllPoliciesListPage: React.FC<{
  activeNamespace: string;
  columns?: TableColumn<K8sResourceCommon>[];
  showAlertGroup?: boolean;
  paginationLimit?: number;
  resources: Resource[]; // Add resources as a prop
}> = ({ activeNamespace, columns, showAlertGroup = false, paginationLimit, resources }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  return (
    <>
      <ListPageBody>
        {showAlertGroup && (
          <AlertGroup className="kuadrant-alert-group">
            <Alert title={t('Info about this page')} variant="info" isInline>
              ...
            </Alert>
          </AlertGroup>
        )}
        <ResourceList
          resources={resources.map((r) => r.gvk)}
          namespace={activeNamespace}
          columns={columns}
          paginationLimit={paginationLimit}
        />
      </ListPageBody>
    </>
  );
};

const PoliciesListPage: React.FC<{ resource: Resource; activeNamespace: string }> = ({
  resource,
  activeNamespace,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const resolvedNamespace = activeNamespace === '#ALL_NS#' ? 'default' : activeNamespace;

  return (
    <>
      <ListPageBody>
        <AlertGroup className="kuadrant-alert-group">
          <Alert title={t('Info about this page')} variant="info" isInline>
            {/* Add any informational content here */}
            ...
          </Alert>
        </AlertGroup>
        <div className="co-m-nav-title--row kuadrant-resource-create-container">
          <ResourceList resources={[resource.gvk]} namespace={activeNamespace} />
          <div className="kuadrant-resource-create-button pf-u-mt-md">
            <ListPageCreateLink
              to={`/k8s/ns/${resolvedNamespace}/${resource.gvk.group}~${resource.gvk.version}~${resource.gvk.kind}/~new`}
            >
              {t(`plugin__kuadrant-console-plugin~Create ${resource.gvk.kind}`)}
            </ListPageCreateLink>
          </div>
        </div>
      </ListPageBody>
    </>
  );
};

const KuadrantPoliciesPage: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const { ns } = useParams<{ ns: string }>();
  const [activeNamespace, setActiveNamespace] = useActiveNamespace();
  const [activePerspective] = useActivePerspective();
  const [resources, setResources] = React.useState<Resource[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true); // Loading state

  React.useEffect(() => {
    if (ns && ns !== activeNamespace) {
      setActiveNamespace(ns);
    }
  }, [ns, activeNamespace, setActiveNamespace]);

  // Fetch dynamic versions using getKindGroupLatestVersion
  React.useEffect(() => {
    const fetchResources = async () => {
      const resourceDefinitions: Resource[] = [
        { name: 'AuthPolicies', gvk: { group: 'kuadrant.io', version: '', kind: 'AuthPolicy' } },
        { name: 'DNSPolicies', gvk: { group: 'kuadrant.io', version: '', kind: 'DNSPolicy' } },
        {
          name: 'RateLimitPolicies',
          gvk: { group: 'kuadrant.io', version: '', kind: 'RateLimitPolicy' },
        },
        { name: 'TLSPolicies', gvk: { group: 'kuadrant.io', version: '', kind: 'TLSPolicy' } },
      ];

      try {
        const fetchPromises = resourceDefinitions.map(async (resource) => {
          const { kind, group } = resource.gvk;
          const result = await getKindGroupLatestVersion(kind, group);
          return {
            ...resource,
            gvk: {
              ...resource.gvk,
              version: result.version || 'v1', // Default to 'v1' if no version is found
            },
          };
        });

        const resolvedResources = await Promise.all(fetchPromises);
        setResources(resolvedResources);
      } catch (error) {
        console.error('Error fetching resource versions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const defaultColumns: TableColumn<K8sResourceCommon>[] = [
    {
      title: t('plugin__kuadrant-console-plugin~Name'),
      id: 'name',
      sort: 'metadata.name',
      transforms: [sortable],
    },
    {
      title: t('plugin__kuadrant-console-plugin~Type'),
      id: 'type',
      sort: 'kind',
      transforms: [sortable],
    },
    {
      title: t('plugin__kuadrant-console-plugin~Namespace'),
      id: 'namespace',
      sort: 'metadata.namespace',
      transforms: [sortable],
    },
    {
      title: t('plugin__kuadrant-console-plugin~Status'),
      id: 'Status',
    },
    {
      title: t('plugin__kuadrant-console-plugin~Created'),
      id: 'Created',
      sort: 'metadata.creationTimestamp',
      transforms: [sortable],
    },
    {
      title: '', // No title for the kebab menu column
      id: 'kebab',
      props: { className: 'pf-v5-c-table__action' },
    },
  ];

  const All: React.FC = () => (
    <AllPoliciesListPage
      activeNamespace={activeNamespace}
      columns={defaultColumns}
      resources={resources}
    />
  );

  const Auth: React.FC = () => (
    <PoliciesListPage resource={resources[0]} activeNamespace={activeNamespace} />
  );

  const RateLimit: React.FC = () => (
    <PoliciesListPage resource={resources[2]} activeNamespace={activeNamespace} />
  );

  if (loading) {
    return (
      <Flex
        direction={{ default: 'column' }}
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentCenter' }}
        style={{ height: '100%', minHeight: '250px' }}
      >
        <Spinner size="lg" />
        <FlexItem>
          <Title headingLevel="h1">{t('Loading...')}</Title>
        </FlexItem>
      </Flex>
    );
  }

  let pages = [
    {
      href: '',
      name: t('All Policies'),
      component: All,
    },
  ];

  if (activePerspective === 'admin') {
    const DNS: React.FC = () => (
      <PoliciesListPage resource={resources[1]} activeNamespace={activeNamespace} />
    );
    const TLS: React.FC = () => (
      <PoliciesListPage resource={resources[3]} activeNamespace={activeNamespace} />
    );

    pages = [
      ...pages,
      {
        href: 'dns',
        name: t('DNS'),
        component: DNS,
      },
      {
        href: 'tls',
        name: t('TLS'),
        component: TLS,
      },
    ];
  }

  pages = [
    ...pages,
    {
      href: 'auth',
      name: t('Auth'),
      component: Auth,
    },
    {
      href: 'ratelimit',
      name: t('RateLimit'),
      component: RateLimit,
    },
  ];

  return (
    <>
      <NamespaceBar />
      <Title headingLevel="h1" className="kuadrant-page-title">
        {t('Kuadrant')}
      </Title>
      <HorizontalNav pages={pages} />
    </>
  );
};

export default KuadrantPoliciesPage;
