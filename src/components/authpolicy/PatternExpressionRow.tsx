import { TextInput, FormSelect, FormSelectOption } from '@patternfly/react-core';
import * as React from 'react';
import { PatternExpression, PatternOperator } from './types';
import { useTranslation } from 'react-i18next';

interface PatternExpressionRowProps {
  expression: PatternExpression;
  onChange: (expression: PatternExpression) => void;
}

const OPERATORS: PatternOperator[] = ['eq', 'neq', 'incl', 'excl', 'matches'];

const PatternExpressionRow: React.FC<PatternExpressionRowProps> = ({ expression, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  return (
    <div className="kuadrant-field-row">
      <TextInput
        type="text"
        value={expression.selector}
        onChange={(_e, val) => onChange({ ...expression, selector: val })}
        placeholder={t('Selector')}
        aria-label={t('Selector')}
        className="kuadrant-field-row__input"
      />
      <FormSelect
        value={expression.operator}
        onChange={(_e, val) => onChange({ ...expression, operator: val as PatternOperator })}
        aria-label={t('Operator')}
        style={{ maxWidth: '120px' }}
      >
        {OPERATORS.map((op) => (
          <FormSelectOption key={op} value={op} label={op} />
        ))}
      </FormSelect>
      <TextInput
        type="text"
        value={expression.value}
        onChange={(_e, val) => onChange({ ...expression, value: val })}
        placeholder={t('Value')}
        aria-label={t('Value')}
        className="kuadrant-field-row__input"
      />
    </div>
  );
};

export default PatternExpressionRow;
