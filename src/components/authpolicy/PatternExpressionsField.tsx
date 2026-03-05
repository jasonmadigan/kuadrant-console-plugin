import { Button, FormGroup } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { PatternExpression } from './types';
import PatternExpressionRow from './PatternExpressionRow';
import { useTranslation } from 'react-i18next';

interface PatternExpressionsFieldProps {
  label?: string;
  expressions: PatternExpression[];
  onChange: (expressions: PatternExpression[]) => void;
}

const PatternExpressionsField: React.FC<PatternExpressionsFieldProps> = ({
  label,
  expressions,
  onChange,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  const handleChange = (index: number, expr: PatternExpression) => {
    const updated = [...expressions];
    updated[index] = expr;
    onChange(updated);
  };

  const add = () => {
    onChange([...expressions, { selector: '', operator: 'eq', value: '' }]);
  };

  const remove = (index: number) => {
    onChange(expressions.filter((_, i) => i !== index));
  };

  return (
    <FormGroup label={label || t('Pattern expressions')} fieldId="pattern-expressions">
      {expressions.map((expr, index) => (
        <div key={index} className="kuadrant-field-row">
          <PatternExpressionRow expression={expr} onChange={(e) => handleChange(index, e)} />
          <Button variant="plain" aria-label={t('Remove')} onClick={() => remove(index)}>
            <MinusCircleIcon />
          </Button>
        </div>
      ))}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={add}>
        {t('Add expression')}
      </Button>
    </FormGroup>
  );
};

export default PatternExpressionsField;
