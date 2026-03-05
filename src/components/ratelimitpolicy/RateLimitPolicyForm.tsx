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
import { useTranslation } from 'react-i18next';
import '../kuadrant.css';
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
import { TargetRef, LimitConfig, Predicate, DefaultsOrOverrides } from './types';
import TargetRefField from './TargetRefField';
import LimitsSection from './LimitsSection';
import WhenField from './WhenField';
import KuadrantCreateUpdate from '../KuadrantCreateUpdate';
import { handleCancel } from '../../utils/cancel';
import { resourceGVKMapping } from '../../utils/resources';

export interface RateLimitFormConfig {
  resourceKey: string;
  policyType: string;
  tokenMode?: boolean;
  createTitle: string;
  editTitle: string;
  description: string;
  nameHelperText: string;
}

type SpecMode = 'limits' | 'defaults' | 'overrides';

const RateLimitPolicyForm: React.FC<{ config: RateLimitFormConfig }> = ({ config }) => {
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
  const [specMode, setSpecMode] = React.useState<SpecMode>('limits');
  const [limits, setLimits] = React.useState<Record<string, LimitConfig>>({});
  const [strategy, setStrategy] = React.useState<'atomic' | 'merge'>('atomic');
  const [sectionWhen, setSectionWhen] = React.useState<Predicate[]>([]);
  const [topLevelWhen, setTopLevelWhen] = React.useState<Predicate[]>([]);
  const [formDisabled, setFormDisabled] = React.useState(false);
  const [create, setCreate] = React.useState(true);
  const [creationTimestamp, setCreationTimestamp] = React.useState('');
  const [resourceVersion, setResourceVersion] = React.useState('');

  const pathSplit = location.pathname.split('/');
  const nameEdit = pathSplit[6];
  const namespaceEdit = pathSplit[3];

  const gvkInfo = resourceGVKMapping[config.resourceKey];
  const policyGVK = getGroupVersionKindForResource({
    apiVersion: `${gvkInfo.group}/${gvkInfo.version}`,
    kind: gvkInfo.kind,
  });
  const [policyModel] = useK8sModel({
    group: policyGVK.group,
    version: policyGVK.version,
    kind: policyGVK.kind,
  });

  const createPolicy = () => {
    const cleanTargetRef: Record<string, string> = {
      group: targetRef.group,
      kind: targetRef.kind,
      name: targetRef.name,
    };
    if (targetRef.sectionName) {
      cleanTargetRef.sectionName = targetRef.sectionName;
    }

    const hasLimits = Object.keys(limits).length > 0;
    const cleanWhen = topLevelWhen.filter((p) => p.predicate);
    const cleanSectionWhen = sectionWhen.filter((p) => p.predicate);

    const spec: Record<string, unknown> = { targetRef: cleanTargetRef };

    if (specMode === 'limits') {
      if (hasLimits) spec.limits = limits;
    } else {
      const section: Record<string, unknown> = {};
      if (hasLimits) section.limits = limits;
      if (strategy !== 'atomic') section.strategy = strategy;
      if (cleanSectionWhen.length > 0) section.when = cleanSectionWhen;
      if (Object.keys(section).length > 0) spec[specMode] = section;
    }

    if (cleanWhen.length > 0) spec.when = cleanWhen;

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

    if (spec.defaults) {
      setSpecMode('defaults');
      const d = spec.defaults as DefaultsOrOverrides;
      setLimits(d.limits || {});
      setStrategy(d.strategy || 'atomic');
      setSectionWhen(d.when || []);
    } else if (spec.overrides) {
      setSpecMode('overrides');
      const o = spec.overrides as DefaultsOrOverrides;
      setLimits(o.limits || {});
      setStrategy(o.strategy || 'atomic');
      setSectionWhen(o.when || []);
    } else {
      setSpecMode('limits');
      setLimits((spec.limits as Record<string, LimitConfig>) || {});
    }

    setTopLevelWhen((spec.when as Predicate[]) || []);
  }, [watchData, watchLoaded, watchError]);

  // sync form to yaml
  React.useEffect(() => {
    setYamlInput(createPolicy());
  }, [
    policyName,
    selectedNamespace,
    targetRef,
    specMode,
    limits,
    strategy,
    sectionWhen,
    topLevelWhen,
  ]);

  const handleYAMLChange = (input: string) => {
    try {
      const parsed = yaml.load(input) as Record<string, unknown>;
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

      if (spec?.defaults) {
        setSpecMode('defaults');
        const d = spec.defaults as DefaultsOrOverrides;
        setLimits(d.limits || {});
        setStrategy(d.strategy || 'atomic');
        setSectionWhen(d.when || []);
      } else if (spec?.overrides) {
        setSpecMode('overrides');
        const o = spec.overrides as DefaultsOrOverrides;
        setLimits(o.limits || {});
        setStrategy(o.strategy || 'atomic');
        setSectionWhen(o.when || []);
      } else {
        setSpecMode('limits');
        setLimits((spec?.limits as Record<string, LimitConfig>) || {});
      }

      setTopLevelWhen((spec?.when as Predicate[]) || []);
    } catch (e) {
      console.error('error parsing yaml:', e);
    }
  };

  const policy = createPolicy();
  const hasAtLeastOneRate = Object.values(limits).some(
    (l) => l.rates && l.rates.length > 0 && l.rates.some((r) => r.limit > 0 && r.window),
  );
  const isFormValid = !!(
    policyName &&
    targetRef.name &&
    Object.keys(limits).length > 0 &&
    hasAtLeastOneRate
  );

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">
          {create ? t(config.createTitle) : t(config.editTitle)}
        </title>
      </Helmet>
      <PageSection hasBodyWrapper={false}>
        <div className="co-m-nav-title">
          <Title headingLevel="h1">
            {create ? t(config.createTitle) : t(config.editTitle)}
          </Title>
          <p className="help-block">{t(config.description)}</p>
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
                  <HelperTextItem>{t(config.nameHelperText)}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <TargetRefField
              targetRef={targetRef}
              onChange={setTargetRef}
              formDisabled={formDisabled}
              namespace={namespaceEdit || selectedNamespace}
            />
            <FormGroup
              className="kuadrant-rule-mode-section"
              role="radiogroup"
              fieldId="spec-mode"
              label={t('Limit application mode')}
              isRequired
            >
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    {t(
                      'How limits are applied when multiple policies target overlapping resources.',
                    )}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
              <Radio
                label={t('Limits')}
                description={t('Apply limits directly to the target')}
                isChecked={specMode === 'limits'}
                onChange={() => setSpecMode('limits')}
                id="spec-mode-limits"
                name="spec-mode"
              />
              <Radio
                label={t('Defaults')}
                description={t(
                  'Set default limits that can be overridden by more specific policies',
                )}
                isChecked={specMode === 'defaults'}
                onChange={() => setSpecMode('defaults')}
                id="spec-mode-defaults"
                name="spec-mode"
              />
              <Radio
                label={t('Overrides')}
                description={t(
                  'Enforce limits that cannot be overridden by more specific policies',
                )}
                isChecked={specMode === 'overrides'}
                onChange={() => setSpecMode('overrides')}
                id="spec-mode-overrides"
                name="spec-mode"
              />
            </FormGroup>
            {specMode !== 'limits' && (
              <>
                <FormGroup role="radiogroup" fieldId="strategy" label={t('Merge strategy')}>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        {t(
                          'How these limits interact with limits from other policies targeting the same resource.',
                        )}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                  <Radio
                    label={t('Atomic')}
                    description={t('Replace all limits from less specific policies')}
                    isChecked={strategy === 'atomic'}
                    onChange={() => setStrategy('atomic')}
                    id="strategy-atomic"
                    name="strategy"
                  />
                  <Radio
                    label={t('Merge')}
                    description={t('Combine with limits from less specific policies')}
                    isChecked={strategy === 'merge'}
                    onChange={() => setStrategy('merge')}
                    id="strategy-merge"
                    name="strategy"
                  />
                </FormGroup>
                <ExpandableSection toggleText={t('Conditions for this policy mode')}>
                  <WhenField
                    label={t('Conditions')}
                    predicates={sectionWhen}
                    onChange={setSectionWhen}
                  />
                </ExpandableSection>
              </>
            )}
            <LimitsSection limits={limits} onChange={setLimits} tokenMode={config.tokenMode} />
            <ExpandableSection toggleText={t('Global conditions')}>
              <WhenField
                label={t('Global conditions')}
                predicates={topLevelWhen}
                onChange={setTopLevelWhen}
              />
            </ExpandableSection>
            <ActionGroup className="pf-v6-u-mt-0">
              <KuadrantCreateUpdate
                model={policyModel}
                resource={policy}
                policyType={config.policyType}
                history={history}
                validation={isFormValid}
              />
              <Button
                variant="link"
                onClick={() => handleCancel(selectedNamespace, policy, history)}
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

export default RateLimitPolicyForm;
