import { FormGroup, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { CacheConfig } from './types';
import SelectorValueField from './SelectorValueField';
import { useTranslation } from 'react-i18next';

interface CacheFieldProps {
  cache?: CacheConfig;
  onChange: (cache?: CacheConfig) => void;
}

const CacheField: React.FC<CacheFieldProps> = ({ cache, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const current = cache || { key: {}, ttl: 0 };

  return (
    <>
      <FormGroup label={t('Cache key')} fieldId="cache-key">
        <SelectorValueField
          value={current.key || {}}
          onChange={(key) => onChange({ ...current, key })}
          selectorPlaceholder={t('Key selector')}
          valuePlaceholder={t('Key value')}
        />
      </FormGroup>
      <FormGroup label={t('Cache TTL (seconds)')} fieldId="cache-ttl">
        <TextInput
          type="number"
          value={current.ttl || ''}
          onChange={(_e, val) => onChange({ ...current, ttl: parseInt(val, 10) || 0 })}
          placeholder={t('TTL in seconds')}
          aria-label={t('Cache TTL')}
        />
      </FormGroup>
    </>
  );
};

export default CacheField;
