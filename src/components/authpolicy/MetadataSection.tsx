import { Button, Title } from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { MetadataSpec } from './types';
import MetadataEntry from './MetadataEntry';
import { useTranslation } from 'react-i18next';

interface MetadataSectionProps {
  metadata: Record<string, MetadataSpec>;
  onChange: (metadata: Record<string, MetadataSpec>) => void;
}

const MetadataSection: React.FC<MetadataSectionProps> = ({ metadata, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const entries = Object.entries(metadata);

  const handleNameChange = (oldName: string, newName: string) => {
    const updated: Record<string, MetadataSpec> = {};
    for (const [key, val] of Object.entries(metadata)) {
      updated[key === oldName ? newName : key] = val;
    }
    onChange(updated);
  };

  const add = () => {
    let name = 'metadata';
    let i = 1;
    while (metadata[name]) {
      name = `metadata-${i}`;
      i++;
    }
    onChange({ ...metadata, [name]: { http: { url: '' } } });
  };

  const remove = (name: string) => {
    const updated = { ...metadata };
    delete updated[name];
    onChange(updated);
  };

  return (
    <div>
      <Title headingLevel="h3" size="md">
        {t('Metadata')}
      </Title>
      {entries.map(([name, spec]) => (
        <div key={name} className="kuadrant-limits-section__entry">
          <MetadataEntry
            name={name}
            spec={spec}
            onNameChange={(newName) => handleNameChange(name, newName)}
            onChange={(newSpec) => onChange({ ...metadata, [name]: newSpec })}
          />
          <Button variant="link" isDanger icon={<MinusCircleIcon />} onClick={() => remove(name)}>
            {t('Remove metadata')}
          </Button>
        </div>
      ))}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={add}>
        {t('Add metadata')}
      </Button>
    </div>
  );
};

export default MetadataSection;
