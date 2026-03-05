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
import {
  TargetRef,
  PatternExpression,
  WhenPredicate,
  AuthenticationSpec,
  MetadataSpec,
  AuthorizationSpec,
  ResponseSpec,
  CallbackSpec,
  DefaultsOrOverrides,
  AuthSchemeSpec,
} from './authpolicy/types';
import TargetRefField from './ratelimitpolicy/TargetRefField';
import NamedPatternsSection from './authpolicy/NamedPatternsSection';
import WhenConditionsField from './authpolicy/WhenConditionsField';
import AuthenticationSection from './authpolicy/AuthenticationSection';
import MetadataSection from './authpolicy/MetadataSection';
import AuthorizationSection from './authpolicy/AuthorizationSection';
import ResponseSection from './authpolicy/ResponseSection';
import CallbacksSection from './authpolicy/CallbacksSection';
import KuadrantCreateUpdate from './KuadrantCreateUpdate';
import { handleCancel } from '../utils/cancel';
import { resourceGVKMapping } from '../utils/resources';

type SpecMode = 'rules' | 'defaults' | 'overrides';

const KuadrantAuthPolicyCreatePage: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const history = useHistory();
  const location = useLocation();
  const [selectedNamespace] = useActiveNamespace();
  const [createView, setCreateView] = React.useState<'form' | 'yaml'>('form');
  const [policyName, setPolicyName] = React.useState('');
  const [targetRef, setTargetRef] = React.useState<TargetRef>({
    group: 'gateway.networking.k8s.io',
    kind: 'Gateway',
    name: '',
  });
  const [specMode, setSpecMode] = React.useState<SpecMode>('rules');
  const [strategy, setStrategy] = React.useState<'atomic' | 'merge'>('atomic');

  // named patterns
  const [namedPatterns, setNamedPatterns] = React.useState<
    Record<string, { allOf: PatternExpression[] }>
  >({});

  // conditions
  const [topLevelWhen, setTopLevelWhen] = React.useState<WhenPredicate[]>([]);
  const [sectionWhen, setSectionWhen] = React.useState<WhenPredicate[]>([]);

  // rules
  const [authentication, setAuthentication] = React.useState<Record<string, AuthenticationSpec>>(
    {},
  );
  const [metadata, setMetadata] = React.useState<Record<string, MetadataSpec>>({});
  const [authorization, setAuthorization] = React.useState<Record<string, AuthorizationSpec>>({});
  const [response, setResponse] = React.useState<ResponseSpec>({});
  const [callbacks, setCallbacks] = React.useState<Record<string, CallbackSpec>>({});

  // edit mode state
  const [formDisabled, setFormDisabled] = React.useState(false);
  const [create, setCreate] = React.useState(true);
  const [creationTimestamp, setCreationTimestamp] = React.useState('');
  const [resourceVersion, setResourceVersion] = React.useState('');

  const pathSplit = location.pathname.split('/');
  const nameEdit = pathSplit[6];
  const namespaceEdit = pathSplit[3];

  const gvkInfo = resourceGVKMapping['AuthPolicy'];
  const policyGVK = getGroupVersionKindForResource({
    apiVersion: `${gvkInfo.group}/${gvkInfo.version}`,
    kind: gvkInfo.kind,
  });
  const [policyModel] = useK8sModel({
    group: policyGVK.group,
    version: policyGVK.version,
    kind: policyGVK.kind,
  });

  // build the policy resource from form state
  const createPolicy = () => {
    const cleanTargetRef: Record<string, string> = {
      group: targetRef.group,
      kind: targetRef.kind,
      name: targetRef.name,
    };
    if (targetRef.sectionName) {
      cleanTargetRef.sectionName = targetRef.sectionName;
    }

    const hasAuth = Object.keys(authentication).length > 0;
    const hasMeta = Object.keys(metadata).length > 0;
    const hasAuthz = Object.keys(authorization).length > 0;
    const hasCallbacks = Object.keys(callbacks).length > 0;
    const hasResponse = response.unauthenticated || response.unauthorized || response.success;

    // build rules object
    const rules: AuthSchemeSpec = {};
    if (hasAuth) rules.authentication = authentication;
    if (hasMeta) rules.metadata = metadata;
    if (hasAuthz) rules.authorization = authorization;
    if (hasResponse) rules.response = response;
    if (hasCallbacks) rules.callbacks = callbacks;

    const hasRules = Object.keys(rules).length > 0;
    const hasPatterns = Object.keys(namedPatterns).length > 0;
    const cleanWhen = topLevelWhen.length > 0 ? topLevelWhen : undefined;
    const cleanSectionWhen = sectionWhen.length > 0 ? sectionWhen : undefined;

    const spec: Record<string, unknown> = { targetRef: cleanTargetRef };

    if (specMode === 'rules') {
      if (hasPatterns) spec.patterns = namedPatterns;
      if (cleanWhen) spec.when = cleanWhen;
      if (hasRules) spec.rules = rules;
    } else {
      const section: Record<string, unknown> = {};
      if (strategy !== 'atomic') section.strategy = strategy;
      if (hasPatterns) section.patterns = namedPatterns;
      if (cleanSectionWhen) section.when = cleanSectionWhen;
      if (hasRules) section.rules = rules;
      if (Object.keys(section).length > 0) spec[specMode] = section;
      if (cleanWhen) spec.when = cleanWhen;
    }

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

    // determine spec mode and load the proper section
    const loadSpecProper = (source: Record<string, unknown>) => {
      setNamedPatterns((source.patterns as Record<string, { allOf: PatternExpression[] }>) || {});
      const rules = (source.rules as AuthSchemeSpec) || {};
      setAuthentication(rules.authentication || {});
      setMetadata(rules.metadata || {});
      setAuthorization(rules.authorization || {});
      setResponse(rules.response || {});
      setCallbacks(rules.callbacks || {});
    };

    if (spec.defaults) {
      setSpecMode('defaults');
      const d = spec.defaults as DefaultsOrOverrides;
      setStrategy(d.strategy || 'atomic');
      setSectionWhen(d.when || []);
      loadSpecProper(d as unknown as Record<string, unknown>);
    } else if (spec.overrides) {
      setSpecMode('overrides');
      const o = spec.overrides as DefaultsOrOverrides;
      setStrategy(o.strategy || 'atomic');
      setSectionWhen(o.when || []);
      loadSpecProper(o as unknown as Record<string, unknown>);
    } else {
      setSpecMode('rules');
      loadSpecProper(spec);
    }

    setTopLevelWhen((spec.when as WhenPredicate[]) || []);
  }, [watchData, watchLoaded, watchError]);

  // sync form to yaml
  React.useEffect(() => {
    setYamlInput(createPolicy());
  }, [
    policyName,
    selectedNamespace,
    targetRef,
    specMode,
    strategy,
    namedPatterns,
    topLevelWhen,
    sectionWhen,
    authentication,
    metadata,
    authorization,
    response,
    callbacks,
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

      const loadSpecProper = (source: Record<string, unknown>) => {
        setNamedPatterns((source.patterns as Record<string, { allOf: PatternExpression[] }>) || {});
        const rules = (source.rules as AuthSchemeSpec) || {};
        setAuthentication(rules.authentication || {});
        setMetadata(rules.metadata || {});
        setAuthorization(rules.authorization || {});
        setResponse(rules.response || {});
        setCallbacks(rules.callbacks || {});
      };

      if (spec?.defaults) {
        setSpecMode('defaults');
        const d = spec.defaults as DefaultsOrOverrides;
        setStrategy(d.strategy || 'atomic');
        setSectionWhen(d.when || []);
        loadSpecProper(d as unknown as Record<string, unknown>);
      } else if (spec?.overrides) {
        setSpecMode('overrides');
        const o = spec.overrides as DefaultsOrOverrides;
        setStrategy(o.strategy || 'atomic');
        setSectionWhen(o.when || []);
        loadSpecProper(o as unknown as Record<string, unknown>);
      } else {
        setSpecMode('rules');
        loadSpecProper(spec || {});
      }

      setTopLevelWhen((spec?.when as WhenPredicate[]) || []);
    } catch (e) {
      console.error('error parsing yaml:', e);
    }
  };

  const policy = createPolicy();

  const isFormValid = !!(policyName && targetRef.name);

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">
          {create ? t('Create AuthPolicy') : t('Edit AuthPolicy')}
        </title>
      </Helmet>
      <PageSection hasBodyWrapper={false}>
        <div className="co-m-nav-title">
          <Title headingLevel="h1">{create ? t('Create AuthPolicy') : t('Edit AuthPolicy')}</Title>
          <p className="help-block">
            {t('AuthPolicy enables authentication and authorization for Gateway API resources')}
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
                  <HelperTextItem>{t('Unique name of the AuthPolicy')}</HelperTextItem>
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
              label={t('Rule application mode')}
              isRequired
            >
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    {t(
                      'How rules are applied when multiple policies target overlapping resources.',
                    )}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
              <Radio
                label={t('Rules')}
                description={t('Apply rules directly to the target')}
                isChecked={specMode === 'rules'}
                onChange={() => setSpecMode('rules')}
                id="spec-mode-rules"
                name="spec-mode"
              />
              <Radio
                label={t('Defaults')}
                description={t(
                  'Set default rules that can be overridden by more specific policies',
                )}
                isChecked={specMode === 'defaults'}
                onChange={() => setSpecMode('defaults')}
                id="spec-mode-defaults"
                name="spec-mode"
              />
              <Radio
                label={t('Overrides')}
                description={t('Enforce rules that cannot be overridden by more specific policies')}
                isChecked={specMode === 'overrides'}
                onChange={() => setSpecMode('overrides')}
                id="spec-mode-overrides"
                name="spec-mode"
              />
            </FormGroup>
            {specMode !== 'rules' && (
              <>
                <FormGroup role="radiogroup" fieldId="strategy" label={t('Merge strategy')}>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        {t(
                          'How these rules interact with rules from other policies targeting the same resource.',
                        )}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                  <Radio
                    label={t('Atomic')}
                    description={t('Replace all rules from less specific policies')}
                    isChecked={strategy === 'atomic'}
                    onChange={() => setStrategy('atomic')}
                    id="strategy-atomic"
                    name="strategy"
                  />
                  <Radio
                    label={t('Merge')}
                    description={t('Combine with rules from less specific policies')}
                    isChecked={strategy === 'merge'}
                    onChange={() => setStrategy('merge')}
                    id="strategy-merge"
                    name="strategy"
                  />
                </FormGroup>
                <ExpandableSection toggleText={t('Conditions for this policy mode')}>
                  <WhenConditionsField
                    label={t('Conditions')}
                    predicates={sectionWhen}
                    onChange={setSectionWhen}
                  />
                </ExpandableSection>
              </>
            )}
            <div>
              <ExpandableSection toggleText={t('Named patterns')}>
                <NamedPatternsSection patterns={namedPatterns} onChange={setNamedPatterns} />
              </ExpandableSection>
              <ExpandableSection toggleText={t('Authentication')}>
                <AuthenticationSection authentication={authentication} onChange={setAuthentication} />
              </ExpandableSection>
              <ExpandableSection toggleText={t('Metadata')}>
                <MetadataSection metadata={metadata} onChange={setMetadata} />
              </ExpandableSection>
              <ExpandableSection toggleText={t('Authorization')}>
                <AuthorizationSection authorization={authorization} onChange={setAuthorization} />
              </ExpandableSection>
              <ExpandableSection toggleText={t('Response')}>
                <ResponseSection response={response} onChange={setResponse} />
              </ExpandableSection>
              <ExpandableSection toggleText={t('Callbacks')}>
                <CallbacksSection callbacks={callbacks} onChange={setCallbacks} />
              </ExpandableSection>
              <ExpandableSection toggleText={t('Global conditions')}>
                <WhenConditionsField
                  label={t('Global conditions')}
                  predicates={topLevelWhen}
                  onChange={setTopLevelWhen}
                />
              </ExpandableSection>
            </div>
            <ActionGroup className="pf-u-mt-0">
              <KuadrantCreateUpdate
                model={policyModel}
                resource={policy}
                policyType="auth"
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

export default KuadrantAuthPolicyCreatePage;
