import * as React from 'react';
import Helmet from 'react-helmet';
import {
  PageSection,
  Title,
  TextInput,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Form,
  Radio,
  Button,
  ExpandableSection,
  ActionGroup,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import './kuadrant.css';
import {
  ResourceYAMLEditor,
  getGroupVersionKindForResource,
  useK8sModel,
  useK8sWatchResource,
  K8sResourceCommon,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';
import { useHistory, useLocation } from 'react-router-dom';
import yaml from 'js-yaml';
import { TargetRef } from './shared/types';
import TargetRefField from './shared/TargetRefField';
import KuadrantCreateUpdate from './KuadrantCreateUpdate';
import { handleCancel } from '../utils/cancel';
import { resourceGVKMapping } from '../utils/resources';

interface PlanLimits {
  daily?: number;
  weekly?: number;
  monthly?: number;
  yearly?: number;
  custom?: { limit: number; window: string }[];
}

interface Plan {
  tier: string;
  predicate: string;
  limits?: PlanLimits;
}

const KuadrantPlanPolicyCreatePage: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const history = useHistory();
  const location = useLocation();
  const [selectedNamespace] = useActiveNamespace();
  const [createView, setCreateView] = React.useState<'form' | 'yaml'>('form');
  const [policyName, setPolicyName] = React.useState('');
  const [targetRef, setTargetRef] = React.useState<TargetRef>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      group: 'gateway.networking.k8s.io',
      kind: (params.get('targetKind') as 'Gateway' | 'HTTPRoute') || 'Gateway',
      name: params.get('targetName') || '',
    };
  });
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [formDisabled, setFormDisabled] = React.useState(false);
  const [create, setCreate] = React.useState(true);
  const [creationTimestamp, setCreationTimestamp] = React.useState('');
  const [resourceVersion, setResourceVersion] = React.useState('');

  const pathSplit = location.pathname.split('/');
  const nameEdit = pathSplit[6];
  const namespaceEdit = pathSplit[3];

  const gvkInfo = resourceGVKMapping['PlanPolicy'];
  const policyGVK = getGroupVersionKindForResource({
    apiVersion: `${gvkInfo.group}/${gvkInfo.version}`,
    kind: gvkInfo.kind,
  });
  const [policyModel] = useK8sModel({
    group: policyGVK.group,
    version: policyGVK.version,
    kind: policyGVK.kind,
  });

  const addPlan = () => setPlans([...plans, { tier: '', predicate: '' }]);
  const removePlan = (index: number) => setPlans(plans.filter((_, i) => i !== index));
  const updatePlan = (index: number, updated: Plan) => {
    const newPlans = [...plans];
    newPlans[index] = updated;
    setPlans(newPlans);
  };

  const createPolicy = () => {
    const cleanTargetRef: Record<string, string> = {
      group: targetRef.group,
      kind: targetRef.kind,
      name: targetRef.name,
    };
    if (targetRef.sectionName) {
      cleanTargetRef.sectionName = targetRef.sectionName;
    }

    const cleanPlans = plans.map((p) => {
      const plan: Record<string, unknown> = { tier: p.tier, predicate: p.predicate };
      if (p.limits) {
        const limits: Record<string, unknown> = {};
        if (p.limits.daily != null) limits.daily = p.limits.daily;
        if (p.limits.weekly != null) limits.weekly = p.limits.weekly;
        if (p.limits.monthly != null) limits.monthly = p.limits.monthly;
        if (p.limits.yearly != null) limits.yearly = p.limits.yearly;
        if (p.limits.custom?.length > 0) limits.custom = p.limits.custom;
        if (Object.keys(limits).length > 0) plan.limits = limits;
      }
      return plan;
    });

    const spec: Record<string, unknown> = { targetRef: cleanTargetRef };
    if (cleanPlans.length > 0) spec.plans = cleanPlans;

    return {
      apiVersion: `${gvkInfo.group}/${gvkInfo.version}`,
      kind: gvkInfo.kind,
      metadata: {
        name: policyName,
        namespace: selectedNamespace,
        ...(creationTimestamp ? { creationTimestamp } : {}),
        ...(resourceVersion ? { resourceVersion } : {}),
      },
      spec,
    };
  };

  const [yamlInput, setYamlInput] = React.useState(createPolicy);

  // edit mode: load existing resource
  const watchResource = nameEdit
    ? { groupVersionKind: policyGVK, isList: false, name: nameEdit, namespace: namespaceEdit }
    : null;
  const [watchData, watchLoaded, watchError] = useK8sWatchResource(watchResource);

  React.useEffect(() => {
    if (!watchLoaded || watchError || !watchData || Array.isArray(watchData)) return;
    const existing = watchData as K8sResourceCommon & { spec?: Record<string, unknown> };
    setCreationTimestamp(existing.metadata.creationTimestamp);
    setResourceVersion(existing.metadata.resourceVersion);
    setFormDisabled(true);
    setCreate(false);
    setPolicyName(existing.metadata?.name || '');

    const spec = existing.spec || {};
    const ref = spec.targetRef as TargetRef;
    if (ref) {
      setTargetRef({
        group: ref.group || 'gateway.networking.k8s.io',
        kind: ref.kind || 'Gateway',
        name: ref.name || '',
        sectionName: ref.sectionName,
      });
    }

    setPlans((spec.plans as Plan[]) || []);
  }, [watchData, watchLoaded, watchError]);

  // sync form to yaml
  React.useEffect(() => {
    setYamlInput(createPolicy());
  }, [policyName, selectedNamespace, targetRef, plans]);

  const handleYAMLChange = (input: string) => {
    try {
      const parsed = yaml.load(input, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
      const meta = parsed.metadata as Record<string, string>;
      const spec = parsed.spec as Record<string, unknown>;
      setPolicyName(meta?.name || '');

      if (spec?.targetRef) {
        const ref = spec.targetRef as TargetRef;
        setTargetRef({
          group: ref.group || 'gateway.networking.k8s.io',
          kind: ref.kind || 'Gateway',
          name: ref.name || '',
          sectionName: ref.sectionName,
        });
      }

      setPlans((spec?.plans as Plan[]) || []);
    } catch (e) {
      console.error('error parsing yaml:', e);
    }
  };

  const policy = createPolicy();
  const isFormValid = !!(
    policyName &&
    targetRef.name &&
    plans.length > 0 &&
    plans.every((p) => p.tier && p.predicate)
  );

  return (
    <>
      <Helmet>
        <title data-test="planpolicy-page-title">
          {create ? t('Create Plan Policy') : t('Edit Plan Policy')}
        </title>
      </Helmet>
      <PageSection hasBodyWrapper={false}>
        <div className="co-m-nav-title">
          <Title headingLevel="h1">
            {create ? t('Create Plan Policy') : t('Edit Plan Policy')}
          </Title>
          <p className="help-block">
            {t('PlanPolicy defines rate limiting plans with tiers for Gateway API resources')}
          </p>
        </div>
        <FormGroup
          className="kuadrant-editor-toggle"
          role="radiogroup"
          isInline
          fieldId="create-type-radio-group"
          label={t('Configure via')}
        >
          <Radio
            name="create-type-radio"
            label={t('Form View')}
            id="create-type-radio-form"
            isChecked={createView === 'form'}
            onChange={() => setCreateView('form')}
          />
          <Radio
            name="create-type-radio"
            label={t('YAML View')}
            id="create-type-radio-yaml"
            isChecked={createView === 'yaml'}
            onChange={() => setCreateView('yaml')}
          />
        </FormGroup>
      </PageSection>
      {createView === 'form' ? (
        <PageSection hasBodyWrapper={false}>
          <Form className="co-m-pane__form">
            <FormGroup label={t('Policy name')} isRequired fieldId="policy-name">
              <TextInput
                isRequired
                type="text"
                id="policy-name"
                name="policy-name"
                value={policyName}
                onChange={(_event, val) => setPolicyName(val)}
                isDisabled={formDisabled}
                placeholder={t('Policy name')}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{t('Unique name of the Plan Policy')}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <TargetRefField
              targetRef={targetRef}
              onChange={setTargetRef}
              formDisabled={formDisabled}
              namespace={namespaceEdit || selectedNamespace}
            />
            <Title headingLevel="h2">{t('Plans')}</Title>
            {plans.map((plan, i) => (
              <div key={i} className="kuadrant-limit-entry">
                <FormGroup label={t('Tier')} isRequired fieldId={`plan-${i}-tier`}>
                  <TextInput
                    isRequired
                    type="text"
                    id={`plan-${i}-tier`}
                    value={plan.tier}
                    onChange={(_event, val) => updatePlan(i, { ...plan, tier: val })}
                    placeholder={t('e.g. free, pro, enterprise')}
                  />
                </FormGroup>
                <FormGroup label={t('Predicate')} isRequired fieldId={`plan-${i}-predicate`}>
                  <TextInput
                    isRequired
                    type="text"
                    id={`plan-${i}-predicate`}
                    value={plan.predicate}
                    onChange={(_event, val) => updatePlan(i, { ...plan, predicate: val })}
                    placeholder={t('CEL expression e.g. auth.identity.tier == "free"')}
                  />
                </FormGroup>
                <ExpandableSection toggleText={t('Limits')}>
                  <FormGroup label={t('Daily')} fieldId={`plan-${i}-daily`}>
                    <TextInput
                      type="number"
                      id={`plan-${i}-daily`}
                      value={plan.limits?.daily ?? ''}
                      onChange={(_event, val) =>
                        updatePlan(i, {
                          ...plan,
                          limits: { ...plan.limits, daily: val ? Number(val) : undefined },
                        })
                      }
                      placeholder={t('Daily limit')}
                    />
                  </FormGroup>
                  <FormGroup label={t('Weekly')} fieldId={`plan-${i}-weekly`}>
                    <TextInput
                      type="number"
                      id={`plan-${i}-weekly`}
                      value={plan.limits?.weekly ?? ''}
                      onChange={(_event, val) =>
                        updatePlan(i, {
                          ...plan,
                          limits: { ...plan.limits, weekly: val ? Number(val) : undefined },
                        })
                      }
                      placeholder={t('Weekly limit')}
                    />
                  </FormGroup>
                  <FormGroup label={t('Monthly')} fieldId={`plan-${i}-monthly`}>
                    <TextInput
                      type="number"
                      id={`plan-${i}-monthly`}
                      value={plan.limits?.monthly ?? ''}
                      onChange={(_event, val) =>
                        updatePlan(i, {
                          ...plan,
                          limits: { ...plan.limits, monthly: val ? Number(val) : undefined },
                        })
                      }
                      placeholder={t('Monthly limit')}
                    />
                  </FormGroup>
                  <FormGroup label={t('Yearly')} fieldId={`plan-${i}-yearly`}>
                    <TextInput
                      type="number"
                      id={`plan-${i}-yearly`}
                      value={plan.limits?.yearly ?? ''}
                      onChange={(_event, val) =>
                        updatePlan(i, {
                          ...plan,
                          limits: { ...plan.limits, yearly: val ? Number(val) : undefined },
                        })
                      }
                      placeholder={t('Yearly limit')}
                    />
                  </FormGroup>
                  <Title headingLevel="h4">{t('Custom rates')}</Title>
                  {(plan.limits?.custom || []).map((custom, ci) => (
                    <div key={ci} className="kuadrant-field-row">
                      <div className="kuadrant-field-row__input">
                        <TextInput
                          type="number"
                          value={custom.limit ?? ''}
                          onChange={(_event, val) => {
                            const newCustom = [...(plan.limits?.custom || [])];
                            newCustom[ci] = { ...newCustom[ci], limit: val ? Number(val) : 0 };
                            updatePlan(i, {
                              ...plan,
                              limits: { ...plan.limits, custom: newCustom },
                            });
                          }}
                          placeholder={t('Limit')}
                        />
                      </div>
                      <div className="kuadrant-field-row__input">
                        <TextInput
                          value={custom.window}
                          onChange={(_event, val) => {
                            const newCustom = [...(plan.limits?.custom || [])];
                            newCustom[ci] = { ...newCustom[ci], window: val };
                            updatePlan(i, {
                              ...plan,
                              limits: { ...plan.limits, custom: newCustom },
                            });
                          }}
                          placeholder={t('Window (e.g. 1h, 30m)')}
                        />
                      </div>
                      <Button
                        variant="link"
                        isDanger
                        icon={<MinusCircleIcon />}
                        onClick={() => {
                          const newCustom = (plan.limits?.custom || []).filter((_, j) => j !== ci);
                          updatePlan(i, {
                            ...plan,
                            limits: { ...plan.limits, custom: newCustom },
                          });
                        }}
                      >
                        {t('Remove')}
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="link"
                    icon={<PlusCircleIcon />}
                    onClick={() => {
                      const newCustom = [...(plan.limits?.custom || []), { limit: 0, window: '' }];
                      updatePlan(i, {
                        ...plan,
                        limits: { ...plan.limits, custom: newCustom },
                      });
                    }}
                  >
                    {t('Add custom rate')}
                  </Button>
                </ExpandableSection>
                <Button
                  variant="link"
                  isDanger
                  icon={<MinusCircleIcon />}
                  onClick={() => removePlan(i)}
                >
                  {t('Remove plan')}
                </Button>
              </div>
            ))}
            <Button variant="link" icon={<PlusCircleIcon />} onClick={addPlan}>
              {t('Add plan')}
            </Button>
            <ActionGroup className="pf-v6-u-mt-0">
              <KuadrantCreateUpdate
                model={policyModel}
                resource={policy}
                policyType="plan"
                history={history}
                validation={isFormValid}
              />
              <Button
                variant="link"
                onClick={() => handleCancel(history)}
              >
                {t('Cancel')}
              </Button>
            </ActionGroup>
          </Form>
        </PageSection>
      ) : (
        <React.Suspense fallback={<div>{t('Loading..')}.</div>}>
          <ResourceYAMLEditor
            initialResource={yamlInput}
            create={create}
            onChange={handleYAMLChange}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default KuadrantPlanPolicyCreatePage;
