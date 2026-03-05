import { Button, Title } from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { AuthenticationSpec } from './types';
import AuthenticationEntry from './AuthenticationEntry';
import { useTranslation } from 'react-i18next';

interface AuthenticationSectionProps {
  authentication: Record<string, AuthenticationSpec>;
  onChange: (authentication: Record<string, AuthenticationSpec>) => void;
}

const AuthenticationSection: React.FC<AuthenticationSectionProps> = ({
  authentication,
  onChange,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const entries = Object.entries(authentication);

  const handleNameChange = (oldName: string, newName: string) => {
    const updated: Record<string, AuthenticationSpec> = {};
    for (const [key, val] of Object.entries(authentication)) {
      updated[key === oldName ? newName : key] = val;
    }
    onChange(updated);
  };

  const add = () => {
    let name = 'auth';
    let i = 1;
    while (authentication[name]) {
      name = `auth-${i}`;
      i++;
    }
    onChange({ ...authentication, [name]: { anonymous: {} } });
  };

  const remove = (name: string) => {
    const updated = { ...authentication };
    delete updated[name];
    onChange(updated);
  };

  return (
    <div>
      <Title headingLevel="h3" size="md">
        {t('Authentication')}
      </Title>
      {entries.map(([name, spec]) => (
        <div key={name} className="kuadrant-limits-section__entry">
          <AuthenticationEntry
            name={name}
            spec={spec}
            onNameChange={(newName) => handleNameChange(name, newName)}
            onChange={(newSpec) => onChange({ ...authentication, [name]: newSpec })}
          />
          <Button variant="link" isDanger icon={<MinusCircleIcon />} onClick={() => remove(name)}>
            {t('Remove authentication')}
          </Button>
        </div>
      ))}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={add}>
        {t('Add authentication')}
      </Button>
    </div>
  );
};

export default AuthenticationSection;
