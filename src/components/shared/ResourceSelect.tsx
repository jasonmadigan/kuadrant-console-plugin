import { ResourceLink, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceGVK } from '../../utils/resources';

export interface NamespacedResource {
  name: string;
  namespace?: string;
}

interface ResourceSelectProps {
  gvk: ResourceGVK;
  selected: NamespacedResource;
  onChange: (updated: NamespacedResource) => void;
  label: string;
  placeholder: string;
  helperText: string;
  fieldId: string;
  isClusterScoped?: boolean;
}

const ResourceSelect: React.FC<ResourceSelectProps> = ({
  gvk,
  selected,
  onChange,
  label,
  placeholder,
  helperText,
  fieldId,
  isClusterScoped = false,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [resources, setResources] = React.useState<NamespacedResource[]>([]);

  const resourceConfig = {
    groupVersionKind: gvk,
    isList: true,
  };

  const [data, loaded, error] = useK8sWatchResource(resourceConfig);

  React.useEffect(() => {
    if (loaded && !error && Array.isArray(data)) {
      setResources(
        data.map((item) => ({
          name: item.metadata.name,
          ...(isClusterScoped ? {} : { namespace: item.metadata.namespace }),
        })),
      );
    }
  }, [data, loaded, error, isClusterScoped]);

  const handleChange = (event: React.FormEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;
    if (isClusterScoped) {
      onChange({ ...selected, name: value });
    } else {
      const [namespace, name] = value.split('/');
      onChange({ ...selected, name, namespace });
    }
  };

  const getValue = (resource: NamespacedResource) =>
    isClusterScoped ? resource.name : `${resource.namespace}/${resource.name}`;

  const currentValue = getValue(selected);

  return (
    <FormGroup label={t(label)} isRequired fieldId={fieldId}>
      <FormSelect
        id={fieldId}
        value={currentValue}
        onChange={handleChange}
        aria-label={t(placeholder)}
      >
        <FormSelectOption key="placeholder" value="" label={t(placeholder)} isPlaceholder />
        {resources.map((resource, index) => {
          const value = getValue(resource);
          return <FormSelectOption key={index} value={value} label={value} />;
        })}
      </FormSelect>
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {t(helperText)}{' '}
            <ResourceLink
              groupVersionKind={gvk}
              title={`Create ${gvk.kind}`}
              hideIcon={true}
              inline={true}
              displayName="here"
            />
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default ResourceSelect;
