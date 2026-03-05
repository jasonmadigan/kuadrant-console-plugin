import { FormGroup, TextInput, Button } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { DenyWithSpec, SelectorValue } from './types';
import SelectorValueField from './SelectorValueField';
import { useTranslation } from 'react-i18next';

interface DenyWithFieldsProps {
  deny?: DenyWithSpec;
  onChange: (deny?: DenyWithSpec) => void;
}

const DenyWithFields: React.FC<DenyWithFieldsProps> = ({ deny, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const current = deny || {};
  const headers = current.headers || {};
  const headerEntries = Object.entries(headers);

  const addHeader = () => {
    let name = 'header';
    let i = 1;
    while (headers[name]) {
      name = `header-${i}`;
      i++;
    }
    onChange({ ...current, headers: { ...headers, [name]: {} } });
  };

  const removeHeader = (key: string) => {
    const updated = { ...headers };
    delete updated[key];
    onChange({ ...current, headers: Object.keys(updated).length > 0 ? updated : undefined });
  };

  const updateHeaderKey = (oldKey: string, newKey: string) => {
    const updated: Record<string, SelectorValue> = {};
    for (const [k, v] of Object.entries(headers)) {
      updated[k === oldKey ? newKey : k] = v;
    }
    onChange({ ...current, headers: updated });
  };

  return (
    <>
      <FormGroup label={t('Body')} fieldId="deny-body">
        <SelectorValueField
          value={current.body || {}}
          onChange={(body) =>
            onChange({ ...current, body: body.selector || body.value ? body : undefined })
          }
        />
      </FormGroup>
      <FormGroup label={t('Status code (300-599)')} fieldId="deny-code">
        <TextInput
          type="number"
          value={current.code ?? ''}
          onChange={(_e, val) =>
            onChange({ ...current, code: val ? parseInt(val, 10) : undefined })
          }
          placeholder={t('403')}
          aria-label={t('Status code')}
          min={300}
          max={599}
        />
      </FormGroup>
      <FormGroup label={t('Headers')} fieldId="deny-headers">
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
            <SelectorValueField
              value={val}
              onChange={(newVal) =>
                onChange({ ...current, headers: { ...headers, [key]: newVal } })
              }
            />
            <Button variant="plain" aria-label={t('Remove')} onClick={() => removeHeader(key)}>
              <MinusCircleIcon />
            </Button>
          </div>
        ))}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={addHeader}>
          {t('Add header')}
        </Button>
      </FormGroup>
    </>
  );
};

export default DenyWithFields;
