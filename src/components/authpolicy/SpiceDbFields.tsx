import { FormGroup, TextInput, Switch } from '@patternfly/react-core';
import * as React from 'react';
import { SpiceDbAuthz } from './types';
import SelectorValueField from './SelectorValueField';
import { useTranslation } from 'react-i18next';

interface SpiceDbFieldsProps {
  spicedb: SpiceDbAuthz;
  onChange: (spicedb: SpiceDbAuthz) => void;
}

const SpiceDbFields: React.FC<SpiceDbFieldsProps> = ({ spicedb, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  return (
    <>
      <FormGroup label={t('Endpoint')} isRequired fieldId="spicedb-endpoint">
        <TextInput
          isRequired
          type="text"
          value={spicedb.endpoint}
          onChange={(_e, val) => onChange({ ...spicedb, endpoint: val })}
          placeholder={t('spicedb.default.svc.cluster.local:50051')}
          aria-label={t('SpiceDB endpoint')}
        />
      </FormGroup>
      <FormGroup label={t('Insecure')} fieldId="spicedb-insecure">
        <Switch
          id="spicedb-insecure-switch"
          isChecked={spicedb.insecure || false}
          onChange={(_e, val) => onChange({ ...spicedb, insecure: val || undefined })}
          label={t('Insecure')}
        />
      </FormGroup>
      <FormGroup label={t('Shared secret ref')} fieldId="spicedb-secret-ref">
        <TextInput
          type="text"
          value={spicedb.sharedSecretRef?.name || ''}
          onChange={(_e, val) =>
            onChange({ ...spicedb, sharedSecretRef: val ? { name: val } : undefined })
          }
          placeholder={t('Secret name')}
          aria-label={t('Shared secret ref')}
        />
      </FormGroup>
      <FormGroup label={t('Subject')} fieldId="spicedb-subject">
        <SelectorValueField
          value={spicedb.subject || {}}
          onChange={(subject) =>
            onChange({
              ...spicedb,
              subject: subject.selector || subject.value ? subject : undefined,
            })
          }
        />
      </FormGroup>
      <FormGroup label={t('Resource')} fieldId="spicedb-resource">
        <SelectorValueField
          value={spicedb.resource || {}}
          onChange={(resource) =>
            onChange({
              ...spicedb,
              resource: resource.selector || resource.value ? resource : undefined,
            })
          }
        />
      </FormGroup>
      <FormGroup label={t('Permission')} fieldId="spicedb-permission">
        <SelectorValueField
          value={spicedb.permission || {}}
          onChange={(permission) =>
            onChange({
              ...spicedb,
              permission: permission.selector || permission.value ? permission : undefined,
            })
          }
        />
      </FormGroup>
    </>
  );
};

export default SpiceDbFields;
