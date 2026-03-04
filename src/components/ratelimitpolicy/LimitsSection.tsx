import { Button, Title } from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { LimitConfig } from './types';
import LimitEntry from './LimitEntry';
import { useTranslation } from 'react-i18next';

interface LimitsSectionProps {
  limits: Record<string, LimitConfig>;
  onChange: (limits: Record<string, LimitConfig>) => void;
  tokenMode?: boolean;
}

const LimitsSection: React.FC<LimitsSectionProps> = ({ limits, onChange, tokenMode }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const entries = Object.entries(limits);

  const handleNameChange = (oldName: string, newName: string) => {
    const updated: Record<string, LimitConfig> = {};
    for (const [key, val] of Object.entries(limits)) {
      updated[key === oldName ? newName : key] = val;
    }
    onChange(updated);
  };

  const handleConfigChange = (name: string, config: LimitConfig) => {
    onChange({ ...limits, [name]: config });
  };

  const addLimit = () => {
    let name = 'limit';
    let i = 1;
    while (limits[name]) {
      name = `limit-${i}`;
      i++;
    }
    onChange({ ...limits, [name]: { rates: [{ limit: 0, window: '' }] } });
  };

  const removeLimit = (name: string) => {
    const updated = { ...limits };
    delete updated[name];
    onChange(updated);
  };

  return (
    <div className="kuadrant-limits-section">
      <Title headingLevel="h3" size="md">
        {t('Limits')}
      </Title>
      {entries.map(([name, config]) => (
        <div key={name} className="kuadrant-limits-section__entry">
          <LimitEntry
            name={name}
            config={config}
            onNameChange={(newName) => handleNameChange(name, newName)}
            onConfigChange={(newConfig) => handleConfigChange(name, newConfig)}
            tokenMode={tokenMode}
          />
          <Button
            variant="link"
            isDanger
            icon={<MinusCircleIcon />}
            onClick={() => removeLimit(name)}
          >
            {t('Remove limit')}
          </Button>
        </div>
      ))}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={addLimit}>
        {t('Add limit')}
      </Button>
    </div>
  );
};

export default LimitsSection;
