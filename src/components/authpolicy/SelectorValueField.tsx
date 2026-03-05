import { TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { SelectorValue } from './types';
import { useTranslation } from 'react-i18next';

interface SelectorValueFieldProps {
  value: SelectorValue;
  onChange: (value: SelectorValue) => void;
  selectorPlaceholder?: string;
  valuePlaceholder?: string;
  isDisabled?: boolean;
}

const SelectorValueField: React.FC<SelectorValueFieldProps> = ({
  value,
  onChange,
  selectorPlaceholder,
  valuePlaceholder,
  isDisabled,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  return (
    <div className="kuadrant-field-row">
      <TextInput
        type="text"
        value={value.selector || ''}
        onChange={(_e, val) => onChange({ ...value, selector: val || undefined })}
        placeholder={selectorPlaceholder || t('Selector')}
        aria-label={t('Selector')}
        className="kuadrant-field-row__input"
        isDisabled={isDisabled}
      />
      <TextInput
        type="text"
        value={value.value || ''}
        onChange={(_e, val) => onChange({ ...value, value: val || undefined })}
        placeholder={valuePlaceholder || t('Value')}
        aria-label={t('Value')}
        className="kuadrant-field-row__input"
        isDisabled={isDisabled}
      />
    </div>
  );
};

export default SelectorValueField;
