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
import { Gateway } from './gateway/types';
import GatewaySelect from './gateway/GatewaySelect';
import KuadrantCreateUpdate from './KuadrantCreateUpdate';
import { handleCancel } from '../utils/cancel';
import { resourceGVKMapping } from '../utils/resources';

interface MetricsLabel {
  key: string;
  value: string;
}

const KuadrantTelemetryPolicyCreatePage: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const history = useHistory();
  const location = useLocation();
  const [selectedNamespace] = useActiveNamespace();
  const [createView, setCreateView] = React.useState<'form' | 'yaml'>('form');
  const [policyName, setPolicyName] = React.useState('');
  const [selectedGateway, setSelectedGateway] = React.useState<Gateway>(() => {
    const ns = window.location.pathname.split('/')[3] || '';
    return {
      name: new URLSearchParams(window.location.search).get('targetName') || '',
      namespace: ns !== '#ALL_NS#' ? ns : '',
    };
  });
  const [metricsLabels, setMetricsLabels] = React.useState<MetricsLabel[]>([
    { key: '', value: '' },
  ]);
  const [formDisabled, setFormDisabled] = React.useState(false);
  const [create, setCreate] = React.useState(true);
  const [creationTimestamp, setCreationTimestamp] = React.useState('');
  const [resourceVersion, setResourceVersion] = React.useState('');

  const pathSplit = location.pathname.split('/');
  const nameEdit = pathSplit[6];
  const namespaceEdit = pathSplit[3];

  const gvkInfo = resourceGVKMapping['TelemetryPolicy'];
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
    const labelsMap: Record<string, string> = {};
    metricsLabels.forEach((l) => {
      if (l.key) labelsMap[l.key] = l.value;
    });

    return {
      apiVersion: `${gvkInfo.group}/${gvkInfo.version}`,
      kind: gvkInfo.kind,
      metadata: {
        name: policyName,
        namespace: selectedNamespace,
        ...(creationTimestamp ? { creationTimestamp } : {}),
        ...(resourceVersion ? { resourceVersion } : {}),
      },
      spec: {
        targetRef: {
          group: 'gateway.networking.k8s.io',
          kind: 'Gateway',
          name: selectedGateway.name,
        },
        metrics: {
          default: {
            labels: Object.keys(labelsMap).length > 0 ? labelsMap : undefined,
          },
        },
      },
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
    const ref = spec.targetRef as { name?: string };
    if (ref) {
      setSelectedGateway({
        name: ref.name || '',
        namespace: existing.metadata?.namespace || '',
      });
    }

    const metrics = spec.metrics as { default?: { labels?: Record<string, string> } };
    const labels = metrics?.default?.labels || {};
    const entries = Object.entries(labels).map(([key, value]) => ({ key, value }));
    setMetricsLabels(entries.length > 0 ? entries : [{ key: '', value: '' }]);
  }, [watchData, watchLoaded, watchError]);

  // sync form to yaml
  React.useEffect(() => {
    setYamlInput(createPolicy());
  }, [policyName, selectedNamespace, selectedGateway, metricsLabels]);

  const handleYAMLChange = (input: string) => {
    try {
      const parsed = yaml.load(input) as Record<string, unknown>;
      const meta = parsed.metadata as Record<string, string>;
      const spec = parsed.spec as Record<string, unknown>;
      setPolicyName(meta?.name || '');

      if (spec?.targetRef) {
        const ref = spec.targetRef as { name?: string };
        setSelectedGateway({
          name: ref.name || '',
          namespace: meta?.namespace || '',
        });
      }

      const metrics = spec?.metrics as { default?: { labels?: Record<string, string> } };
      const labels = metrics?.default?.labels || {};
      const entries = Object.entries(labels).map(([key, value]) => ({ key, value }));
      setMetricsLabels(entries.length > 0 ? entries : [{ key: '', value: '' }]);
    } catch (e) {
      console.error('error parsing yaml:', e);
    }
  };

  const updateLabel = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...metricsLabels];
    updated[index] = { ...updated[index], [field]: val };
    setMetricsLabels(updated);
  };

  const addLabel = () => {
    setMetricsLabels([...metricsLabels, { key: '', value: '' }]);
  };

  const removeLabel = (index: number) => {
    const updated = metricsLabels.filter((_, i) => i !== index);
    setMetricsLabels(updated.length > 0 ? updated : [{ key: '', value: '' }]);
  };

  const policy = createPolicy();
  const hasAtLeastOneLabel = metricsLabels.some((l) => l.key.trim() !== '');
  const isFormValid = !!(policyName && selectedGateway.name && hasAtLeastOneLabel);

  return (
    <>
      <Helmet>
        <title data-test="telemetrypolicy-page-title">
          {create ? t('Create Telemetry Policy') : t('Edit Telemetry Policy')}
        </title>
      </Helmet>
      <PageSection hasBodyWrapper={false}>
        <div className="co-m-nav-title">
          <Title headingLevel="h1">
            {create ? t('Create Telemetry Policy') : t('Edit Telemetry Policy')}
          </Title>
          <p className="help-block">
            {t('TelemetryPolicy configures metrics labels for Gateway API resources')}
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
                  <HelperTextItem>{t('Unique name of the Telemetry Policy')}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <GatewaySelect
              selectedGateway={selectedGateway}
              onChange={setSelectedGateway}
              namespace={namespaceEdit || selectedNamespace}
              isDisabled={formDisabled}
            />
            <FormGroup label={t('Metrics labels')} isRequired fieldId="metrics-labels">
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    {t('Map of label names to CEL expressions. At least one label is required.')}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
              {metricsLabels.map((label, index) => (
                <div className="kuadrant-field-row" key={index}>
                  <div className="kuadrant-field-row__input">
                    <TextInput
                      type="text"
                      id={`label-key-${index}`}
                      value={label.key}
                      onChange={(_event, val) => updateLabel(index, 'key', val)}
                      placeholder={t('Label name')}
                    />
                  </div>
                  <div className="kuadrant-field-row__input">
                    <TextInput
                      type="text"
                      id={`label-value-${index}`}
                      value={label.value}
                      onChange={(_event, val) => updateLabel(index, 'value', val)}
                      placeholder={t('CEL expression')}
                    />
                  </div>
                  <Button
                    variant="link"
                    isDanger
                    icon={<MinusCircleIcon />}
                    onClick={() => removeLabel(index)}
                  >
                    {t('Remove')}
                  </Button>
                </div>
              ))}
              <Button variant="link" icon={<PlusCircleIcon />} onClick={addLabel}>
                {t('Add label')}
              </Button>
            </FormGroup>
            <ActionGroup className="pf-v6-u-mt-0">
              <KuadrantCreateUpdate
                model={policyModel}
                resource={policy}
                policyType="telemetry"
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

export default KuadrantTelemetryPolicyCreatePage;
