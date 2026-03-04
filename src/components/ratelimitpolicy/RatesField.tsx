import {
  Button,
  FormGroup,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Rate } from './types';
import { useTranslation } from 'react-i18next';

interface RatesFieldProps {
  rates: Rate[];
  onChange: (rates: Rate[]) => void;
  tokenMode?: boolean;
}

const RatesField: React.FC<RatesFieldProps> = ({ rates, onChange, tokenMode }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  const handleRateChange = (index: number, field: keyof Rate, value: string | number) => {
    const updated = [...rates];
    if (field === 'limit') {
      updated[index] = { ...updated[index], limit: Number(value) || 0 };
    } else {
      updated[index] = { ...updated[index], window: value as string };
    }
    onChange(updated);
  };

  const addRate = () => {
    onChange([...rates, { limit: 0, window: '' }]);
  };

  const removeRate = (index: number) => {
    onChange(rates.filter((_, i) => i !== index));
  };

  return (
    <FormGroup label={t('Rates')} isRequired fieldId="rates">
      {rates.map((rate, index) => (
        <div key={index} className="kuadrant-field-row">
          <TextInput
            type="number"
            value={rate.limit || ''}
            onChange={(_event, val) => handleRateChange(index, 'limit', val)}
            placeholder={tokenMode ? t('Max tokens') : t('Max requests')}
            aria-label={tokenMode ? t('Max tokens') : t('Max requests')}
            className="kuadrant-field-row__input"
          />
          <TextInput
            type="text"
            value={rate.window}
            onChange={(_event, val) => handleRateChange(index, 'window', val)}
            placeholder={t('Time window')}
            aria-label={t('Time window')}
            className="kuadrant-field-row__input"
          />
          <Button variant="plain" aria-label={t('Remove rate')} onClick={() => removeRate(index)}>
            <MinusCircleIcon />
          </Button>
        </div>
      ))}
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {tokenMode
              ? t('Max tokens allowed per time window. Window examples: 1s, 5m, 1h30m')
              : t('Max requests allowed per time window. Window examples: 1s, 5m, 1h30m')}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
      <Button variant="link" icon={<PlusCircleIcon />} onClick={addRate}>
        {t('Add rate')}
      </Button>
    </FormGroup>
  );
};

export default RatesField;
