import { Button, FormGroup, TextInput, Switch } from '@patternfly/react-core';
import { AngleRightIcon, AngleDownIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { EvaluatorCommon, WhenPredicate, CacheConfig } from './types';
import CacheField from './CacheField';
import WhenConditionsField from './WhenConditionsField';
import { useTranslation } from 'react-i18next';

interface EvaluatorCommonFieldsProps {
  common: EvaluatorCommon;
  onChange: (common: EvaluatorCommon) => void;
}

const EvaluatorCommonFields: React.FC<EvaluatorCommonFieldsProps> = ({ common, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div>
      <Button
        variant="link"
        icon={expanded ? <AngleDownIcon /> : <AngleRightIcon />}
        onClick={() => setExpanded(!expanded)}
      >
        {t('Advanced options')}
      </Button>
      {expanded && (
        <>
          <FormGroup label={t('Priority')} fieldId="evaluator-priority">
            <TextInput
              type="number"
              value={common.priority ?? ''}
              onChange={(_e, val) =>
                onChange({ ...common, priority: val ? parseInt(val, 10) : undefined })
              }
              placeholder={t('0')}
              aria-label={t('Priority')}
            />
          </FormGroup>
          <FormGroup label={t('Metrics')} fieldId="evaluator-metrics">
            <Switch
              id="evaluator-metrics-switch"
              label={t('Enabled')}
              isChecked={common.metrics || false}
              onChange={(_e, val) => onChange({ ...common, metrics: val || undefined })}
            />
          </FormGroup>
          <CacheField
            cache={common.cache}
            onChange={(cache: CacheConfig) => onChange({ ...common, cache })}
          />
          <WhenConditionsField
            label={t('Entry-level conditions')}
            predicates={common.when || []}
            onChange={(when: WhenPredicate[]) =>
              onChange({ ...common, when: when.length > 0 ? when : undefined })
            }
          />
        </>
      )}
    </div>
  );
};

export default EvaluatorCommonFields;
