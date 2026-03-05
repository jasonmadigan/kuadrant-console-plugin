import { FormGroup, FormSelect, FormSelectOption, TextInput, Button } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { HttpRequestConfig, SelectorValue } from './types';
import SelectorValueField from './SelectorValueField';
import CredentialsField from './CredentialsField';
import { useTranslation } from 'react-i18next';

interface HttpRequestFieldProps {
  config: HttpRequestConfig;
  onChange: (config: HttpRequestConfig) => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

const HttpRequestField: React.FC<HttpRequestFieldProps> = ({ config, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const headers = config.headers || {};
  const headerEntries = Object.entries(headers);

  const addHeader = () => {
    let name = 'header';
    let i = 1;
    while (headers[name]) {
      name = `header-${i}`;
      i++;
    }
    onChange({ ...config, headers: { ...headers, [name]: {} } });
  };

  const removeHeader = (key: string) => {
    const updated = { ...headers };
    delete updated[key];
    onChange({ ...config, headers: Object.keys(updated).length > 0 ? updated : undefined });
  };

  const updateHeaderKey = (oldKey: string, newKey: string) => {
    const updated: Record<string, SelectorValue> = {};
    for (const [k, v] of Object.entries(headers)) {
      updated[k === oldKey ? newKey : k] = v;
    }
    onChange({ ...config, headers: updated });
  };

  const updateHeaderValue = (key: string, val: SelectorValue) => {
    onChange({ ...config, headers: { ...headers, [key]: val } });
  };

  return (
    <>
      <FormGroup label={t('URL')} isRequired fieldId="http-url">
        <TextInput
          isRequired
          type="text"
          value={config.url}
          onChange={(_e, val) => onChange({ ...config, url: val })}
          placeholder={t('https://example.com/endpoint')}
          aria-label={t('URL')}
        />
      </FormGroup>
      <FormGroup label={t('Method')} fieldId="http-method">
        <FormSelect
          value={config.method || 'GET'}
          onChange={(_e, val) =>
            onChange({ ...config, method: val as HttpRequestConfig['method'] })
          }
          aria-label={t('HTTP method')}
        >
          {METHODS.map((m) => (
            <FormSelectOption key={m} value={m} label={m} />
          ))}
        </FormSelect>
      </FormGroup>
      <FormGroup label={t('Body')} fieldId="http-body">
        <SelectorValueField
          value={config.body || {}}
          onChange={(body) =>
            onChange({ ...config, body: body.selector || body.value ? body : undefined })
          }
        />
      </FormGroup>
      <FormGroup label={t('Content type')} fieldId="http-content-type">
        <TextInput
          type="text"
          value={config.contentType || ''}
          onChange={(_e, val) => onChange({ ...config, contentType: val || undefined })}
          placeholder={t('application/json')}
          aria-label={t('Content type')}
        />
      </FormGroup>
      <FormGroup label={t('Headers')} fieldId="http-headers">
        {headerEntries.map(([key, val]) => (
          <div key={key} className="kuadrant-field-row">
            <TextInput
              type="text"
              value={key}
              onChange={(_e, newKey) => updateHeaderKey(key, newKey)}
              placeholder={t('Header name')}
              aria-label={t('Header name')}
              style={{ maxWidth: '200px' }}
            />
            <SelectorValueField value={val} onChange={(newVal) => updateHeaderValue(key, newVal)} />
            <Button variant="plain" aria-label={t('Remove')} onClick={() => removeHeader(key)}>
              <MinusCircleIcon />
            </Button>
          </div>
        ))}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={addHeader}>
          {t('Add header')}
        </Button>
      </FormGroup>
      <CredentialsField
        credentials={config.credentials}
        onChange={(credentials) => onChange({ ...config, credentials })}
      />
    </>
  );
};

export default HttpRequestField;
