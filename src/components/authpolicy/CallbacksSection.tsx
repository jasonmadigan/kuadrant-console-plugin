import { Button, FormGroup, TextInput, Title } from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { CallbackSpec } from './types';
import HttpRequestField from './HttpRequestField';
import EvaluatorCommonFields from './EvaluatorCommonFields';
import { useTranslation } from 'react-i18next';

interface CallbacksSectionProps {
  callbacks: Record<string, CallbackSpec>;
  onChange: (callbacks: Record<string, CallbackSpec>) => void;
}

const CallbacksSection: React.FC<CallbacksSectionProps> = ({ callbacks, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const entries = Object.entries(callbacks);

  const handleNameChange = (oldName: string, newName: string) => {
    const updated: Record<string, CallbackSpec> = {};
    for (const [key, val] of Object.entries(callbacks)) {
      updated[key === oldName ? newName : key] = val;
    }
    onChange(updated);
  };

  const add = () => {
    let name = 'callback';
    let i = 1;
    while (callbacks[name]) {
      name = `callback-${i}`;
      i++;
    }
    onChange({ ...callbacks, [name]: { http: { url: '' } } });
  };

  const remove = (name: string) => {
    const updated = { ...callbacks };
    delete updated[name];
    onChange(updated);
  };

  return (
    <div>
      <Title headingLevel="h3" size="md">
        {t('Callbacks')}
      </Title>
      {entries.map(([name, spec]) => (
        <div key={name} className="kuadrant-limit-entry">
          <FormGroup label={t('Name')} isRequired fieldId={`callback-name-${name}`}>
            <TextInput
              isRequired
              type="text"
              value={name}
              onChange={(_e, val) => handleNameChange(name, val)}
              aria-label={t('Callback name')}
            />
          </FormGroup>
          <HttpRequestField
            config={spec.http}
            onChange={(http) => onChange({ ...callbacks, [name]: { ...spec, http } })}
          />
          <EvaluatorCommonFields
            common={{
              cache: spec.cache,
              priority: spec.priority,
              when: spec.when,
              metrics: spec.metrics,
            }}
            onChange={(common) => onChange({ ...callbacks, [name]: { ...spec, ...common } })}
          />
          <Button variant="link" isDanger icon={<MinusCircleIcon />} onClick={() => remove(name)}>
            {t('Remove callback')}
          </Button>
        </div>
      ))}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={add}>
        {t('Add callback')}
      </Button>
    </div>
  );
};

export default CallbacksSection;
