import {
  TextInput,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ExpandableSection,
} from '@patternfly/react-core';
import * as React from 'react';
import { LimitConfig } from './types';
import RatesField from './RatesField';
import CountersField from './CountersField';
import WhenField from './WhenField';
import { useTranslation } from 'react-i18next';

interface LimitEntryProps {
  name: string;
  config: LimitConfig;
  onNameChange: (name: string) => void;
  onConfigChange: (config: LimitConfig) => void;
  tokenMode?: boolean;
}

const LimitEntry: React.FC<LimitEntryProps> = ({
  name,
  config,
  onNameChange,
  onConfigChange,
  tokenMode,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [countersExpanded, setCountersExpanded] = React.useState(
    (config.counters?.length || 0) > 0,
  );
  const [whenExpanded, setWhenExpanded] = React.useState((config.when?.length || 0) > 0);

  return (
    <div className="kuadrant-limit-entry">
      <FormGroup label={t('Limit name')} isRequired fieldId={`limit-name-${name}`}>
        <TextInput
          isRequired
          type="text"
          value={name}
          onChange={(_event, val) => onNameChange(val)}
          placeholder={t('e.g. global, per-user')}
          aria-label={t('Limit name')}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t('A unique identifier for this limit within the policy.')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <RatesField
        rates={config.rates || []}
        onChange={(rates) => onConfigChange({ ...config, rates })}
        tokenMode={tokenMode}
      />
      <ExpandableSection
        toggleText={t('Counters')}
        isExpanded={countersExpanded}
        onToggle={() => setCountersExpanded(!countersExpanded)}
      >
        <CountersField
          counters={config.counters || []}
          onChange={(counters) => onConfigChange({ ...config, counters })}
        />
      </ExpandableSection>
      <ExpandableSection
        toggleText={t('Conditions')}
        isExpanded={whenExpanded}
        onToggle={() => setWhenExpanded(!whenExpanded)}
      >
        <WhenField
          predicates={config.when || []}
          onChange={(when) => onConfigChange({ ...config, when })}
        />
      </ExpandableSection>
    </div>
  );
};

export default LimitEntry;
