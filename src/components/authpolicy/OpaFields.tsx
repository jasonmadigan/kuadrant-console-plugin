import { FormGroup, TextArea, Switch, Button } from '@patternfly/react-core';
import { AngleRightIcon, AngleDownIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { OpaAuthz } from './types';
import HttpRequestField from './HttpRequestField';
import { useTranslation } from 'react-i18next';

interface OpaFieldsProps {
  opa: OpaAuthz;
  onChange: (opa: OpaAuthz) => void;
}

const OpaFields: React.FC<OpaFieldsProps> = ({ opa, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [externalExpanded, setExternalExpanded] = React.useState(!!opa.externalPolicy);

  return (
    <>
      <FormGroup label={t('Rego policy')} fieldId="opa-rego">
        <TextArea
          value={opa.rego || ''}
          onChange={(_e, val) => onChange({ ...opa, rego: val || undefined })}
          placeholder={t('allow = true')}
          aria-label={t('Rego policy')}
          rows={6}
          resizeOrientation="vertical"
        />
      </FormGroup>
      <FormGroup label={t('All values')} fieldId="opa-all-values">
        <Switch
          id="opa-all-values-switch"
          isChecked={opa.allValues || false}
          onChange={(_e, val) => onChange({ ...opa, allValues: val || undefined })}
          label={t('Enabled')}
        />
      </FormGroup>
      <Button
        variant="link"
        icon={externalExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
        onClick={() => setExternalExpanded(!externalExpanded)}
      >
        {t('External policy')}
      </Button>
      {externalExpanded && (
        <HttpRequestField
          config={opa.externalPolicy || { url: '' }}
          onChange={(externalPolicy) =>
            onChange({ ...opa, externalPolicy: externalPolicy.url ? externalPolicy : undefined })
          }
        />
      )}
    </>
  );
};

export default OpaFields;
