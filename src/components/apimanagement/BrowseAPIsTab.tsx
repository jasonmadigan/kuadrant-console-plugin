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
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  TextArea,
  Alert,
  Content,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import {
  useK8sWatchResource,
  K8sResourceCommon,
  useActiveNamespace,
  K8sResourceKind,
} from '@openshift-console/dynamic-plugin-sdk';
import resourceGVKMapping from '../../utils/latest';
import { PlanPolicy } from '../planpolicy/types';
import { createAccessRequest } from '../../utils/request-operations';
import { PlanTier } from '../../types/api-management';

interface HTTPRoute extends K8sResourceCommon {
  spec: {
    parentRefs?: Array<{
      name: string;
      namespace?: string;
    }>;
    hostnames?: string[];
  };
}

interface BrowseAPIsTabProps {
  userId: string;
  userEmail: string;
  onRequestCreated?: () => void;
}

export const BrowseAPIsTab: React.FC<BrowseAPIsTabProps> = ({
  userId,
  userEmail,
  onRequestCreated,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [activeNamespace] = useActiveNamespace();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedRoute, setSelectedRoute] = React.useState<HTTPRoute | null>(null);
  const [selectedPlan, setSelectedPlan] = React.useState<PlanTier>('silver');
  const [requestNamespace, setRequestNamespace] = React.useState('');
  const [useCase, setUseCase] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // watch namespaces for dropdown
  const [namespaces, namespacesLoaded] = useK8sWatchResource<K8sResourceKind[]>({
    groupVersionKind: { version: 'v1', kind: 'Namespace' },
    isList: true,
    namespaced: false,
  });

  // watch httproutes across all namespaces
  const [routes, routesLoaded, routesError] = useK8sWatchResource<HTTPRoute[]>({
    groupVersionKind: resourceGVKMapping.HTTPRoute,
    isList: true,
    namespaced: false,
  });

  // watch planpolicies across all namespaces
  const [policies, policiesLoaded, policiesError] = useK8sWatchResource<PlanPolicy[]>({
    groupVersionKind: resourceGVKMapping.PlanPolicy,
    isList: true,
    namespaced: false,
  });

  // filter routes that have associated planpolicies
  const routesWithPlans = React.useMemo(() => {
    console.log('BrowseAPIsTab - routesLoaded:', routesLoaded, 'policiesLoaded:', policiesLoaded);
    console.log('BrowseAPIsTab - routesError:', routesError, 'policiesError:', policiesError);

    if (!routesLoaded || !policiesLoaded) return [];

    console.log('BrowseAPIsTab - HTTPRoutes loaded:', routes.length);
    console.log('BrowseAPIsTab - PlanPolicies loaded:', policies.length);
    console.log('BrowseAPIsTab - Routes:', JSON.stringify(routes.map(r => `${r.metadata?.namespace}/${r.metadata?.name}`)));
    console.log('BrowseAPIsTab - Policies:', JSON.stringify(policies.map(p => ({
      name: `${p.metadata?.namespace}/${p.metadata?.name}`,
      targetRef: `${p.spec?.targetRef?.kind}/${p.spec?.targetRef?.name}`,
      namespace: p.metadata?.namespace
    }))));

    const filtered = routes.filter((route) => {
      const hasMatch = policies.some(
        (policy) =>
          policy.spec.targetRef.kind === 'HTTPRoute' &&
          policy.spec.targetRef.name === route.metadata.name &&
          policy.metadata.namespace === route.metadata.namespace,
      );
      if (hasMatch) {
        console.log('BrowseAPIsTab - MATCHED route:', route.metadata.namespace, route.metadata.name);
      }
      return hasMatch;
    });

    console.log('BrowseAPIsTab - Filtered routes with plans:', filtered.length);
    return filtered;
  }, [routes, policies, routesLoaded, policiesLoaded, routesError, policiesError]);

  const getPlanPolicyForRoute = (route: HTTPRoute): PlanPolicy | undefined => {
    return policies.find(
      (policy) =>
        policy.spec.targetRef.kind === 'HTTPRoute' &&
        policy.spec.targetRef.name === route.metadata.name &&
        policy.metadata.namespace === route.metadata.namespace,
    );
  };

  const handleRequestAccess = (route: HTTPRoute) => {
    setSelectedRoute(route);
    setError('');
    setUseCase('');
    // default to active namespace, fallback to 'default'
    setRequestNamespace(activeNamespace === '#ALL_NS#' ? 'default' : activeNamespace || 'default');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedRoute) return;

    if (!requestNamespace.trim()) {
      setError('namespace is required');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await createAccessRequest({
      apiName: selectedRoute.metadata.name,
      apiNamespace: selectedRoute.metadata.namespace,
      planTier: selectedPlan,
      useCase: useCase.trim() || undefined,
      userId,
      userEmail,
      requestNamespace: requestNamespace.trim(),
    });

    setSubmitting(false);

    if (result.success) {
      setIsModalOpen(false);
      onRequestCreated?.();
    } else {
      setError(result.error || 'failed to create request');
    }
  };

  const columns = ['Name', 'Namespace', 'Hostnames', 'Gateway', 'Actions'];

  const rows = routesWithPlans.map((route) => {
    const gateway = route.spec.parentRefs?.[0]?.name || 'none';
    const hostnames = route.spec.hostnames?.join(', ') || 'none';

    return {
      cells: [
        route.metadata.name,
        route.metadata.namespace,
        hostnames,
        gateway,
        {
          title: (
            <Button variant="primary" onClick={() => handleRequestAccess(route)}>
              {t('Request Access')}
            </Button>
          ),
        },
      ],
    };
  });

  const selectedPolicy = selectedRoute ? getPlanPolicyForRoute(selectedRoute) : null;
  const availablePlans = selectedPolicy?.spec.plans || [];

  if (routesError) {
    return <Alert variant="danger" title={t('Error loading APIs')} />;
  }

  if (!routesLoaded || !policiesLoaded) {
    return <div>{t('Loading...')}</div>;
  }

  if (routesWithPlans.length === 0) {
    return (
      <EmptyState icon={CubesIcon} titleText={t('No APIs Available')}>
        <EmptyStateBody>
          {t('There are no APIs with plan policies configured. Contact your administrator.')}
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Table aria-label="Browse APIs table" variant="compact" cells={columns} rows={rows}>
        <TableHeader />
        <TableBody />
      </Table>

      <Modal
        variant="medium"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aria-labelledby="request-modal-title"
        aria-describedby="request-modal-body"
      >
        <ModalHeader title={t('Request API Access')} />
        <ModalBody>
          <Form>
            <FormGroup label={t('API')} isRequired>
              <Content>{selectedRoute?.metadata.name}</Content>
            </FormGroup>

            <FormGroup label={t('Plan Tier')} isRequired>
              <FormSelect
                value={selectedPlan}
                onChange={(_event, value) => setSelectedPlan(value as PlanTier)}
              >
                {availablePlans.map((plan) => {
                  const limitParts = [];
                  if (plan.limits?.daily) limitParts.push(`${plan.limits.daily.toLocaleString()}/day`);
                  if (plan.limits?.weekly) limitParts.push(`${plan.limits.weekly.toLocaleString()}/week`);
                  if (plan.limits?.monthly) limitParts.push(`${plan.limits.monthly.toLocaleString()}/month`);
                  const limitText = limitParts.length > 0 ? limitParts.join(', ') : 'custom limits';

                  return (
                    <FormSelectOption
                      key={plan.tier}
                      value={plan.tier}
                      label={`${plan.tier} (${limitText})`}
                    />
                  );
                })}
              </FormSelect>
              {availablePlans.find(p => p.tier === selectedPlan) && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {availablePlans.find(p => p.tier === selectedPlan)?.description ||
                       t('Rate limits: ') +
                       [
                         availablePlans.find(p => p.tier === selectedPlan)?.limits?.daily &&
                           `${availablePlans.find(p => p.tier === selectedPlan)?.limits.daily.toLocaleString()} requests/day`,
                         availablePlans.find(p => p.tier === selectedPlan)?.limits?.weekly &&
                           `${availablePlans.find(p => p.tier === selectedPlan)?.limits.weekly.toLocaleString()} requests/week`,
                         availablePlans.find(p => p.tier === selectedPlan)?.limits?.monthly &&
                           `${availablePlans.find(p => p.tier === selectedPlan)?.limits.monthly.toLocaleString()} requests/month`
                       ].filter(Boolean).join(', ')
                      }
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </FormGroup>

            <FormGroup label={t('Request Namespace')} isRequired>
              <FormSelect
                value={requestNamespace}
                onChange={(_event, value) => setRequestNamespace(value)}
                isDisabled={!namespacesLoaded}
              >
                {!requestNamespace && (
                  <FormSelectOption key="placeholder" value="" label={t('Select namespace...')} />
                )}
                {namespacesLoaded &&
                  namespaces
                    .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name))
                    .map((ns) => (
                      <FormSelectOption
                        key={ns.metadata.name}
                        value={ns.metadata.name}
                        label={ns.metadata.name}
                      />
                    ))}
              </FormSelect>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    {t(
                      'The namespace where your API key request will be created. You must have permission to create ConfigMaps in this namespace.',
                    )}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label={t('Use Case')}>
              <TextArea
                value={useCase}
                onChange={(_event, value) => setUseCase(value)}
                placeholder={t('Describe your use case for accessing this API...')}
                rows={4}
              />
            </FormGroup>

            {error && <Alert variant="danger" title={error} isInline />}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            key="submit"
            variant="primary"
            onClick={handleSubmit}
            isDisabled={submitting}
            isLoading={submitting}
          >
            {t('Submit Request')}
          </Button>
          <Button key="cancel" variant="link" onClick={() => setIsModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
