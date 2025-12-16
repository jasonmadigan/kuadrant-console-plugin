import * as React from 'react';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { ResourceYAMLEditor, useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';
import resourceGVKMapping from '../../utils/resources';

const KuadrantPlanPolicyCreatePage: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [selectedNamespace] = useActiveNamespace();

  const yamlResource = {
    apiVersion:
      resourceGVKMapping['PlanPolicy'].group + '/' + resourceGVKMapping['PlanPolicy'].version,
    kind: resourceGVKMapping['PlanPolicy'].kind,
    metadata: {
      name: 'example-planpolicy',
      namespace: selectedNamespace,
    },
    spec: {
      targetRef: {
        group: 'gateway.networking.k8s.io',
        kind: 'HTTPRoute',
        name: 'example-httproute',
      },
      plans: {
        free: {
          limits: {
            'free-tier': {
              rates: [
                {
                  limit: 10,
                  window: '1m',
                },
              ],
            },
          },
        },
        premium: {
          limits: {
            'premium-tier': {
              rates: [
                {
                  limit: 100,
                  window: '1m',
                },
              ],
            },
          },
        },
      },
    },
  };

  return (
    <>
      <Helmet>
        <title>{t('Create PlanPolicy')}</title>
      </Helmet>

      <ResourceYAMLEditor initialResource={yamlResource} header="Create PlanPolicy" create={true} />
    </>
  );
};

export default KuadrantPlanPolicyCreatePage;
