import * as React from 'react';
import { useParams } from 'react-router-dom';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  CardExpandableContent,
  CardHeader,
  Flex,
  FlexItem,
  Content,
  ContentVariants,
  Stack,
  StackItem,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Button,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  Tooltip,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import {
  GlobeIcon,
  ReplicatorIcon,
  OptimizeIcon,
  ExternalLinkAltIcon,
  EllipsisVIcon,
  LockIcon,
} from '@patternfly/react-icons';
import {
  useActiveNamespace,
  K8sResourceCommon,
  useK8sWatchResource,
  GreenCheckCircleIcon,
  YellowExclamationTriangleIcon,
  TableData,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  useGatewayMetrics,
  getTotalRequests,
  getSuccessfulRequests,
  getErrorRate,
  getErrorCodes,
} from '../hooks/useGatewayMetrics';
import StatusLegend from './shared/StatusLegend';
import ErrorCodeLabel from './shared/ErrorCodeLabel';
import './kuadrant.css';
import ResourceList from './ResourceList';
import { sortable } from '@patternfly/react-table';
import { INTERNAL_LINKS, EXTERNAL_LINKS } from '../constants/links';
import {
  resourceGVKMapping,
  getPolicyKinds,
  getPoliciesAndGatewayKinds,
  RESOURCES,
} from '../utils/resources';
import { useHistory } from 'react-router-dom';
import useAccessReviews from '../utils/resourceRBAC';
import { getResourceNameFromKind } from '../utils/getModelFromResource';
import { KuadrantStatusAlert } from './KuadrantStatusAlert';

export type MenuToggleElement = HTMLDivElement | HTMLButtonElement;

interface Resource {
  name: string;
  gvk: {
    group: string;
    version: string;
    kind: string;
  };
}
export const resources: Resource[] = getPoliciesAndGatewayKinds().map((kind) => ({
  name: RESOURCES[kind].plural,
  gvk: resourceGVKMapping[kind],
}));

interface Gateway extends K8sResourceCommon {
  status?: {
    conditions?: {
      type: string;
      status: string;
    }[];
  };
}

const KuadrantOverviewPage: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const { ns } = useParams<{ ns: string }>();
  const [activeNamespace, setActiveNamespace] = useActiveNamespace();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [hideCard, setHideCard] = React.useState(
    sessionStorage.getItem('hideGettingStarted') === 'true',
  );
  const onToggleClick = () => {
    setIsCreateOpen(!isCreateOpen);
  };

  const resolvedNamespace = activeNamespace === '#ALL_NS#' ? 'default' : activeNamespace;
  const rbacResources = resources.map((res) => ({
    group: res.gvk.group,
    kind: getResourceNameFromKind(res.gvk.kind),
    namespace: resolvedNamespace,
  }));
  const { userRBAC, loading } = useAccessReviews(rbacResources);

  const policies = getPolicyKinds().map((kind) => t(kind));

  const resourceRBAC = getPoliciesAndGatewayKinds().reduce(
    (acc, resource) => ({
      ...acc,
      [resource]: {
        list: userRBAC[`${getResourceNameFromKind(resource)}-list`],
        create: userRBAC[`${getResourceNameFromKind(resource)}-create`],
      },
    }),
    {} as Record<string, { list: boolean; create: boolean }>,
  );

  const policyRBACNill = getPolicyKinds().every((kind) => !resourceRBAC[kind]?.list);

  React.useEffect(() => {
    if (ns && ns !== activeNamespace) {
      setActiveNamespace(ns);
    }
  }, [ns, activeNamespace, setActiveNamespace]);

  const handleHideCard = () => {
    setHideCard(true);
    sessionStorage.setItem('hideGettingStarted', 'true');
  };

  const onSelect = () => {
    setIsOpen(!isOpen);
  };

  const dropdownItems = (
    <>
      <DropdownItem key="hideForSession" onClick={handleHideCard}>
        {t('Hide for session')}
      </DropdownItem>
    </>
  );

  const headerActions = (
    <>
      <Dropdown
        onSelect={onSelect}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            isExpanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
            variant="plain"
            aria-label="Card actions"
          >
            <EllipsisVIcon aria-hidden="true" />
          </MenuToggle>
        )}
        isOpen={isOpen}
        onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
      >
        <DropdownList>{dropdownItems}</DropdownList>
      </Dropdown>
    </>
  );

  const columns = [
    {
      title: t('plugin__kuadrant-console-plugin~Name'),
      id: 'name',
      sort: 'metadata.name',
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
      title: '',
      id: 'kebab',
      props: { className: 'pf-v6-c-table__action' },
    },
  ];

  const getGatewayStatusRank = (gw: Gateway): number => {
    const conditions = gw.status?.conditions ?? [];
    const isAccepted = conditions.some((c) => c.type === 'Accepted' && c.status === 'True');
    const isProgrammed = conditions.some((c) => c.type === 'Programmed' && c.status === 'True');
    const isConflicted = conditions.some((c) => c.type === 'Conflicted' && c.status === 'True');
    const isResolvedRefs = conditions.some((c) => c.type === 'ResolvedRefs' && c.status === 'True');

    if (isAccepted && isProgrammed) return 5;
    if (isProgrammed) return 3;
    if (isConflicted) return 2;
    if (isResolvedRefs) return 1;
    return 0;
  };

  const sortGatewaysByStatus = (
    data: K8sResourceCommon[],
    sortDirection: 'asc' | 'desc',
  ): K8sResourceCommon[] => {
    const sorted = [...data].sort(
      (a, b) => getGatewayStatusRank(a as Gateway) - getGatewayStatusRank(b as Gateway),
    );
    return sortDirection === 'desc' ? sorted.reverse() : sorted;
  };

  const gatewayTrafficColumns = [
    {
      title: t('plugin__kuadrant-console-plugin~Name'),
      id: 'name',
      sort: 'metadata.name',
      transforms: [sortable],
    },
    {
      title: t('plugin__kuadrant-console-plugin~Namespace'),
      id: 'namespace',
      sort: 'metadata.namespace',
      transforms: [sortable],
    },
    {
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {t('plugin__kuadrant-console-plugin~Status')}
          <span style={{ display: 'inline-flex' }}>
            <StatusLegend />
          </span>
        </span>
      ) as unknown as string,
      id: 'Status',
      sort: sortGatewaysByStatus,
      transforms: [sortable],
    },
    {
      title: t('Total Requests'),
      id: 'totalRequests',
      sort: 'totalRequests',
      transforms: [sortable],
    },
    {
      title: t('Successful Requests'),
      id: 'successfulRequests',
      sort: 'successfulRequests',
      transforms: [sortable],
    },
    {
      title: t('Error Rate'),
      id: 'errorRate',
      sort: 'errorRate',
      transforms: [sortable],
    },
    {
      title: t('Error Codes'),
      id: 'errorCodes',
      sort: 'errorCodes',
      transforms: [sortable],
    },
    {
      title: '',
      id: 'kebab',
      props: { className: 'pf-v6-c-table__action' },
    },
  ];

  const handleCreateResource = (resource) => {
    const resolvedNamespace = activeNamespace === '#ALL_NS#' ? 'default' : activeNamespace;

    if (resource === 'Gateway') {
      const gateway = resourceGVKMapping['Gateway'];
      history.push(
        `/k8s/ns/${resolvedNamespace}/${gateway.group}~${gateway.version}~${gateway.kind}/~new`,
      );
    } else {
      const httpRoute = resourceGVKMapping['HTTPRoute'];
      history.push(
        `/k8s/ns/${resolvedNamespace}/${httpRoute.group}~${httpRoute.version}~${httpRoute.kind}/~new`,
      );
    }
  };

  const onMenuSelect = (_event: React.MouseEvent<Element, MouseEvent>, policyType: string) => {
    const resource = resourceGVKMapping[policyType];
    const resolvedNamespace = activeNamespace === '#ALL_NS#' ? 'default' : activeNamespace;
    const targetUrl = `/k8s/ns/${resolvedNamespace}/${resource.group}~${resource.version}~${resource.kind}/~new`;
    history.push(targetUrl);
    setIsOpen(false);
  };

  // gateway traffic metrics
  const { metrics: gatewayMetrics } = useGatewayMetrics();

  const gatewayTrafficRenders = {
    totalRequests: (column, obj, activeColumnIDs) => {
      return (
        <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
          {getTotalRequests(gatewayMetrics, obj) || '-'}
        </TableData>
      );
    },
    successfulRequests: (column, obj, activeColumnIDs) => {
      return (
        <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
          {getSuccessfulRequests(gatewayMetrics, obj) || '-'}
        </TableData>
      );
    },
    errorRate: (column, obj, activeColumnIDs) => {
      return (
        <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
          {getErrorRate(gatewayMetrics, obj) || '-'}%
        </TableData>
      );
    },
    errorCodes: (column, obj, activeColumnIDs) => {
      const errorCodes = [...getErrorCodes(gatewayMetrics, obj)];
      return (
        <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
          {errorCodes.length === 0 ? (
            <Label variant="outline" color="green">
              {t('None')}
            </Label>
          ) : (
            errorCodes.map((code) => {
              return (
                <ErrorCodeLabel key={code} metrics={gatewayMetrics} obj={obj} codeGroup={code} />
              );
            })
          )}
        </TableData>
      );
    },
  };

  const gvk = { group: 'gateway.networking.k8s.io', version: 'v1', kind: 'Gateway' };

  const [gateways] = useK8sWatchResource<Gateway[]>({
    groupVersionKind: gvk,
    isList: true,
  });

  const healthyCount = React.useMemo(() => {
    return gateways.filter((gw) => {
      const conditions = gw.status?.conditions ?? [];
      const accepted = conditions.some((c) => c.type === 'Accepted' && c.status === 'True');
      const programmed = conditions.some((c) => c.type === 'Programmed' && c.status === 'True');
      return accepted && programmed;
    }).length;
  }, [gateways]);

  const unhealthyCount = gateways.length - healthyCount;

  if (loading) {
    return <div>{t('Loading Permissions...')}</div>;
  } else
    return (
      <>
        <Helmet>
          <title data-test="example-page-title">{t('Kuadrant')}</title>
        </Helmet>
        <PageSection className="kuadrant-overview-page">
          <Title headingLevel="h1" className="pf-u-mb-lg">
            {t('Kuadrant')} Overview
          </Title>
          <Grid hasGutter>
            {/* Kuadrant CR Status Alert */}
            <GridItem style={{ marginTop: '8px' }}>
              <KuadrantStatusAlert />
            </GridItem>

            {!hideCard && (
              <GridItem>
                <Card id="expandable-card" isExpanded={isExpanded}>
                  <CardHeader
                    actions={{ actions: headerActions }}
                    onExpand={() => setIsExpanded(!isExpanded)}
                    toggleButtonProps={{
                      'aria-label': isExpanded
                        ? t('Collapse Getting Started')
                        : t('Expand Getting Started'),
                    }}
                  >
                    <CardTitle>{t('Getting started resources')}</CardTitle>
                  </CardHeader>
                  <CardExpandableContent>
                    <CardBody>
                      <Flex className="kuadrant-overview-getting-started">
                        <FlexItem flex={{ default: 'flex_1' }}>
                          <Title headingLevel="h4" className="kuadrant-dashboard-learning">
                            <GlobeIcon /> {t('Learning Resources')}
                          </Title>
                          <Content component={ContentVariants.small}>
                            {t(
                              'Learn how to create, import and use Kuadrant policies on OpenShift with step-by-step instructions and tasks.',
                            )}
                          </Content>
                          <Stack hasGutter className="pf-u-mt-sm">
                            <StackItem>
                              <Content
                                component="a"
                                href={EXTERNAL_LINKS.documentation}
                                className="kuadrant-dashboard-resource-link"
                                target="_blank"
                              >
                                {t('View Documentation')} <ExternalLinkAltIcon />
                              </Content>
                            </StackItem>
                            <StackItem>
                              <Content
                                component="a"
                                href={EXTERNAL_LINKS.secureConnectProtect}
                                className="kuadrant-dashboard-resource-link"
                                target="_blank"
                              >
                                {t('Configuring and deploying Gateway policies with Kuadrant')}{' '}
                                <ExternalLinkAltIcon />
                              </Content>
                            </StackItem>
                          </Stack>
                        </FlexItem>
                        <Divider orientation={{ default: 'vertical' }} />
                        <FlexItem flex={{ default: 'flex_1' }}>
                          <Title
                            headingLevel="h4"
                            className="kuadrant-dashboard-feature-highlights"
                          >
                            <OptimizeIcon /> {t('Feature Highlights')}
                          </Title>
                          <Content component={ContentVariants.small}>
                            {t(
                              'Read about the latest information and key features in the Kuadrant highlights.',
                            )}
                          </Content>
                          <Stack hasGutter className="pf-u-mt-md">
                            <StackItem>
                              <Content
                                target="_blank"
                                component="a"
                                href={EXTERNAL_LINKS.releaseNotes}
                                className="kuadrant-dashboard-resource-link"
                              >
                                {t('Kuadrant')} {t('Release Notes')} <ExternalLinkAltIcon />
                              </Content>
                            </StackItem>
                          </Stack>
                        </FlexItem>
                        <Divider orientation={{ default: 'vertical' }} />
                        <FlexItem flex={{ default: 'flex_1' }}>
                          <Title headingLevel="h4" className="kuadrant-dashboard-enhance">
                            <ReplicatorIcon /> {t('Operations & Tools')}
                          </Title>
                          <Content component={ContentVariants.small}>
                            {t('Additional operators and tools to support Kuadrant.')}
                          </Content>
                          <Stack hasGutter className="pf-u-mt-md">
                            <StackItem>
                              <Content
                                component="a"
                                href={INTERNAL_LINKS.observabilitySetup}
                                className="kuadrant-dashboard-resource-link"
                                target="_blank"
                              >
                                Observability for {t('Kuadrant')} <ExternalLinkAltIcon />
                              </Content>
                            </StackItem>
                            <StackItem>
                              <Content
                                component="a"
                                href={INTERNAL_LINKS.certManagerOperator(activeNamespace)}
                                className="kuadrant-dashboard-resource-link"
                              >
                                {t('cert-manager Operator')} <ExternalLinkAltIcon />
                              </Content>
                            </StackItem>
                          </Stack>
                        </FlexItem>
                      </Flex>
                    </CardBody>
                  </CardExpandableContent>
                </Card>
              </GridItem>
            )}

            <GridItem>
              <Card>
                {/* TODO: Loading placeholder */}
                <CardTitle>
                  <Title headingLevel="h2">{t('Gateways')}</Title>
                  <CardBody className="pf-u-p-10">
                    <Flex
                      justifyContent={{ default: 'justifyContentSpaceAround' }}
                      alignItems={{ default: 'alignItemsCenter' }}
                    >
                      {/* Total Gateways */}
                      <FlexItem>
                        <Flex
                          direction={{ default: 'column' }}
                          alignItems={{ default: 'alignItemsCenter' }}
                        >
                          <strong style={{ fontSize: '1.3rem' }}>{gateways.length}</strong>
                          <span>Total Gateways</span>
                        </Flex>
                      </FlexItem>

                      {/* Healthy Gateways */}
                      <FlexItem>
                        <Flex
                          direction={{ default: 'column' }}
                          alignItems={{ default: 'alignItemsCenter' }}
                        >
                          <strong style={{ fontSize: '1.3rem' }}>
                            <GreenCheckCircleIcon size="md" />{' '}
                            <span style={{ margin: '5px' }}>{healthyCount}</span>
                          </strong>
                          <Tooltip
                            content={
                              <div>
                                {t(
                                  'A healthy gateway has a `true` status for the `Accepted` and `Programmed` conditions.',
                                )}
                              </div>
                            }
                          >
                            <span>Healthy Gateways</span>
                          </Tooltip>
                        </Flex>
                      </FlexItem>

                      {/* Unhealthy Gateways */}
                      <FlexItem>
                        <Flex
                          direction={{ default: 'column' }}
                          alignItems={{ default: 'alignItemsCenter' }}
                        >
                          <strong style={{ fontSize: '1.3rem' }}>
                            <YellowExclamationTriangleIcon size="md" />{' '}
                            <span style={{ margin: '5px' }}>{unhealthyCount}</span>
                          </strong>
                          <Tooltip
                            content={
                              <div>
                                {t(
                                  'An unhealthy gateway has a `false` status for the `Accepted` and/or `Programmed` conditions.',
                                )}
                              </div>
                            }
                          >
                            <span>Unhealthy Gateways</span>
                          </Tooltip>
                        </Flex>
                      </FlexItem>
                    </Flex>
                  </CardBody>
                </CardTitle>
              </Card>
            </GridItem>

            {resourceRBAC['Gateway']?.list ? (
              <GridItem>
                <Card>
                  <CardTitle className="kuadrant-resource-create-container">
                    <Title headingLevel="h2">{t('Gateways - Traffic Analysis')}</Title>
                    {resourceRBAC['Gateway']?.create ? (
                      <Button
                        onClick={() => handleCreateResource('Gateway')}
                        className="kuadrant-overview-create-button"
                      >
                        {t(`Create Gateway`)}
                      </Button>
                    ) : (
                      <Tooltip content="You do not have permission to create a Gateway">
                        <Button className="kuadrant-overview-create-button" isAriaDisabled>
                          {t(`Create Gateway`)}
                        </Button>
                      </Tooltip>
                    )}
                  </CardTitle>
                  <CardBody className="pf-u-p-10">
                    <ResourceList
                      resources={[resourceGVKMapping['Gateway']]}
                      columns={gatewayTrafficColumns}
                      renderers={gatewayTrafficRenders}
                      namespace="#ALL_NS#"
                      emtpyResourceName="Gateways"
                    />
                  </CardBody>
                </Card>
              </GridItem>
            ) : (
              <GridItem>
                <Card>
                  <CardBody className="pf-u-p-10">
                    <CardTitle>
                      <Title headingLevel="h2">{t('Gateways')}</Title>
                    </CardTitle>
                    <Bullseye>
                      <EmptyState
                        titleText={
                          <Title headingLevel="h4" size="lg">
                            {t('Access Denied')}
                          </Title>
                        }
                        icon={LockIcon}
                      >
                        <EmptyStateBody>
                          <Content component="p">
                            {t('You do not have permission to view Gateways')}
                          </Content>
                        </EmptyStateBody>
                      </EmptyState>
                    </Bullseye>
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {policyRBACNill ? (
              <GridItem lg={6}>
                <Card>
                  <CardBody className="pf-u-p-10">
                    <CardTitle>
                      <Title headingLevel="h2">{t('Policies')}</Title>
                    </CardTitle>
                    <Bullseye>
                      <EmptyState
                        titleText={
                          <Title headingLevel="h4" size="lg">
                            {t('Access Denied')}
                          </Title>
                        }
                        icon={LockIcon}
                      >
                        <EmptyStateBody>
                          <Content component="p">
                            {t('You do not have permission to view Policies')}
                          </Content>
                        </EmptyStateBody>
                      </EmptyState>
                    </Bullseye>
                  </CardBody>
                </Card>
              </GridItem>
            ) : (
              <GridItem lg={6}>
                <Card>
                  <CardTitle className="kuadrant-resource-create-container">
                    <Title headingLevel="h2">{t('Policies')}</Title>
                    <Dropdown
                      isOpen={isCreateOpen}
                      onSelect={onMenuSelect}
                      onOpenChange={setIsCreateOpen}
                      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={onToggleClick}
                          isExpanded={isCreateOpen}
                          variant="primary"
                          className="kuadrant-overview-create-button"
                        >
                          {t('Create Policy')}
                        </MenuToggle>
                      )}
                    >
                      <DropdownList className="kuadrant-overview-create-list pf-u-p-0">
                        {policies.map((policy) => {
                          const canCreate = resourceRBAC[policy]?.create;
                          return canCreate ? (
                            <DropdownItem value={policy} key={policy}>
                              {t(policy)}
                            </DropdownItem>
                          ) : (
                            <Tooltip
                              key={policy}
                              content={t(`You do not have permission to create a ${policy}`)}
                            >
                              <DropdownItem value={policy} isAriaDisabled>
                                {t(policy)}
                              </DropdownItem>
                            </Tooltip>
                          );
                        })}
                      </DropdownList>
                    </Dropdown>
                  </CardTitle>
                  <CardBody className="pf-u-p-10">
                    <ResourceList
                      resources={[
                        resourceGVKMapping['AuthPolicy'],
                        resourceGVKMapping['DNSPolicy'],
                        resourceGVKMapping['RateLimitPolicy'],
                        resourceGVKMapping['TokenRateLimitPolicy'],
                        resourceGVKMapping['OIDCPolicy'],
                        resourceGVKMapping['PlanPolicy'],
                        resourceGVKMapping['TLSPolicy'],
                      ]}
                      columns={columns}
                      namespace="#ALL_NS#"
                      paginationLimit={5}
                    />
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {resourceRBAC['HTTPRoute']?.list ? (
              <GridItem lg={6}>
                <Card>
                  <CardTitle className="kuadrant-resource-create-container">
                    <Title headingLevel="h2">{t('HTTPRoutes')}</Title>
                    {resourceRBAC['HTTPRoute']?.create ? (
                      <Button
                        onClick={() => handleCreateResource('HTTPRoute')}
                        className="kuadrant-overview-create-button"
                      >
                        {t(`Create HTTPRoute`)}
                      </Button>
                    ) : (
                      <Tooltip content="You do not have permission to create a HTTPRoute">
                        <Button className="kuadrant-overview-create-button" isAriaDisabled>
                          {t(`Create HTTPRoute`)}
                        </Button>
                      </Tooltip>
                    )}
                  </CardTitle>
                  <CardBody className="pf-u-p-10">
                    <ResourceList
                      resources={[resourceGVKMapping['HTTPRoute']]}
                      columns={columns}
                      namespace="#ALL_NS#"
                      emtpyResourceName="HTTPRoutes"
                    />
                  </CardBody>
                </Card>
              </GridItem>
            ) : (
              <GridItem lg={6}>
                <Card>
                  <CardBody className="pf-u-p-10">
                    <CardTitle>
                      <Title headingLevel="h2">{t('HTTPRoutes')}</Title>
                    </CardTitle>
                    <Bullseye>
                      <EmptyState
                        titleText={
                          <Title headingLevel="h4" size="lg">
                            {t('Access Denied')}
                          </Title>
                        }
                        icon={LockIcon}
                      >
                        <EmptyStateBody>
                          <Content component="p">
                            {t('You do not have permission to view HTTPRoutes')}
                          </Content>
                        </EmptyStateBody>
                      </EmptyState>
                    </Bullseye>
                  </CardBody>
                </Card>
              </GridItem>
            )}
          </Grid>
        </PageSection>
      </>
    );
};

export default React.memo(KuadrantOverviewPage);
