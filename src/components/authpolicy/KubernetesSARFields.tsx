import { FormGroup, Title } from '@patternfly/react-core';
import * as React from 'react';
import { KubernetesSubjectAccessReviewAuthz, SelectorValue } from './types';
import SelectorValueField from './SelectorValueField';
import { useTranslation } from 'react-i18next';

interface KubernetesSARFieldsProps {
  sar: KubernetesSubjectAccessReviewAuthz;
  onChange: (sar: KubernetesSubjectAccessReviewAuthz) => void;
}

const RESOURCE_ATTRS = ['group', 'resource', 'verb', 'name', 'namespace', 'subresource'] as const;

const KubernetesSARFields: React.FC<KubernetesSARFieldsProps> = ({ sar, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  const updateAttr = (attr: typeof RESOURCE_ATTRS[number], val: SelectorValue) => {
    const attrs = {
      ...sar.resourceAttributes,
      [attr]: val.selector || val.value ? val : undefined,
    };
    onChange({ ...sar, resourceAttributes: attrs });
  };

  return (
    <>
      <FormGroup label={t('User')} fieldId="sar-user">
        <SelectorValueField
          value={sar.user || {}}
          onChange={(user) =>
            onChange({ ...sar, user: user.selector || user.value ? user : undefined })
          }
          selectorPlaceholder={t('User selector')}
          valuePlaceholder={t('User value')}
        />
      </FormGroup>
      <Title headingLevel="h4" size="md">
        {t('Resource attributes')}
      </Title>
      {RESOURCE_ATTRS.map((attr) => (
        <FormGroup
          key={attr}
          label={t(attr.charAt(0).toUpperCase() + attr.slice(1))}
          fieldId={`sar-${attr}`}
        >
          <SelectorValueField
            value={sar.resourceAttributes?.[attr] || {}}
            onChange={(val) => updateAttr(attr, val)}
          />
        </FormGroup>
      ))}
    </>
  );
};

export default KubernetesSARFields;
