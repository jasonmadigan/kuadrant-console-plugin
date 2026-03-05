import { FormGroup, FormSelect, FormSelectOption, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { MetadataSpec, MetadataType } from './types';
import HttpRequestField from './HttpRequestField';
import EvaluatorCommonFields from './EvaluatorCommonFields';
import { useTranslation } from 'react-i18next';

interface MetadataEntryProps {
  name: string;
  spec: MetadataSpec;
  onNameChange: (name: string) => void;
  onChange: (spec: MetadataSpec) => void;
}

const METADATA_TYPES: { value: MetadataType; label: string }[] = [
  { value: 'http', label: 'HTTP' },
  { value: 'userInfo', label: 'User info' },
  { value: 'uma', label: 'UMA' },
];

function getActiveType(spec: MetadataSpec): MetadataType {
  if (spec.http) return 'http';
  if (spec.userInfo) return 'userInfo';
  if (spec.uma) return 'uma';
  return 'http';
}

function clearTypeFields(spec: MetadataSpec): MetadataSpec {
  const { http, userInfo, uma, ...rest } = spec;
  void http;
  void userInfo;
  void uma;
  return rest;
}

const MetadataEntry: React.FC<MetadataEntryProps> = ({ name, spec, onNameChange, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const activeType = getActiveType(spec);

  const handleTypeChange = (newType: MetadataType) => {
    const base = clearTypeFields(spec);
    switch (newType) {
      case 'http':
        onChange({ ...base, http: { url: '' } });
        break;
      case 'userInfo':
        onChange({ ...base, userInfo: { identitySource: '' } });
        break;
      case 'uma':
        onChange({ ...base, uma: { endpoint: '', credentialsRef: { name: '' } } });
        break;
    }
  };

  const renderTypeFields = () => {
    switch (activeType) {
      case 'http':
        return (
          <HttpRequestField
            config={spec.http || { url: '' }}
            onChange={(http) => onChange({ ...spec, http })}
          />
        );

      case 'userInfo':
        return (
          <FormGroup label={t('Identity source')} isRequired fieldId="userinfo-source">
            <TextInput
              isRequired
              type="text"
              value={spec.userInfo?.identitySource || ''}
              onChange={(_e, val) => onChange({ ...spec, userInfo: { identitySource: val } })}
              placeholder={t('auth.identity.sub')}
              aria-label={t('Identity source')}
            />
          </FormGroup>
        );

      case 'uma':
        return (
          <>
            <FormGroup label={t('Endpoint')} isRequired fieldId="uma-endpoint">
              <TextInput
                isRequired
                type="text"
                value={spec.uma?.endpoint || ''}
                onChange={(_e, val) =>
                  onChange({
                    ...spec,
                    uma: {
                      ...spec.uma,
                      endpoint: val,
                      credentialsRef: spec.uma?.credentialsRef || { name: '' },
                    },
                  })
                }
                placeholder={t('https://auth.example.com/uma')}
                aria-label={t('UMA endpoint')}
              />
            </FormGroup>
            <FormGroup label={t('Credentials secret name')} isRequired fieldId="uma-creds-ref">
              <TextInput
                isRequired
                type="text"
                value={spec.uma?.credentialsRef?.name || ''}
                onChange={(_e, val) =>
                  onChange({
                    ...spec,
                    uma: { endpoint: spec.uma?.endpoint || '', credentialsRef: { name: val } },
                  })
                }
                placeholder={t('Secret name')}
                aria-label={t('Credentials secret')}
              />
            </FormGroup>
          </>
        );
    }
  };

  return (
    <div className="kuadrant-limit-entry">
      <FormGroup label={t('Name')} isRequired fieldId={`metadata-name-${name}`}>
        <TextInput
          isRequired
          type="text"
          value={name}
          onChange={(_e, val) => onNameChange(val)}
          aria-label={t('Metadata name')}
        />
      </FormGroup>
      <FormGroup label={t('Type')} isRequired fieldId={`metadata-type-${name}`}>
        <FormSelect
          value={activeType}
          onChange={(_e, val) => handleTypeChange(val as MetadataType)}
          aria-label={t('Metadata type')}
        >
          {METADATA_TYPES.map((mt) => (
            <FormSelectOption key={mt.value} value={mt.value} label={t(mt.label)} />
          ))}
        </FormSelect>
      </FormGroup>
      {renderTypeFields()}
      <EvaluatorCommonFields
        common={{
          cache: spec.cache,
          priority: spec.priority,
          when: spec.when,
          metrics: spec.metrics,
        }}
        onChange={(common) => onChange({ ...spec, ...common })}
      />
    </div>
  );
};

export default MetadataEntry;
