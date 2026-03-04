import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Counter } from './types';
import { useTranslation } from 'react-i18next';

interface CountersFieldProps {
  counters: Counter[];
  onChange: (counters: Counter[]) => void;
}

const CountersField: React.FC<CountersFieldProps> = ({ counters, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  const handleChange = (index: number, value: string) => {
    const updated = [...counters];
    updated[index] = { expression: value };
    onChange(updated);
  };

  const add = () => {
    onChange([...counters, { expression: '' }]);
  };

  const remove = (index: number) => {
    onChange(counters.filter((_, i) => i !== index));
  };

  return (
    <FormGroup label={t('Counters')} fieldId="counters">
      {counters.map((counter, index) => (
        <div key={index} className="kuadrant-field-row">
          <TextInput
            type="text"
            value={counter.expression}
            onChange={(_event, val) => handleChange(index, val)}
            placeholder={t('CEL expression (e.g. auth.identity.username)')}
            aria-label={t('Counter expression')}
            className="kuadrant-field-row__input--wide"
          />
          <Button variant="plain" aria-label={t('Remove counter')} onClick={() => remove(index)}>
            <MinusCircleIcon />
          </Button>
        </div>
      ))}
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {t('Counters partition the rate limit by unique values of a CEL expression, e.g. each user gets their own limit.')}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
      <Button variant="link" icon={<PlusCircleIcon />} onClick={add}>
        {t('Add counter')}
      </Button>
    </FormGroup>
  );
};

export default CountersField;
