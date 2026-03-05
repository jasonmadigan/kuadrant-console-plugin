import * as React from 'react';
import Helmet from 'react-helmet';
import {
  PageSection,
  Title,
  TextInput,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Form,
  Radio,
  Button,
  ExpandableSection,
  ActionGroup,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import './kuadrant.css';
import {
  ResourceYAMLEditor,
  getGroupVersionKindForResource,
  useK8sModel,
  useK8sWatchResource,
  K8sResourceCommon,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';
import { useHistory, useLocation } from 'react-router-dom';
import yaml from 'js-yaml';
import { TargetRef } from './shared/types';
import TargetRefField from './shared/TargetRefField';
import KuadrantCreateUpdate from './KuadrantCreateUpdate';
import { handleCancel } from '../utils/cancel';
import { resourceGVKMapping } from '../utils/resources';

type DiscoveryMode = 'issuer' | 'jwks';
type TokenSourceType =
  | 'default'
  | 'authorizationHeader'
  | 'cookie'
  | 'customHeader'
  | 'queryString';

const KuadrantOIDCPolicyCreatePage: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const history = useHistory();
  const location = useLocation();
  const [selectedNamespace] = useActiveNamespace();
  const [createView, setCreateView] = React.useState<'form' | 'yaml'>('form');
  const [policyName, setPolicyName] = React.useState('');
  const [targetRef, setTargetRef] = React.useState<TargetRef>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      group: 'gateway.networking.k8s.io',
      kind: (params.get('targetKind') as 'Gateway' | 'HTTPRoute') || 'Gateway',
      name: params.get('targetName') || '',
    };
  });
  const [clientID, setClientID] = React.useState('');
  const [discoveryMode, setDiscoveryMode] = React.useState<DiscoveryMode>('issuer');
  const [issuerURL, setIssuerURL] = React.useState('');
  const [jwksURL, setJwksURL] = React.useState('');
  const [authorizationEndpoint, setAuthorizationEndpoint] = React.useState('');
  const [tokenEndpoint, setTokenEndpoint] = React.useState('');
  const [redirectURI, setRedirectURI] = React.useState('');
  const [clientSecret, setClientSecret] = React.useState('');
  const [claims, setClaims] = React.useState<Record<string, string>>({});
  const [tokenSourceType, setTokenSourceType] = React.useState<TokenSourceType>('default');
  const [tokenSourceValue, setTokenSourceValue] = React.useState('');
  const [formDisabled, setFormDisabled] = React.useState(false);
  const [create, setCreate] = React.useState(true);
  const [creationTimestamp, setCreationTimestamp] = React.useState('');
  const [resourceVersion, setResourceVersion] = React.useState('');

  const pathSplit = location.pathname.split('/');
  const nameEdit = pathSplit[6];
  const namespaceEdit = pathSplit[3];

  const gvkInfo = resourceGVKMapping['OIDCPolicy'];
  const policyGVK = getGroupVersionKindForResource({
    apiVersion: `${gvkInfo.group}/${gvkInfo.version}`,
    kind: gvkInfo.kind,
  });
  const [policyModel] = useK8sModel({
    group: policyGVK.group,
    version: policyGVK.version,
    kind: policyGVK.kind,
  });

  const createPolicy = () => {
    const cleanTargetRef: Record<string, string> = {
      group: targetRef.group,
      kind: targetRef.kind,
      name: targetRef.name,
    };
    if (targetRef.sectionName) {
      cleanTargetRef.sectionName = targetRef.sectionName;
    }

    const provider: Record<string, unknown> = { clientID };
    if (discoveryMode === 'issuer' && issuerURL) provider.issuerURL = issuerURL;
    if (discoveryMode === 'jwks' && jwksURL) {
      provider.jwksURL = jwksURL;
      if (authorizationEndpoint) provider.authorizationEndpoint = authorizationEndpoint;
      if (tokenEndpoint) provider.tokenEndpoint = tokenEndpoint;
    }
    if (redirectURI) provider.redirectURI = redirectURI;
    if (clientSecret) provider.clientSecret = clientSecret;

    const spec: Record<string, unknown> = { targetRef: cleanTargetRef, provider };

    if (Object.keys(claims).length > 0 || tokenSourceType !== 'default') {
      const auth: Record<string, unknown> = {};
      if (Object.keys(claims).length > 0) auth.claims = claims;
      if (tokenSourceType !== 'default') {
        const tokenSource: Record<string, unknown> = {};
        if (tokenSourceType === 'authorizationHeader') {
          tokenSource.authorizationHeader = { prefix: tokenSourceValue };
        } else {
          tokenSource[tokenSourceType] = { name: tokenSourceValue };
        }
        auth.tokenSource = tokenSource;
      }
      spec.auth = auth;
    }

    return {
      apiVersion: `${gvkInfo.group}/${gvkInfo.version}`,
      kind: gvkInfo.kind,
      metadata: {
        name: policyName,
        namespace: selectedNamespace,
        ...(creationTimestamp ? { creationTimestamp } : {}),
        ...(resourceVersion ? { resourceVersion } : {}),
      },
      spec,
    };
  };

  const [yamlInput, setYamlInput] = React.useState(createPolicy);

  // edit mode: load existing resource
  const watchResource = nameEdit
    ? { groupVersionKind: policyGVK, isList: false, name: nameEdit, namespace: namespaceEdit }
    : null;
  const [watchData, watchLoaded, watchError] = useK8sWatchResource(watchResource);

  React.useEffect(() => {
    if (!watchLoaded || watchError || !watchData || Array.isArray(watchData)) return;
    const existing = watchData as K8sResourceCommon & { spec?: Record<string, unknown> };
    setCreationTimestamp(existing.metadata.creationTimestamp);
    setResourceVersion(existing.metadata.resourceVersion);
    setFormDisabled(true);
    setCreate(false);
    setPolicyName(existing.metadata?.name || '');

    const spec = existing.spec || {};
    const ref = spec.targetRef as TargetRef;
    if (ref) {
      setTargetRef({
        group: ref.group || 'gateway.networking.k8s.io',
        kind: ref.kind || 'Gateway',
        name: ref.name || '',
        sectionName: ref.sectionName,
      });
    }

    const prov = spec.provider as Record<string, unknown>;
    if (prov) {
      setClientID((prov.clientID as string) || '');
      if (prov.jwksURL) {
        setDiscoveryMode('jwks');
        setJwksURL((prov.jwksURL as string) || '');
        setAuthorizationEndpoint((prov.authorizationEndpoint as string) || '');
        setTokenEndpoint((prov.tokenEndpoint as string) || '');
      } else {
        setDiscoveryMode('issuer');
        setIssuerURL((prov.issuerURL as string) || '');
      }
      setRedirectURI((prov.redirectURI as string) || '');
      setClientSecret((prov.clientSecret as string) || '');
    }

    const auth = spec.auth as Record<string, unknown>;
    if (auth) {
      setClaims((auth.claims as Record<string, string>) || {});
      const ts = auth.tokenSource as Record<string, Record<string, string>>;
      if (ts) {
        if (ts.authorizationHeader) {
          setTokenSourceType('authorizationHeader');
          setTokenSourceValue(ts.authorizationHeader.prefix || '');
        } else if (ts.cookie) {
          setTokenSourceType('cookie');
          setTokenSourceValue(ts.cookie.name || '');
        } else if (ts.customHeader) {
          setTokenSourceType('customHeader');
          setTokenSourceValue(ts.customHeader.name || '');
        } else if (ts.queryString) {
          setTokenSourceType('queryString');
          setTokenSourceValue(ts.queryString.name || '');
        }
      }
    }
  }, [watchData, watchLoaded, watchError]);

  // sync form to yaml
  React.useEffect(() => {
    setYamlInput(createPolicy());
  }, [
    policyName,
    selectedNamespace,
    targetRef,
    clientID,
    discoveryMode,
    issuerURL,
    jwksURL,
    authorizationEndpoint,
    tokenEndpoint,
    redirectURI,
    clientSecret,
    claims,
    tokenSourceType,
    tokenSourceValue,
  ]);

  const handleYAMLChange = (input: string) => {
    try {
      const parsed = yaml.load(input) as Record<string, unknown>;
      const meta = parsed.metadata as Record<string, string>;
      const spec = parsed.spec as Record<string, unknown>;
      setPolicyName(meta?.name || '');

      if (spec?.targetRef) {
        const ref = spec.targetRef as TargetRef;
        setTargetRef({
          group: ref.group || 'gateway.networking.k8s.io',
          kind: ref.kind || 'Gateway',
          name: ref.name || '',
          sectionName: ref.sectionName,
        });
      }

      const prov = spec?.provider as Record<string, unknown>;
      if (prov) {
        setClientID((prov.clientID as string) || '');
        if (prov.jwksURL) {
          setDiscoveryMode('jwks');
          setJwksURL((prov.jwksURL as string) || '');
          setAuthorizationEndpoint((prov.authorizationEndpoint as string) || '');
          setTokenEndpoint((prov.tokenEndpoint as string) || '');
          setIssuerURL('');
        } else {
          setDiscoveryMode('issuer');
          setIssuerURL((prov.issuerURL as string) || '');
          setJwksURL('');
          setAuthorizationEndpoint('');
          setTokenEndpoint('');
        }
        setRedirectURI((prov.redirectURI as string) || '');
        setClientSecret((prov.clientSecret as string) || '');
      }

      const auth = spec?.auth as Record<string, unknown>;
      if (auth) {
        setClaims((auth.claims as Record<string, string>) || {});
        const ts = auth.tokenSource as Record<string, Record<string, string>>;
        if (ts) {
          if (ts.authorizationHeader) {
            setTokenSourceType('authorizationHeader');
            setTokenSourceValue(ts.authorizationHeader.prefix || '');
          } else if (ts.cookie) {
            setTokenSourceType('cookie');
            setTokenSourceValue(ts.cookie.name || '');
          } else if (ts.customHeader) {
            setTokenSourceType('customHeader');
            setTokenSourceValue(ts.customHeader.name || '');
          } else if (ts.queryString) {
            setTokenSourceType('queryString');
            setTokenSourceValue(ts.queryString.name || '');
          } else {
            setTokenSourceType('default');
            setTokenSourceValue('');
          }
        } else {
          setTokenSourceType('default');
          setTokenSourceValue('');
        }
      } else {
        setClaims({});
        setTokenSourceType('default');
        setTokenSourceValue('');
      }
    } catch (e) {
      console.error('error parsing yaml:', e);
    }
  };

  const policy = createPolicy();
  const isFormValid = !!(policyName && targetRef.name && clientID);

  // claims helpers
  const addClaim = () => {
    setClaims((prev) => ({ ...prev, ['claim-' + Date.now()]: '' }));
  };
  const removeClaim = (key: string) => {
    setClaims((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const renameClaim = (oldKey: string, newKey: string) => {
    setClaims((prev) => {
      const entries = Object.entries(prev).map(([k, v]) => (k === oldKey ? [newKey, v] : [k, v]));
      return Object.fromEntries(entries);
    });
  };
  const updateClaimValue = (key: string, value: string) => {
    setClaims((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <Helmet>
        <title data-test="oidcpolicy-page-title">
          {create ? t('Create OIDC Policy') : t('Edit OIDC Policy')}
        </title>
      </Helmet>
      <PageSection hasBodyWrapper={false}>
        <div className="co-m-nav-title">
          <Title headingLevel="h1">
            {create ? t('Create OIDC Policy') : t('Edit OIDC Policy')}
          </Title>
          <p className="help-block">
            {t('OIDCPolicy enables OpenID Connect authentication for Gateway API resources')}
          </p>
        </div>
        <FormGroup
          className="kuadrant-editor-toggle"
          role="radiogroup"
          isInline
          fieldId="create-type-radio-group"
          label={t('Configure via')}
        >
          <Radio
            name="create-type-radio"
            label={t('Form View')}
            id="create-type-radio-form"
            isChecked={createView === 'form'}
            onChange={() => setCreateView('form')}
          />
          <Radio
            name="create-type-radio"
            label={t('YAML View')}
            id="create-type-radio-yaml"
            isChecked={createView === 'yaml'}
            onChange={() => setCreateView('yaml')}
          />
        </FormGroup>
      </PageSection>
      {createView === 'form' ? (
        <PageSection hasBodyWrapper={false}>
          <Form className="co-m-pane__form">
            <FormGroup label={t('Policy name')} isRequired fieldId="policy-name">
              <TextInput
                isRequired
                type="text"
                id="policy-name"
                name="policy-name"
                value={policyName}
                onChange={(_event, val) => setPolicyName(val)}
                isDisabled={formDisabled}
                placeholder={t('Policy name')}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{t('Unique name of the OIDC Policy')}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <TargetRefField
              targetRef={targetRef}
              onChange={setTargetRef}
              formDisabled={formDisabled}
              namespace={namespaceEdit || selectedNamespace}
            />

            {/* provider */}
            <Title headingLevel="h2">{t('Provider')}</Title>
            <FormGroup label={t('Client ID')} isRequired fieldId="client-id">
              <TextInput
                isRequired
                type="text"
                id="client-id"
                value={clientID}
                onChange={(_event, val) => setClientID(val)}
                placeholder={t('Client ID')}
              />
            </FormGroup>
            <FormGroup
              role="radiogroup"
              fieldId="discovery-mode"
              label={t('Discovery mode')}
              isRequired
            >
              <Radio
                label={t('Issuer URL')}
                description={t('Use OpenID Connect discovery via issuer URL')}
                isChecked={discoveryMode === 'issuer'}
                onChange={() => setDiscoveryMode('issuer')}
                id="discovery-mode-issuer"
                name="discovery-mode"
              />
              <Radio
                label={t('JWKS URL')}
                description={t('Provide JWKS URL and endpoints directly')}
                isChecked={discoveryMode === 'jwks'}
                onChange={() => setDiscoveryMode('jwks')}
                id="discovery-mode-jwks"
                name="discovery-mode"
              />
            </FormGroup>
            {discoveryMode === 'issuer' ? (
              <FormGroup label={t('Issuer URL')} fieldId="issuer-url">
                <TextInput
                  type="url"
                  id="issuer-url"
                  value={issuerURL}
                  onChange={(_event, val) => setIssuerURL(val)}
                  placeholder="https://auth.example.com"
                />
              </FormGroup>
            ) : (
              <>
                <FormGroup label={t('JWKS URL')} isRequired fieldId="jwks-url">
                  <TextInput
                    isRequired
                    type="url"
                    id="jwks-url"
                    value={jwksURL}
                    onChange={(_event, val) => setJwksURL(val)}
                    placeholder="https://auth.example.com/.well-known/jwks.json"
                  />
                </FormGroup>
                <FormGroup
                  label={t('Authorization endpoint')}
                  isRequired
                  fieldId="authorization-endpoint"
                >
                  <TextInput
                    isRequired
                    type="url"
                    id="authorization-endpoint"
                    value={authorizationEndpoint}
                    onChange={(_event, val) => setAuthorizationEndpoint(val)}
                    placeholder="https://auth.example.com/authorize"
                  />
                </FormGroup>
                <FormGroup label={t('Token endpoint')} isRequired fieldId="token-endpoint">
                  <TextInput
                    isRequired
                    type="url"
                    id="token-endpoint"
                    value={tokenEndpoint}
                    onChange={(_event, val) => setTokenEndpoint(val)}
                    placeholder="https://auth.example.com/token"
                  />
                </FormGroup>
              </>
            )}
            <FormGroup label={t('Redirect URI')} fieldId="redirect-uri">
              <TextInput
                type="url"
                id="redirect-uri"
                value={redirectURI}
                onChange={(_event, val) => setRedirectURI(val)}
                placeholder="https://app.example.com/callback"
              />
            </FormGroup>
            <FormGroup label={t('Client secret')} fieldId="client-secret">
              <TextInput
                type="text"
                id="client-secret"
                value={clientSecret}
                onChange={(_event, val) => setClientSecret(val)}
                placeholder={t('Client secret')}
              />
            </FormGroup>

            {/* auth */}
            <ExpandableSection toggleText={t('Auth settings')}>
              <FormGroup label={t('Claims')} fieldId="claims">
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>{t('Map claim names to CEL expressions')}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
                {Object.entries(claims).map(([key, value]) => (
                  <div key={key} className="kuadrant-field-row">
                    <div className="kuadrant-field-row__input">
                      <TextInput
                        placeholder={t('Claim name')}
                        value={key}
                        onChange={(_event, val) => renameClaim(key, val)}
                      />
                    </div>
                    <div className="kuadrant-field-row__input">
                      <TextInput
                        placeholder={t('Value')}
                        value={value}
                        onChange={(_event, val) => updateClaimValue(key, val)}
                      />
                    </div>
                    <Button
                      variant="link"
                      isDanger
                      icon={<MinusCircleIcon />}
                      onClick={() => removeClaim(key)}
                    >
                      {t('Remove')}
                    </Button>
                  </div>
                ))}
                <Button variant="link" icon={<PlusCircleIcon />} onClick={addClaim}>
                  {t('Add claim')}
                </Button>
              </FormGroup>

              <FormGroup role="radiogroup" fieldId="token-source-type" label={t('Token source')}>
                <Radio
                  label={t('Default')}
                  isChecked={tokenSourceType === 'default'}
                  onChange={() => {
                    setTokenSourceType('default');
                    setTokenSourceValue('');
                  }}
                  id="token-source-default"
                  name="token-source"
                />
                <Radio
                  label={t('Authorization header')}
                  isChecked={tokenSourceType === 'authorizationHeader'}
                  onChange={() => setTokenSourceType('authorizationHeader')}
                  id="token-source-auth-header"
                  name="token-source"
                />
                <Radio
                  label={t('Cookie')}
                  isChecked={tokenSourceType === 'cookie'}
                  onChange={() => setTokenSourceType('cookie')}
                  id="token-source-cookie"
                  name="token-source"
                />
                <Radio
                  label={t('Custom header')}
                  isChecked={tokenSourceType === 'customHeader'}
                  onChange={() => setTokenSourceType('customHeader')}
                  id="token-source-custom-header"
                  name="token-source"
                />
                <Radio
                  label={t('Query string')}
                  isChecked={tokenSourceType === 'queryString'}
                  onChange={() => setTokenSourceType('queryString')}
                  id="token-source-query-string"
                  name="token-source"
                />
              </FormGroup>
              {tokenSourceType === 'authorizationHeader' && (
                <FormGroup label={t('Prefix')} fieldId="token-source-prefix">
                  <TextInput
                    type="text"
                    id="token-source-prefix"
                    value={tokenSourceValue}
                    onChange={(_event, val) => setTokenSourceValue(val)}
                    placeholder="Bearer"
                  />
                </FormGroup>
              )}
              {(tokenSourceType === 'cookie' ||
                tokenSourceType === 'customHeader' ||
                tokenSourceType === 'queryString') && (
                <FormGroup label={t('Name')} fieldId="token-source-name">
                  <TextInput
                    type="text"
                    id="token-source-name"
                    value={tokenSourceValue}
                    onChange={(_event, val) => setTokenSourceValue(val)}
                    placeholder={
                      tokenSourceType === 'cookie'
                        ? t('Cookie name')
                        : tokenSourceType === 'customHeader'
                        ? t('Header name')
                        : t('Query parameter name')
                    }
                  />
                </FormGroup>
              )}
            </ExpandableSection>

            <ActionGroup className="pf-v6-u-mt-0">
              <KuadrantCreateUpdate
                model={policyModel}
                resource={policy}
                policyType="oidc"
                history={history}
                validation={isFormValid}
              />
              <Button
                variant="link"
                onClick={() => handleCancel(history)}
              >
                {t('Cancel')}
              </Button>
            </ActionGroup>
          </Form>
        </PageSection>
      ) : (
        <React.Suspense fallback={<div>{t('Loading..')}.</div>}>
          <ResourceYAMLEditor
            initialResource={yamlInput}
            create={create}
            onChange={handleYAMLChange}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default KuadrantOIDCPolicyCreatePage;
