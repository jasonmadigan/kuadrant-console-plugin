import {
  FormGroup,
  FormSelect,
  FormSelectOption,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
} from '@patternfly/react-core';
import * as React from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TargetRef } from './types';
import { Gateway } from '../gateway/types';
import { HTTPRoute } from '../httproute/types';
import GatewaySelect from '../gateway/GatewaySelect';
import HTTPRouteSelect from '../httproute/HTTPRouteSelect';
import { RESOURCES } from '../../utils/resources';
import { useTranslation } from 'react-i18next';

interface TargetRefFieldProps {
  targetRef: TargetRef;
  onChange: (targetRef: TargetRef) => void;
  formDisabled?: boolean;
  namespace?: string;
}

interface K8sGateway {
  metadata?: { name?: string; namespace?: string };
  spec?: { listeners?: { name: string }[] };
}

const TargetRefField: React.FC<TargetRefFieldProps> = ({
  targetRef,
  onChange,
  formDisabled,
  namespace,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const kind = targetRef.kind || 'Gateway';
  const effectiveNs = namespace && namespace !== '#ALL_NS#' ? namespace : undefined;

  const [listenerNames, setListenerNames] = React.useState<string[]>([]);

  // watch the selected gateway to get listener names for the section name picker
  const gatewayWatch =
    kind === 'Gateway' && targetRef.name && effectiveNs
      ? {
          groupVersionKind: RESOURCES.Gateway.gvk,
          isList: false,
          name: targetRef.name,
          namespace: effectiveNs,
        }
      : null;

  const [gwData, gwLoaded, gwError] = useK8sWatchResource(gatewayWatch);

  React.useEffect(() => {
    if (gwLoaded && !gwError && gwData && !Array.isArray(gwData)) {
      const gw = gwData as K8sGateway;
      setListenerNames((gw.spec?.listeners || []).map((l) => l.name));
    } else {
      setListenerNames([]);
    }
  }, [gwData, gwLoaded, gwError]);

  const handleKindChange = (newKind: 'Gateway' | 'HTTPRoute') => {
    setListenerNames([]);
    onChange({ ...targetRef, kind: newKind, name: '', sectionName: undefined });
  };

  const handleGatewayChange = (gw: Gateway) => {
    onChange({
      ...targetRef,
      group: 'gateway.networking.k8s.io',
      kind: 'Gateway',
      name: gw.name,
      sectionName: undefined,
    });
  };

  const handleHTTPRouteChange = (route: HTTPRoute) => {
    onChange({
      ...targetRef,
      group: 'gateway.networking.k8s.io',
      kind: 'HTTPRoute',
      name: route.name,
      sectionName: undefined,
    });
  };

  const handleSectionNameChange = (event: React.FormEvent<HTMLSelectElement>) => {
    const val = event.currentTarget.value;
    onChange({ ...targetRef, sectionName: val || undefined });
  };

  // for the select value, use the policy namespace since targetRef is always same-namespace
  const selectNamespace = effectiveNs || '';

  return (
    <>
      <FormGroup
        role="radiogroup"
        isInline
        fieldId="target-ref-kind"
        label={t('Target resource kind')}
        isRequired
      >
        <Radio
          label={t('Gateway')}
          isChecked={kind === 'Gateway'}
          onChange={() => handleKindChange('Gateway')}
          id="target-kind-gateway"
          name="target-kind"
          isDisabled={formDisabled}
        />
        <Radio
          label={t('HTTPRoute')}
          isChecked={kind === 'HTTPRoute'}
          onChange={() => handleKindChange('HTTPRoute')}
          id="target-kind-httproute"
          name="target-kind"
          isDisabled={formDisabled}
        />
      </FormGroup>
      {kind === 'Gateway' ? (
        <GatewaySelect
          selectedGateway={{ name: targetRef.name, namespace: selectNamespace }}
          onChange={handleGatewayChange}
          namespace={effectiveNs}
        />
      ) : (
        <HTTPRouteSelect
          selectedHTTPRoute={{ name: targetRef.name, namespace: selectNamespace }}
          onChange={handleHTTPRouteChange}
          namespace={effectiveNs}
        />
      )}
      <FormGroup label={t('Section name')} fieldId="target-section-name">
        <FormSelect
          id="target-section-name"
          value={targetRef.sectionName || ''}
          onChange={handleSectionNameChange}
          aria-label={t('Select section name')}
          isDisabled={formDisabled || (kind === 'Gateway' && listenerNames.length === 0)}
        >
          <FormSelectOption key="" value="" label={t('None')} />
          {listenerNames.map((name) => (
            <FormSelectOption key={name} value={name} label={name} />
          ))}
        </FormSelect>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {kind === 'Gateway'
                ? t('Optional: targets a specific gateway listener')
                : t('Optional: targets a specific section of the resource')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </>
  );
};

export default TargetRefField;
