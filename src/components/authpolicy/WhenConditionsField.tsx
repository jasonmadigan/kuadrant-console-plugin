import { Button, FormGroup, FormSelect, FormSelectOption, TextInput } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { WhenPredicate, PatternOperator } from './types';
import PatternExpressionRow from './PatternExpressionRow';
import { useTranslation } from 'react-i18next';

interface WhenConditionsFieldProps {
  label?: string;
  predicates: WhenPredicate[];
  onChange: (predicates: WhenPredicate[]) => void;
}

type PredicateMode = 'simple' | 'all' | 'any' | 'patternRef';

const OPERATORS: PatternOperator[] = ['eq', 'neq', 'incl', 'excl', 'matches'];

function getMode(pred: WhenPredicate): PredicateMode {
  if ('all' in pred) return 'all';
  if ('any' in pred) return 'any';
  if ('patternRef' in pred) return 'patternRef';
  return 'simple';
}

const WhenConditionsField: React.FC<WhenConditionsFieldProps> = ({
  label,
  predicates,
  onChange,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  const update = (index: number, pred: WhenPredicate) => {
    const updated = [...predicates];
    updated[index] = pred;
    onChange(updated);
  };

  const add = () => {
    onChange([...predicates, { selector: '', operator: 'eq' as PatternOperator, value: '' }]);
  };

  const remove = (index: number) => {
    onChange(predicates.filter((_, i) => i !== index));
  };

  const changeMode = (index: number, mode: PredicateMode) => {
    switch (mode) {
      case 'simple':
        update(index, { selector: '', operator: 'eq', value: '' });
        break;
      case 'all':
        update(index, {
          all: [{ patternExpression: { selector: '', operator: 'eq', value: '' } }],
        });
        break;
      case 'any':
        update(index, {
          any: [{ patternExpression: { selector: '', operator: 'eq', value: '' } }],
        });
        break;
      case 'patternRef':
        update(index, { patternRef: '' });
        break;
    }
  };

  const renderPredicate = (pred: WhenPredicate, index: number) => {
    const mode = getMode(pred);

    return (
      <div key={index} className="kuadrant-limit-entry">
        <div className="kuadrant-field-row">
          <FormSelect
            value={mode}
            onChange={(_e, val) => changeMode(index, val as PredicateMode)}
            aria-label={t('Condition type')}
            style={{ maxWidth: '150px' }}
          >
            <FormSelectOption value="simple" label={t('Simple')} />
            <FormSelectOption value="all" label={t('All (AND)')} />
            <FormSelectOption value="any" label={t('Any (OR)')} />
            <FormSelectOption value="patternRef" label={t('Pattern ref')} />
          </FormSelect>
          <Button variant="plain" aria-label={t('Remove')} onClick={() => remove(index)}>
            <MinusCircleIcon />
          </Button>
        </div>

        {mode === 'simple' && 'selector' in pred && (
          <div className="kuadrant-field-row">
            <TextInput
              type="text"
              value={pred.selector}
              onChange={(_e, val) => update(index, { ...pred, selector: val })}
              placeholder={t('Selector')}
              aria-label={t('Selector')}
              className="kuadrant-field-row__input"
            />
            <FormSelect
              value={pred.operator}
              onChange={(_e, val) => update(index, { ...pred, operator: val as PatternOperator })}
              aria-label={t('Operator')}
              style={{ maxWidth: '120px' }}
            >
              {OPERATORS.map((op) => (
                <FormSelectOption key={op} value={op} label={op} />
              ))}
            </FormSelect>
            <TextInput
              type="text"
              value={pred.value}
              onChange={(_e, val) => update(index, { ...pred, value: val })}
              placeholder={t('Value')}
              aria-label={t('Value')}
              className="kuadrant-field-row__input"
            />
          </div>
        )}

        {(mode === 'all' || mode === 'any') &&
          (mode === 'all' ? 'all' in pred : 'any' in pred) &&
          (() => {
            const items =
              mode === 'all' && 'all' in pred ? pred.all : 'any' in pred ? pred.any : [];
            const setItems = (
              newItems: {
                patternExpression: { selector: string; operator: PatternOperator; value: string };
              }[],
            ) => {
              if (mode === 'all') {
                update(index, { all: newItems });
              } else {
                update(index, { any: newItems });
              }
            };
            return (
              <>
                {items.map((item, i) => (
                  <div key={i} className="kuadrant-field-row">
                    <PatternExpressionRow
                      expression={item.patternExpression}
                      onChange={(expr) => {
                        const updated = [...items];
                        updated[i] = { patternExpression: expr };
                        setItems(updated);
                      }}
                    />
                    <Button
                      variant="plain"
                      aria-label={t('Remove')}
                      onClick={() => setItems(items.filter((_, j) => j !== i))}
                    >
                      <MinusCircleIcon />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="link"
                  icon={<PlusCircleIcon />}
                  onClick={() =>
                    setItems([
                      ...items,
                      { patternExpression: { selector: '', operator: 'eq', value: '' } },
                    ])
                  }
                >
                  {t('Add expression')}
                </Button>
              </>
            );
          })()}

        {mode === 'patternRef' && 'patternRef' in pred && (
          <TextInput
            type="text"
            value={pred.patternRef}
            onChange={(_e, val) => update(index, { patternRef: val })}
            placeholder={t('Named pattern reference')}
            aria-label={t('Pattern reference')}
          />
        )}
      </div>
    );
  };

  return (
    <FormGroup label={label || t('When conditions')} fieldId="when-conditions">
      {predicates.map((pred, index) => renderPredicate(pred, index))}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={add}>
        {t('Add condition')}
      </Button>
    </FormGroup>
  );
};

export default WhenConditionsField;
