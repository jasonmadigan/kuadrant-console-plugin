import { Button, FormGroup, TextInput, Title } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { PatternExpression } from './types';
import PatternExpressionsField from './PatternExpressionsField';
import { useTranslation } from 'react-i18next';

interface NamedPatternsSectionProps {
  patterns: Record<string, { allOf: PatternExpression[] }>;
  onChange: (patterns: Record<string, { allOf: PatternExpression[] }>) => void;
}

const NamedPatternsSection: React.FC<NamedPatternsSectionProps> = ({ patterns, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const entries = Object.entries(patterns);

  const addPattern = () => {
    let name = 'pattern';
    let i = 1;
    while (patterns[name]) {
      name = `pattern-${i}`;
      i++;
    }
    onChange({ ...patterns, [name]: { allOf: [{ selector: '', operator: 'eq', value: '' }] } });
  };

  const removePattern = (name: string) => {
    const updated = { ...patterns };
    delete updated[name];
    onChange(updated);
  };

  const renamePattern = (oldName: string, newName: string) => {
    const updated: Record<string, { allOf: PatternExpression[] }> = {};
    for (const [key, val] of Object.entries(patterns)) {
      updated[key === oldName ? newName : key] = val;
    }
    onChange(updated);
  };

  const updateExpressions = (name: string, allOf: PatternExpression[]) => {
    onChange({ ...patterns, [name]: { allOf } });
  };

  return (
    <div>
      <Title headingLevel="h3" size="md">
        {t('Named patterns')}
      </Title>
      {entries.map(([name, { allOf }]) => (
        <div key={name} className="kuadrant-limit-entry">
          <FormGroup label={t('Pattern name')} fieldId={`pattern-name-${name}`}>
            <div className="kuadrant-field-row">
              <TextInput
                type="text"
                value={name}
                onChange={(_e, val) => renamePattern(name, val)}
                aria-label={t('Pattern name')}
                className="kuadrant-field-row__input"
              />
              <Button
                variant="link"
                isDanger
                icon={<MinusCircleIcon />}
                onClick={() => removePattern(name)}
              >
                {t('Remove')}
              </Button>
            </div>
          </FormGroup>
          <PatternExpressionsField
            label={t('Expressions')}
            expressions={allOf}
            onChange={(exprs) => updateExpressions(name, exprs)}
          />
        </div>
      ))}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={addPattern}>
        {t('Add named pattern')}
      </Button>
    </div>
  );
};

export default NamedPatternsSection;
