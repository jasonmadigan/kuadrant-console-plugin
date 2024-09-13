import * as React from 'react';
import Helmet from 'react-helmet';
import yaml from 'js-yaml';
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
  ButtonVariant,
  Modal,
  ActionGroup,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import './kuadrant.css';
import { k8sCreate, ResourceYAMLEditor } from '@openshift-console/dynamic-plugin-sdk';
import { useHistory } from 'react-router-dom';
import { LoadBalancing, HealthCheck, DNSPolicy, WeightedCustom } from './dnspolicy/types'
import LoadBalancingField from './dnspolicy/LoadBalancingField';
import HealthCheckField from './dnspolicy/HealthCheckField';
import getModelFromResource from '../utils/getModelFromResource';
import { Gateway } from './gateway/types';
import GatewaySelect from './gateway/GatewaySelect';
import { ModalHeader, ModalBody, ModalFooter } from '@patternfly/react-core/next';
import NamespaceSelect from './namespace/NamespaceSelect';
import { removeUndefinedFields, convertMatchLabelsArrayToObject, convertMatchLabelsObjectToArray } from '../utils/modelUtils';

const KuadrantDNSPolicyCreatePage: React.FC = () => {
  const { t } = useTranslation('plugin__console-plugin-template');
  const [createView, setCreateView] = React.useState<'form' | 'yaml'>('form');
  const [policy, setPolicy] = React.useState('');
  const [selectedNamespace, setSelectedNamespace] = React.useState('');
  const [selectedGateway, setSelectedGateway] = React.useState<Gateway>({ name: '', namespace: '' });
  const [routingStrategy, setRoutingStrategy] = React.useState<'simple' | 'loadbalanced'>('simple');
  const [loadBalancing, setLoadBalancing] = React.useState<LoadBalancing>({
    geo: { defaultGeo: '' },
    weighted: { defaultWeight: 0 }
  });
  const [healthCheck, setHealthCheck] = React.useState<HealthCheck>({
    endpoint: '',
    failureThreshold: null,
    port: null,
    protocol: 'HTTP',
  });

  // Initialize the YAML resource object based on form state
  const [yamlResource, setYamlResource] = React.useState(() => {
    return removeUndefinedFields({
      apiVersion: 'kuadrant.io/v1alpha1',
      kind: 'DNSPolicy',
      metadata: {
        name: policy,
        namespace: selectedNamespace,
      },
      spec: {
        routingStrategy,
        targetRef: {
          group: 'gateway.networking.k8s.io',
          kind: 'Gateway',
          name: selectedGateway.name,
          namespace: selectedGateway.namespace,
        },
        loadBalancing: routingStrategy === 'loadbalanced' ? loadBalancing : undefined,
        healthCheck: healthCheck.endpoint ? healthCheck : undefined,
      },
    });
  });

  const history = useHistory();

  React.useEffect(() => {
    const updatedYamlResource = {
      apiVersion: 'kuadrant.io/v1alpha1',
      kind: 'DNSPolicy',
      metadata: {
        name: policy,
        namespace: selectedNamespace,
      },
      spec: {
        routingStrategy,
        targetRef: {
          group: 'gateway.networking.k8s.io',
          kind: 'Gateway',
          name: selectedGateway.name,
          namespace: selectedGateway.namespace,
        },
        loadBalancing: routingStrategy === 'loadbalanced' ? {
          ...loadBalancing,
          weighted: {
            ...loadBalancing.weighted,
            custom: loadBalancing.weighted.custom?.map((customWeight) => ({
              ...customWeight,
              selector: {
                ...customWeight.selector,
                // convert array to map for yaml viewing
                matchLabels: convertMatchLabelsArrayToObject(customWeight.selector.matchLabels || []),
              },
            })),
          },
        } : undefined,
        healthCheck: healthCheck.endpoint ? healthCheck : undefined,
      },
    };
  
    setYamlResource(removeUndefinedFields(updatedYamlResource)); // Clean undefined values
  }, [policy, selectedNamespace, selectedGateway, routingStrategy, loadBalancing, healthCheck]);  

  const [isErrorModalOpen, setIsErrorModalOpen] = React.useState(false);
  const [errorModalMsg, setErrorModalMsg] = React.useState('')

  const handleCreateViewChange = (value: 'form' | 'yaml') => {
    setCreateView(value);
  };

  const handlePolicyChange = (_event, policy: string) => {
    setPolicy(policy);
  };

  const handleYamlSave = (content: string) => {
    try {
      const parsedYaml = yaml.load(content) as DNSPolicy;
      if (parsedYaml) {
        setPolicy(parsedYaml.metadata.name || '');
        setSelectedNamespace(parsedYaml.metadata.namespace || '');
        setRoutingStrategy(parsedYaml.spec.routingStrategy);
        setSelectedGateway(parsedYaml.spec.targetRef);
        setLoadBalancing({
          ...parsedYaml.spec.loadBalancing,
          weighted: {
            ...parsedYaml.spec.loadBalancing?.weighted,
            custom: parsedYaml.spec.loadBalancing?.weighted?.custom?.map((customWeight) => ({
              ...customWeight,
              selector: {
                ...customWeight.selector,
                // Convert map back to array for form rendering
                matchLabels: convertMatchLabelsObjectToArray(
                  (typeof customWeight.selector.matchLabels === 'object' ? customWeight.selector.matchLabels : {}) as { [key: string]: string }
                ),
                },
            })),
          },
        });
        setHealthCheck(parsedYaml.spec.healthCheck || healthCheck);
      }
    } catch (error) {
      console.error('Error parsing YAML:', error);
    }
    handleSubmit();
  };

  const handleSubmit = async () => {
    const isHealthCheckValid =
      healthCheck.endpoint &&
      healthCheck.failureThreshold > 0 &&
      healthCheck.port > 0 &&
      healthCheck.protocol;

    const dnsPolicy: DNSPolicy = {
      apiVersion: 'kuadrant.io/v1alpha1',
      kind: 'DNSPolicy',
      metadata: {
        name: policy,
        namespace: selectedNamespace,
      },
      spec: {
        ...(routingStrategy === 'loadbalanced' && {
          loadBalancing: {
            geo: loadBalancing.geo,
            weighted: {
              ...loadBalancing.weighted,
              custom: loadBalancing.weighted.custom?.map((customWeight) => ({
                ...customWeight,
                selector: {
                  ...customWeight.selector, // keep matchLabels as an array for now
                },
              })),
            },
          },
        }),
        routingStrategy,
        targetRef: {
          group: 'gateway.networking.k8s.io',
          kind: 'Gateway',
          name: selectedGateway.name,
          namespace: selectedGateway.namespace
        },
        ...(isHealthCheckValid && { healthCheck }),
      },
    };

    const policyToSubmit = JSON.parse(JSON.stringify(dnsPolicy));
    // convert matchLabels array back to a key/value object for saving
    if (policyToSubmit.spec.loadBalancing?.weighted?.custom) {
      policyToSubmit.spec.loadBalancing.weighted.custom = policyToSubmit.spec.loadBalancing.weighted.custom.map(
        (customWeight: WeightedCustom) => ({
          ...customWeight,
          selector: {
            ...customWeight.selector,
            matchLabels: convertMatchLabelsArrayToObject(customWeight.selector.matchLabels || []), // Convert to object
          },
        })
      );
    }

    try {
      await k8sCreate({
        model: getModelFromResource(policyToSubmit),
        data: policyToSubmit,
        ns: selectedNamespace,
      });
      history.push('/kuadrant/all-namespaces/policies/dns'); // Navigate after successful creation
    } catch (error) {
      console.error(t('Error creating DNSPolicy'), error);
      setErrorModalMsg(error)
      setIsErrorModalOpen(true)
    }
  };

  const handleCancel = () => {
    history.push('/kuadrant/all-namespaces/policies');
  };

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">{t('Create DNSPolicy')}</title>
      </Helmet>
      <PageSection className='pf-m-no-padding'>
        <div className='co-m-nav-title'>
          <Title headingLevel="h1">{t('Create DNSPolicy')}</Title>
          <p className='help-block co-m-pane__heading-help-text'>
            <div>{t('DNSPolicy configures how North-South based traffic should be balanced and reach the gateways')}</div>
          </p>
        </div>
        <FormGroup className="kuadrant-editor-toggle" role="radiogroup" isInline hasNoPaddingTop fieldId="create-type-radio-group" label="Create via:">
          <Radio
            name="create-type-radio"
            label="Form"
            id="create-type-radio-form"
            isChecked={createView === 'form'}
            onChange={() => handleCreateViewChange('form')}
          />
          <Radio
            name="create-type-radio"
            label="YAML"
            id="create-type-radio-yaml"
            isChecked={createView === 'yaml'}
            onChange={() => handleCreateViewChange('yaml')}
          />
        </FormGroup>
      </PageSection>
      {createView === 'form' ? (
        <PageSection>
          <Form className='co-m-pane__form'>
            <div>
              <FormGroup label={t('Policy Name')} isRequired fieldId="policy-name">
                <TextInput
                  isRequired
                  type="text"
                  id="policy-name"
                  name="policy-name"
                  value={policy}
                  onChange={handlePolicyChange}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>{t('Unique name of the DNS Policy')}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <NamespaceSelect selectedNamespace={selectedNamespace} onChange={setSelectedNamespace} />
              <GatewaySelect selectedGateway={selectedGateway} onChange={setSelectedGateway} />
              <ExpandableSection toggleText={t('Routing Strategy')}>
                <FormGroup role="radiogroup" isInline fieldId='routing-strategy' label={t('Routing Strategy to use')} isRequired aria-labelledby="routing-strategy-label">
                  <Radio name='routing-strategy' label='Simple' id='routing-strategy-simple' isChecked={routingStrategy === 'simple'} onChange={() => setRoutingStrategy('simple')} />
                  <Radio name='routing-strategy' label='Load Balanced' id='routing-strategy-loadbalanced' isChecked={routingStrategy === 'loadbalanced'} onChange={() => setRoutingStrategy('loadbalanced')} />
                </FormGroup>
                {routingStrategy === 'loadbalanced' && (
                  <LoadBalancingField loadBalancing={loadBalancing} onChange={setLoadBalancing} />
                )}
              </ExpandableSection>
              <ExpandableSection toggleText={t('Health Check')}>
                <HealthCheckField healthCheck={healthCheck} onChange={setHealthCheck} />
              </ExpandableSection>
            </div>

            <ActionGroup>
              <Button variant={ButtonVariant.primary} onClick={handleSubmit}>
                {t('Create DNSPolicy')}
              </Button>
              <Button variant={ButtonVariant.secondary} onClick={handleCancel}>
                {t('Cancel')}
              </Button>
            </ActionGroup>
          </Form>
        </PageSection>
      ) : (
        <ResourceYAMLEditor initialResource={yamlResource} onSave={handleYamlSave} create />
      )}
      <Modal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        aria-labelledby="error-modal-title"
        aria-describedby="error-modal-body"
        variant="medium"
      >
        <ModalHeader title={t('Error creating DNSPolicy')} />
        <ModalBody>
          <b>{errorModalMsg}</b>
        </ModalBody>
        <ModalFooter>
          <Button key="ok" variant={ButtonVariant.link} onClick={() => setIsErrorModalOpen(false)}>
            OK
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default KuadrantDNSPolicyCreatePage;