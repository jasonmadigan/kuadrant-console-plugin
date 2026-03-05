import { FormGroup, FormSelect, FormSelectOption, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { AuthorizationSpec, AuthorizationType } from './types';
import PatternExpressionsField from './PatternExpressionsField';
import OpaFields from './OpaFields';
import KubernetesSARFields from './KubernetesSARFields';
import SpiceDbFields from './SpiceDbFields';
import EvaluatorCommonFields from './EvaluatorCommonFields';
import { useTranslation } from 'react-i18next';

interface AuthorizationEntryProps {
  name: string;
  spec: AuthorizationSpec;
  onNameChange: (name: string) => void;
  onChange: (spec: AuthorizationSpec) => void;
}

const AUTHZ_TYPES: { value: AuthorizationType; label: string }[] = [
  { value: 'patternMatching', label: 'Pattern matching' },
  { value: 'opa', label: 'OPA (Open Policy Agent)' },
  { value: 'kubernetesSubjectAccessReview', label: 'Kubernetes SubjectAccessReview' },
  { value: 'spicedb', label: 'SpiceDB' },
];

function getActiveType(spec: AuthorizationSpec): AuthorizationType {
  if (spec.patternMatching) return 'patternMatching';
  if (spec.opa) return 'opa';
  if (spec.kubernetesSubjectAccessReview) return 'kubernetesSubjectAccessReview';
  if (spec.spicedb) return 'spicedb';
  return 'patternMatching';
}

function clearTypeFields(spec: AuthorizationSpec): AuthorizationSpec {
  const { patternMatching, opa, kubernetesSubjectAccessReview, spicedb, ...rest } = spec;
  void patternMatching;
  void opa;
  void kubernetesSubjectAccessReview;
  void spicedb;
  return rest;
}

const AuthorizationEntry: React.FC<AuthorizationEntryProps> = ({
  name,
  spec,
  onNameChange,
  onChange,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const activeType = getActiveType(spec);

  const handleTypeChange = (newType: AuthorizationType) => {
    const base = clearTypeFields(spec);
    switch (newType) {
      case 'patternMatching':
        onChange({
          ...base,
          patternMatching: { patterns: [{ selector: '', operator: 'eq', value: '' }] },
        });
        break;
      case 'opa':
        onChange({ ...base, opa: {} });
        break;
      case 'kubernetesSubjectAccessReview':
        onChange({ ...base, kubernetesSubjectAccessReview: {} });
        break;
      case 'spicedb':
        onChange({ ...base, spicedb: { endpoint: '' } });
        break;
    }
  };

  const renderTypeFields = () => {
    switch (activeType) {
      case 'patternMatching':
        return (
          <PatternExpressionsField
            label={t('Patterns')}
            expressions={spec.patternMatching?.patterns || []}
            onChange={(patterns) => onChange({ ...spec, patternMatching: { patterns } })}
          />
        );

      case 'opa':
        return <OpaFields opa={spec.opa || {}} onChange={(opa) => onChange({ ...spec, opa })} />;

      case 'kubernetesSubjectAccessReview':
        return (
          <KubernetesSARFields
            sar={spec.kubernetesSubjectAccessReview || {}}
            onChange={(sar) => onChange({ ...spec, kubernetesSubjectAccessReview: sar })}
          />
        );

      case 'spicedb':
        return (
          <SpiceDbFields
            spicedb={spec.spicedb || { endpoint: '' }}
            onChange={(spicedb) => onChange({ ...spec, spicedb })}
          />
        );
    }
  };

  return (
    <div className="kuadrant-limit-entry">
      <FormGroup label={t('Name')} isRequired fieldId={`authz-name-${name}`}>
        <TextInput
          isRequired
          type="text"
          value={name}
          onChange={(_e, val) => onNameChange(val)}
          aria-label={t('Authorization name')}
        />
      </FormGroup>
      <FormGroup label={t('Type')} isRequired fieldId={`authz-type-${name}`}>
        <FormSelect
          value={activeType}
          onChange={(_e, val) => handleTypeChange(val as AuthorizationType)}
          aria-label={t('Authorization type')}
        >
          {AUTHZ_TYPES.map((at) => (
            <FormSelectOption key={at.value} value={at.value} label={t(at.label)} />
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

export default AuthorizationEntry;
