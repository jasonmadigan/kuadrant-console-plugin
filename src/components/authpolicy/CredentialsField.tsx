import { FormGroup, FormSelect, FormSelectOption, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { Credentials, CredentialsType } from './types';
import { useTranslation } from 'react-i18next';

interface CredentialsFieldProps {
  credentials?: Credentials;
  onChange: (credentials?: Credentials) => void;
}

function getType(creds?: Credentials): CredentialsType {
  if (!creds) return 'authorizationHeader';
  if ('authorizationHeader' in creds) return 'authorizationHeader';
  if ('cookie' in creds) return 'cookie';
  if ('customHeader' in creds) return 'customHeader';
  if ('queryString' in creds) return 'queryString';
  return 'authorizationHeader';
}

function getValue(creds?: Credentials): string {
  if (!creds) return '';
  if ('authorizationHeader' in creds) return creds.authorizationHeader.prefix;
  if ('cookie' in creds) return creds.cookie.name;
  if ('customHeader' in creds) return creds.customHeader.name;
  if ('queryString' in creds) return creds.queryString.name;
  return '';
}

function buildCredentials(type: CredentialsType, value: string): Credentials {
  switch (type) {
    case 'authorizationHeader':
      return { authorizationHeader: { prefix: value } };
    case 'cookie':
      return { cookie: { name: value } };
    case 'customHeader':
      return { customHeader: { name: value } };
    case 'queryString':
      return { queryString: { name: value } };
  }
}

const LABELS: Record<CredentialsType, string> = {
  authorizationHeader: 'Authorization header',
  cookie: 'Cookie',
  customHeader: 'Custom header',
  queryString: 'Query string',
};

const VALUE_LABELS: Record<CredentialsType, string> = {
  authorizationHeader: 'Prefix',
  cookie: 'Cookie name',
  customHeader: 'Header name',
  queryString: 'Parameter name',
};

const CredentialsField: React.FC<CredentialsFieldProps> = ({ credentials, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const type = getType(credentials);
  const value = getValue(credentials);

  return (
    <>
      <FormGroup label={t('Credentials source')} fieldId="credentials-type">
        <FormSelect
          value={type}
          onChange={(_e, val) => onChange(buildCredentials(val as CredentialsType, value))}
          aria-label={t('Credentials type')}
        >
          {(Object.keys(LABELS) as CredentialsType[]).map((k) => (
            <FormSelectOption key={k} value={k} label={t(LABELS[k])} />
          ))}
        </FormSelect>
      </FormGroup>
      <FormGroup label={t(VALUE_LABELS[type])} fieldId="credentials-value">
        <TextInput
          type="text"
          value={value}
          onChange={(_e, val) => onChange(buildCredentials(type, val))}
          placeholder={t(VALUE_LABELS[type])}
          aria-label={t(VALUE_LABELS[type])}
        />
      </FormGroup>
    </>
  );
};

export default CredentialsField;
