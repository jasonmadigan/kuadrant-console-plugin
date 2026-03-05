import { FormGroup, TextInput, Button } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { WristbandConfig, SelectorValue } from './types';
import SelectorValueField from './SelectorValueField';
import { useTranslation } from 'react-i18next';

interface WristbandFieldsProps {
  wristband: WristbandConfig;
  onChange: (wristband: WristbandConfig) => void;
}

const WristbandFields: React.FC<WristbandFieldsProps> = ({ wristband, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const claims = wristband.customClaims || {};
  const claimEntries = Object.entries(claims);

  const addClaim = () => {
    let name = 'claim';
    let i = 1;
    while (claims[name]) {
      name = `claim-${i}`;
      i++;
    }
    onChange({ ...wristband, customClaims: { ...claims, [name]: {} } });
  };

  const removeClaim = (key: string) => {
    const updated = { ...claims };
    delete updated[key];
    onChange({ ...wristband, customClaims: Object.keys(updated).length > 0 ? updated : undefined });
  };

  const renameClaim = (oldKey: string, newKey: string) => {
    const updated: Record<string, SelectorValue> = {};
    for (const [k, v] of Object.entries(claims)) {
      updated[k === oldKey ? newKey : k] = v;
    }
    onChange({ ...wristband, customClaims: updated });
  };

  return (
    <>
      <FormGroup label={t('Issuer')} isRequired fieldId="wristband-issuer">
        <TextInput
          isRequired
          type="text"
          value={wristband.issuer}
          onChange={(_e, val) => onChange({ ...wristband, issuer: val })}
          placeholder={t('https://issuer.example.com')}
          aria-label={t('Issuer')}
        />
      </FormGroup>
      <FormGroup label={t('Signing key refs')} fieldId="wristband-signing-keys">
        {(wristband.signingKeyRefs || []).map((ref, i) => (
          <div key={i} className="kuadrant-field-row">
            <TextInput
              type="text"
              value={ref.name}
              onChange={(_e, val) => {
                const updated = [...wristband.signingKeyRefs];
                updated[i] = { ...ref, name: val };
                onChange({ ...wristband, signingKeyRefs: updated });
              }}
              placeholder={t('Secret name')}
              aria-label={t('Secret name')}
              className="kuadrant-field-row__input"
            />
            <TextInput
              type="text"
              value={ref.algorithm}
              onChange={(_e, val) => {
                const updated = [...wristband.signingKeyRefs];
                updated[i] = { ...ref, algorithm: val };
                onChange({ ...wristband, signingKeyRefs: updated });
              }}
              placeholder={t('Algorithm (e.g. ES256)')}
              aria-label={t('Algorithm')}
              className="kuadrant-field-row__input"
            />
            <Button
              variant="plain"
              aria-label={t('Remove')}
              onClick={() => {
                const updated = wristband.signingKeyRefs.filter((_, j) => j !== i);
                onChange({ ...wristband, signingKeyRefs: updated });
              }}
            >
              <MinusCircleIcon />
            </Button>
          </div>
        ))}
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() =>
            onChange({
              ...wristband,
              signingKeyRefs: [...(wristband.signingKeyRefs || []), { name: '', algorithm: '' }],
            })
          }
        >
          {t('Add signing key')}
        </Button>
      </FormGroup>
      <FormGroup label={t('Token duration (seconds)')} fieldId="wristband-duration">
        <TextInput
          type="number"
          value={wristband.tokenDuration ?? ''}
          onChange={(_e, val) =>
            onChange({ ...wristband, tokenDuration: val ? parseInt(val, 10) : undefined })
          }
          placeholder={t('300')}
          aria-label={t('Token duration')}
        />
      </FormGroup>
      <FormGroup label={t('Custom claims')} fieldId="wristband-claims">
        {claimEntries.map(([key, val]) => (
          <div key={key} className="kuadrant-field-row">
            <TextInput
              type="text"
              value={key}
              onChange={(_e, newKey) => renameClaim(key, newKey)}
              placeholder={t('Claim name')}
              aria-label={t('Claim name')}
              style={{ maxWidth: '200px' }}
            />
            <SelectorValueField
              value={val}
              onChange={(newVal) =>
                onChange({ ...wristband, customClaims: { ...claims, [key]: newVal } })
              }
            />
            <Button variant="plain" aria-label={t('Remove')} onClick={() => removeClaim(key)}>
              <MinusCircleIcon />
            </Button>
          </div>
        ))}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={addClaim}>
          {t('Add claim')}
        </Button>
      </FormGroup>
    </>
  );
};

export default WristbandFields;
