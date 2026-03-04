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
import { Predicate } from './types';
import { useTranslation } from 'react-i18next';

interface WhenFieldProps {
  label?: string;
  predicates: Predicate[];
  onChange: (predicates: Predicate[]) => void;
}

const WhenField: React.FC<WhenFieldProps> = ({ label, predicates, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  const handleChange = (index: number, value: string) => {
    const updated = [...predicates];
    updated[index] = { predicate: value };
    onChange(updated);
  };

  const add = () => {
    onChange([...predicates, { predicate: '' }]);
  };

  const remove = (index: number) => {
    onChange(predicates.filter((_, i) => i !== index));
  };

  return (
    <FormGroup label={label || t('When')} fieldId="when-predicates">
      {predicates.map((pred, index) => (
        <div key={index} className="kuadrant-field-row">
          <TextInput
            type="text"
            value={pred.predicate}
            onChange={(_event, val) => handleChange(index, val)}
            placeholder={t('e.g. request.host == "api.example.com"')}
            aria-label={t('When predicate')}
            className="kuadrant-field-row__input--wide"
          />
          <Button variant="plain" aria-label={t('Remove predicate')} onClick={() => remove(index)}>
            <MinusCircleIcon />
          </Button>
        </div>
      ))}
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {t('CEL expressions that must all be true for this limit to apply.')}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
      <Button variant="link" icon={<PlusCircleIcon />} onClick={add}>
        {t('Add condition')}
      </Button>
    </FormGroup>
  );
};

export default WhenField;
