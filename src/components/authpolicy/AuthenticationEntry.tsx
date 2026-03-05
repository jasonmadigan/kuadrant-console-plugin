import {
  FormGroup,
  FormSelect,
  FormSelectOption,
  TextInput,
  Switch,
  Button,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { AuthenticationSpec, AuthenticationType } from './types';
import CredentialsField from './CredentialsField';
import EvaluatorCommonFields from './EvaluatorCommonFields';
import { useTranslation } from 'react-i18next';

interface AuthenticationEntryProps {
  name: string;
  spec: AuthenticationSpec;
  onNameChange: (name: string) => void;
  onChange: (spec: AuthenticationSpec) => void;
}

const AUTH_TYPES: { value: AuthenticationType; label: string }[] = [
  { value: 'apiKey', label: 'API key' },
  { value: 'jwt', label: 'JWT' },
  { value: 'oauth2Introspection', label: 'OAuth2 introspection' },
  { value: 'kubernetesTokenReview', label: 'Kubernetes token review' },
  { value: 'x509', label: 'X.509 client certificate' },
  { value: 'plain', label: 'Plain (identity extraction)' },
  { value: 'anonymous', label: 'Anonymous' },
];

function getActiveType(spec: AuthenticationSpec): AuthenticationType {
  if (spec.apiKey) return 'apiKey';
  if (spec.jwt) return 'jwt';
  if (spec.oauth2Introspection) return 'oauth2Introspection';
  if (spec.kubernetesTokenReview) return 'kubernetesTokenReview';
  if (spec.x509) return 'x509';
  if (spec.plain) return 'plain';
  if (spec.anonymous) return 'anonymous';
  return 'anonymous';
}

// strip all type-specific fields from spec
function clearTypeFields(spec: AuthenticationSpec): AuthenticationSpec {
  const {
    apiKey,
    jwt,
    oauth2Introspection,
    kubernetesTokenReview,
    x509,
    plain,
    anonymous,
    ...rest
  } = spec;
  void apiKey;
  void jwt;
  void oauth2Introspection;
  void kubernetesTokenReview;
  void x509;
  void plain;
  void anonymous;
  return rest;
}

const AuthenticationEntry: React.FC<AuthenticationEntryProps> = ({
  name,
  spec,
  onNameChange,
  onChange,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const activeType = getActiveType(spec);

  const handleTypeChange = (newType: AuthenticationType) => {
    const base = clearTypeFields(spec);
    switch (newType) {
      case 'apiKey':
        onChange({ ...base, apiKey: { selector: { matchLabels: {} } } });
        break;
      case 'jwt':
        onChange({ ...base, jwt: { issuerUrl: '' } });
        break;
      case 'oauth2Introspection':
        onChange({ ...base, oauth2Introspection: { endpoint: '', credentialsRef: { name: '' } } });
        break;
      case 'kubernetesTokenReview':
        onChange({ ...base, kubernetesTokenReview: { audiences: [''] } });
        break;
      case 'x509':
        onChange({ ...base, x509: { selector: { matchLabels: {} } } });
        break;
      case 'plain':
        onChange({ ...base, plain: { selector: '' } });
        break;
      case 'anonymous':
        onChange({ ...base, anonymous: {} });
        break;
    }
  };

  // match labels helpers
  const renderMatchLabels = (
    labels: Record<string, string>,
    setLabels: (labels: Record<string, string>) => void,
    allNamespaces: boolean | undefined,
    setAllNamespaces: (val: boolean) => void,
  ) => {
    const entries = Object.entries(labels);
    return (
      <>
        <FormGroup label={t('Match labels')} fieldId="match-labels">
          {entries.map(([key, val]) => (
            <div key={key} className="kuadrant-field-row">
              <TextInput
                type="text"
                value={key}
                onChange={(_e, newKey) => {
                  const updated: Record<string, string> = {};
                  for (const [k, v] of Object.entries(labels)) {
                    updated[k === key ? newKey : k] = v;
                  }
                  setLabels(updated);
                }}
                placeholder={t('Label key')}
                aria-label={t('Label key')}
                className="kuadrant-field-row__input"
              />
              <TextInput
                type="text"
                value={val}
                onChange={(_e, newVal) => setLabels({ ...labels, [key]: newVal })}
                placeholder={t('Label value')}
                aria-label={t('Label value')}
                className="kuadrant-field-row__input"
              />
              <Button
                variant="plain"
                aria-label={t('Remove')}
                onClick={() => {
                  const updated = { ...labels };
                  delete updated[key];
                  setLabels(updated);
                }}
              >
                <MinusCircleIcon />
              </Button>
            </div>
          ))}
          <Button
            variant="link"
            icon={<PlusCircleIcon />}
            onClick={() => {
              let k = 'key';
              let i = 1;
              while (labels[k]) {
                k = `key-${i}`;
                i++;
              }
              setLabels({ ...labels, [k]: '' });
            }}
          >
            {t('Add label')}
          </Button>
        </FormGroup>
        <FormGroup label={t('All namespaces')} fieldId="all-namespaces">
          <Switch
            id={`all-ns-${name}`}
            isChecked={allNamespaces || false}
            onChange={(_e, val) => setAllNamespaces(val)}
            label={t('All namespaces')}
          />
        </FormGroup>
      </>
    );
  };

  const renderTypeFields = () => {
    switch (activeType) {
      case 'apiKey':
        return renderMatchLabels(
          spec.apiKey?.selector?.matchLabels || {},
          (labels) =>
            onChange({ ...spec, apiKey: { ...spec.apiKey, selector: { matchLabels: labels } } }),
          spec.apiKey?.allNamespaces,
          (val) =>
            onChange({
              ...spec,
              apiKey: {
                ...spec.apiKey,
                selector: spec.apiKey?.selector || { matchLabels: {} },
                allNamespaces: val || undefined,
              },
            }),
        );

      case 'jwt':
        return (
          <>
            <FormGroup label={t('Issuer URL')} isRequired fieldId="jwt-issuer">
              <TextInput
                isRequired
                type="text"
                value={spec.jwt?.issuerUrl || ''}
                onChange={(_e, val) => onChange({ ...spec, jwt: { ...spec.jwt, issuerUrl: val } })}
                placeholder={t('https://issuer.example.com')}
                aria-label={t('Issuer URL')}
              />
            </FormGroup>
            <FormGroup label={t('TTL (seconds)')} fieldId="jwt-ttl">
              <TextInput
                type="number"
                value={spec.jwt?.ttl ?? ''}
                onChange={(_e, val) =>
                  onChange({
                    ...spec,
                    jwt: {
                      ...spec.jwt,
                      issuerUrl: spec.jwt?.issuerUrl || '',
                      ttl: val ? parseInt(val, 10) : undefined,
                    },
                  })
                }
                placeholder={t('TTL')}
                aria-label={t('TTL')}
              />
            </FormGroup>
          </>
        );

      case 'oauth2Introspection':
        return (
          <>
            <FormGroup label={t('Endpoint')} isRequired fieldId="oauth2-endpoint">
              <TextInput
                isRequired
                type="text"
                value={spec.oauth2Introspection?.endpoint || ''}
                onChange={(_e, val) =>
                  onChange({
                    ...spec,
                    oauth2Introspection: {
                      ...spec.oauth2Introspection,
                      endpoint: val,
                      credentialsRef: spec.oauth2Introspection?.credentialsRef || { name: '' },
                    },
                  })
                }
                placeholder={t('https://auth.example.com/introspect')}
                aria-label={t('Endpoint')}
              />
            </FormGroup>
            <FormGroup label={t('Credentials secret name')} isRequired fieldId="oauth2-creds-ref">
              <TextInput
                isRequired
                type="text"
                value={spec.oauth2Introspection?.credentialsRef?.name || ''}
                onChange={(_e, val) =>
                  onChange({
                    ...spec,
                    oauth2Introspection: {
                      ...spec.oauth2Introspection,
                      endpoint: spec.oauth2Introspection?.endpoint || '',
                      credentialsRef: { name: val },
                    },
                  })
                }
                placeholder={t('Secret name')}
                aria-label={t('Credentials secret')}
              />
            </FormGroup>
            <FormGroup label={t('Token type hint')} fieldId="oauth2-hint">
              <TextInput
                type="text"
                value={spec.oauth2Introspection?.tokenTypeHint || ''}
                onChange={(_e, val) =>
                  onChange({
                    ...spec,
                    oauth2Introspection: {
                      ...spec.oauth2Introspection,
                      endpoint: spec.oauth2Introspection?.endpoint || '',
                      credentialsRef: spec.oauth2Introspection?.credentialsRef || { name: '' },
                      tokenTypeHint: val || undefined,
                    },
                  })
                }
                placeholder={t('access_token')}
                aria-label={t('Token type hint')}
              />
            </FormGroup>
          </>
        );

      case 'kubernetesTokenReview': {
        const audiences = spec.kubernetesTokenReview?.audiences || [''];
        return (
          <FormGroup label={t('Audiences')} fieldId="k8s-audiences">
            {audiences.map((aud, i) => (
              <div key={i} className="kuadrant-field-row">
                <TextInput
                  type="text"
                  value={aud}
                  onChange={(_e, val) => {
                    const updated = [...audiences];
                    updated[i] = val;
                    onChange({ ...spec, kubernetesTokenReview: { audiences: updated } });
                  }}
                  placeholder={t('Audience')}
                  aria-label={t('Audience')}
                  className="kuadrant-field-row__input--wide"
                />
                <Button
                  variant="plain"
                  aria-label={t('Remove')}
                  onClick={() => {
                    const updated = audiences.filter((_, j) => j !== i);
                    onChange({
                      ...spec,
                      kubernetesTokenReview: { audiences: updated.length > 0 ? updated : [''] },
                    });
                  }}
                >
                  <MinusCircleIcon />
                </Button>
              </div>
            ))}
            <Button
              variant="link"
              icon={<PlusCircleIcon />}
              onClick={() =>
                onChange({ ...spec, kubernetesTokenReview: { audiences: [...audiences, ''] } })
              }
            >
              {t('Add audience')}
            </Button>
          </FormGroup>
        );
      }

      case 'x509':
        return renderMatchLabels(
          spec.x509?.selector?.matchLabels || {},
          (labels) =>
            onChange({ ...spec, x509: { ...spec.x509, selector: { matchLabels: labels } } }),
          spec.x509?.allNamespaces,
          (val) =>
            onChange({
              ...spec,
              x509: {
                ...spec.x509,
                selector: spec.x509?.selector || { matchLabels: {} },
                allNamespaces: val || undefined,
              },
            }),
        );

      case 'plain':
        return (
          <FormGroup label={t('Selector')} isRequired fieldId="plain-selector">
            <TextInput
              isRequired
              type="text"
              value={spec.plain?.selector || ''}
              onChange={(_e, val) => onChange({ ...spec, plain: { selector: val } })}
              placeholder={t('auth.identity.sub')}
              aria-label={t('Selector')}
            />
          </FormGroup>
        );

      case 'anonymous':
        return null;
    }
  };

  return (
    <div className="kuadrant-limit-entry">
      <FormGroup label={t('Name')} isRequired fieldId={`auth-name-${name}`}>
        <TextInput
          isRequired
          type="text"
          value={name}
          onChange={(_e, val) => onNameChange(val)}
          aria-label={t('Authentication name')}
        />
      </FormGroup>
      <FormGroup label={t('Type')} isRequired fieldId={`auth-type-${name}`}>
        <FormSelect
          value={activeType}
          onChange={(_e, val) => handleTypeChange(val as AuthenticationType)}
          aria-label={t('Authentication type')}
        >
          {AUTH_TYPES.map((at) => (
            <FormSelectOption key={at.value} value={at.value} label={t(at.label)} />
          ))}
        </FormSelect>
      </FormGroup>
      {renderTypeFields()}
      <CredentialsField
        credentials={spec.credentials}
        onChange={(credentials) => onChange({ ...spec, credentials })}
      />
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

export default AuthenticationEntry;
