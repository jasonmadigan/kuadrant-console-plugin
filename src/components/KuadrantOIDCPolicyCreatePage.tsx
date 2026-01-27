import * as React from 'react';
import YAMLPolicyCreatePage from './shared/YAMLPolicyCreatePage';
import { OIDC_POLICY_EXAMPLE } from '../constants/policyExamples';

const KuadrantOIDCPolicyCreatePage: React.FC = () => (
  <YAMLPolicyCreatePage
    kind="OIDCPolicy"
    exampleName="example-oidc-policy"
    exampleSpec={OIDC_POLICY_EXAMPLE}
  />
);

export default KuadrantOIDCPolicyCreatePage;
