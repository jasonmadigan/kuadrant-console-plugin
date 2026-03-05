import { Button, Title } from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { AuthorizationSpec } from './types';
import AuthorizationEntry from './AuthorizationEntry';
import { useTranslation } from 'react-i18next';

interface AuthorizationSectionProps {
  authorization: Record<string, AuthorizationSpec>;
  onChange: (authorization: Record<string, AuthorizationSpec>) => void;
}

const AuthorizationSection: React.FC<AuthorizationSectionProps> = ({ authorization, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const entries = Object.entries(authorization);

  const handleNameChange = (oldName: string, newName: string) => {
    const updated: Record<string, AuthorizationSpec> = {};
    for (const [key, val] of Object.entries(authorization)) {
      updated[key === oldName ? newName : key] = val;
    }
    onChange(updated);
  };

  const add = () => {
    let name = 'authz';
    let i = 1;
    while (authorization[name]) {
      name = `authz-${i}`;
      i++;
    }
    onChange({
      ...authorization,
      [name]: { patternMatching: { patterns: [{ selector: '', operator: 'eq', value: '' }] } },
    });
  };

  const remove = (name: string) => {
    const updated = { ...authorization };
    delete updated[name];
    onChange(updated);
  };

  return (
    <div>
      <Title headingLevel="h3" size="md">
        {t('Authorization')}
      </Title>
      {entries.map(([name, spec]) => (
        <div key={name} className="kuadrant-limits-section__entry">
          <AuthorizationEntry
            name={name}
            spec={spec}
            onNameChange={(newName) => handleNameChange(name, newName)}
            onChange={(newSpec) => onChange({ ...authorization, [name]: newSpec })}
          />
          <Button variant="link" isDanger icon={<MinusCircleIcon />} onClick={() => remove(name)}>
            {t('Remove authorization')}
          </Button>
        </div>
      ))}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={add}>
        {t('Add authorization')}
      </Button>
    </div>
  );
};

export default AuthorizationSection;
