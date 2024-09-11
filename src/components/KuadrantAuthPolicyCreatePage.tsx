import * as React from 'react';
import Helmet from 'react-helmet';
import { PageSection, Button, Modal, ModalHeader, ModalBody, ModalFooter, ButtonVariant, ActionGroup } from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { k8sCreate, ResourceYAMLEditor } from '@openshift-console/dynamic-plugin-sdk';
import { useHistory } from 'react-router-dom';
import getModelFromResource from '../utils/getModelFromResource';

const KuadrantAuthPolicyCreatePage: React.FC = () => {
  const { t } = useTranslation('plugin__console-plugin-template');
  const history = useHistory();

  // YAML editor state
  const [yamlResource, setYamlResource] = React.useState<string | object>({
    apiVersion: 'kuadrant.io/v1beta2',
    kind: 'AuthPolicy',
    metadata: {
      name: 'example-authpolicy',
      namespace: 'default',
    },
    spec: {
      rules: {
        authorization: {
          denyAll: {
            opa: {
              rego: 'allow = false',
            },
          },
        },
        response: {
          unauthorized: {
            body: {
              value: `{
                "error": "Forbidden",
                "message": "Access denied by default. Create a specific auth policy for the route."
              }`,
            },
            headers: {
              'content-type': {
                value: 'application/json',
              },
            },
          },
        },
      },
      targetRef: {
        group: 'gateway.networking.k8s.io',
        kind: 'Gateway',
        name: 'prod-web',
      },
    },
  });

  // Error Modal State
  const [isErrorModalOpen, setIsErrorModalOpen] = React.useState(false);
  const [errorModalMsg, setErrorModalMsg] = React.useState('');

  // Handle submission of the YAML resource
  const handleSubmit = async () => {
    try {
      await k8sCreate({
        model: getModelFromResource(yamlResource),
        data: yamlResource,
        ns: yamlResource?.metadata?.namespace,
      });
      history.push('/kuadrant/all-namespaces/policies/auth'); // Navigate after successful creation
    } catch (error) {
      console.error(t('Error creating AuthPolicy'), error);
      setErrorModalMsg(error.message || error.toString());
      setIsErrorModalOpen(true);
    }
  };

  // Handle cancellation
  const handleCancel = () => {
    history.push('/kuadrant/all-namespaces/policies');
  };

  return (
    <>
      <Helmet>
        <title>{t('Create AuthPolicy')}</title>
      </Helmet>
      <PageSection>
        <ResourceYAMLEditor initialResource={yamlResource} onChange={setYamlResource} />
        <ActionGroup>
          <Button variant="primary" onClick={handleSubmit}>
            {t('Create AuthPolicy')}
          </Button>
          <Button variant="secondary" onClick={handleCancel}>
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </PageSection>
      
      <Modal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        aria-labelledby="error-modal-title"
        aria-describedby="error-modal-body"
        variant="medium"
      >
        <ModalHeader title={t('Error creating AuthPolicy')} />
        <ModalBody>
          <b>{errorModalMsg}</b>
        </ModalBody>
        <ModalFooter>
          <Button variant={ButtonVariant.link} onClick={() => setIsErrorModalOpen(false)}>
            OK
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default KuadrantAuthPolicyCreatePage;
