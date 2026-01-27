import * as React from 'react';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { ResourceYAMLEditor, useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';
import { RESOURCES, getApiVersion, ResourceKind } from '../../utils/resources';

interface YAMLPolicyCreatePageProps {
  kind: ResourceKind;
  exampleName: string;
  exampleSpec: object;
}

const YAMLPolicyCreatePage: React.FC<YAMLPolicyCreatePageProps> = ({
  kind,
  exampleName,
  exampleSpec,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [selectedNamespace] = useActiveNamespace();

  const yamlResource = {
    apiVersion: getApiVersion(kind),
    kind: RESOURCES[kind].gvk.kind,
    metadata: {
      name: exampleName,
      namespace: selectedNamespace,
    },
    spec: exampleSpec,
  };

  const title = t(`Create ${kind}`);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <ResourceYAMLEditor initialResource={yamlResource} header={title} create />
    </>
  );
};

export default YAMLPolicyCreatePage;
