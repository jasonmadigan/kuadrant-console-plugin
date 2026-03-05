import { FormGroup, FormSelect, FormSelectOption, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { SuccessResponseSpec, SelectorValue } from './types';
import SelectorValueField from './SelectorValueField';
import WristbandFields from './WristbandFields';
import EvaluatorCommonFields from './EvaluatorCommonFields';
import { useTranslation } from 'react-i18next';
import { Button } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

interface SuccessResponseEntryProps {
  name: string;
  spec: SuccessResponseSpec;
  onNameChange: (name: string) => void;
  onChange: (spec: SuccessResponseSpec) => void;
}

type ResponseType = 'json' | 'plain' | 'wristband';

function getActiveType(spec: SuccessResponseSpec): ResponseType {
  if (spec.wristband) return 'wristband';
  if (spec.plain) return 'plain';
  return 'json';
}

const SuccessResponseEntry: React.FC<SuccessResponseEntryProps> = ({
  name,
  spec,
  onNameChange,
  onChange,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const activeType = getActiveType(spec);

  const handleTypeChange = (newType: ResponseType) => {
    const base: SuccessResponseSpec = {
      key: spec.key,
      cache: spec.cache,
      priority: spec.priority,
      when: spec.when,
      metrics: spec.metrics,
    };
    switch (newType) {
      case 'json':
        onChange({ ...base, json: {} });
        break;
      case 'plain':
        onChange({ ...base, plain: {} });
        break;
      case 'wristband':
        onChange({
          ...base,
          wristband: { issuer: '', signingKeyRefs: [{ name: '', algorithm: '' }] },
        });
        break;
    }
  };

  const renderTypeFields = () => {
    switch (activeType) {
      case 'json': {
        const jsonMap = spec.json || {};
        const jsonEntries = Object.entries(jsonMap);
        return (
          <FormGroup label={t('JSON properties')} fieldId="success-json">
            {jsonEntries.map(([key, val]) => (
              <div key={key} className="kuadrant-field-row">
                <TextInput
                  type="text"
                  value={key}
                  onChange={(_e, newKey) => {
                    const updated: Record<string, SelectorValue> = {};
                    for (const [k, v] of Object.entries(jsonMap)) {
                      updated[k === key ? newKey : k] = v;
                    }
                    onChange({ ...spec, json: updated });
                  }}
                  placeholder={t('Property name')}
                  aria-label={t('Property name')}
                  style={{ maxWidth: '200px' }}
                />
                <SelectorValueField
                  value={val}
                  onChange={(newVal) => onChange({ ...spec, json: { ...jsonMap, [key]: newVal } })}
                />
                <Button
                  variant="plain"
                  aria-label={t('Remove')}
                  onClick={() => {
                    const updated = { ...jsonMap };
                    delete updated[key];
                    onChange({ ...spec, json: updated });
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
                let k = 'property';
                let i = 1;
                while (jsonMap[k]) {
                  k = `property-${i}`;
                  i++;
                }
                onChange({ ...spec, json: { ...jsonMap, [k]: {} } });
              }}
            >
              {t('Add property')}
            </Button>
          </FormGroup>
        );
      }

      case 'plain':
        return (
          <FormGroup label={t('Plain value')} fieldId="success-plain">
            <SelectorValueField
              value={spec.plain || {}}
              onChange={(plain) => onChange({ ...spec, plain })}
            />
          </FormGroup>
        );

      case 'wristband':
        return (
          <WristbandFields
            wristband={spec.wristband || { issuer: '', signingKeyRefs: [] }}
            onChange={(wristband) => onChange({ ...spec, wristband })}
          />
        );
    }
  };

  return (
    <div className="kuadrant-limit-entry">
      <FormGroup label={t('Name')} isRequired fieldId={`success-name-${name}`}>
        <TextInput
          isRequired
          type="text"
          value={name}
          onChange={(_e, val) => onNameChange(val)}
          aria-label={t('Response name')}
        />
      </FormGroup>
      <FormGroup label={t('Response type')} fieldId={`success-type-${name}`}>
        <FormSelect
          value={activeType}
          onChange={(_e, val) => handleTypeChange(val as ResponseType)}
          aria-label={t('Response type')}
        >
          <FormSelectOption value="json" label={t('JSON')} />
          <FormSelectOption value="plain" label={t('Plain')} />
          <FormSelectOption value="wristband" label={t('Wristband')} />
        </FormSelect>
      </FormGroup>
      <FormGroup label={t('Header/filter key')} fieldId={`success-key-${name}`}>
        <TextInput
          type="text"
          value={spec.key || ''}
          onChange={(_e, val) => onChange({ ...spec, key: val || undefined })}
          placeholder={t('Key')}
          aria-label={t('Key')}
        />
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

export default SuccessResponseEntry;
