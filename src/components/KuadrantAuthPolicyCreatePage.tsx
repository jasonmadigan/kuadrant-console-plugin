import * as React from 'react';
import YAMLPolicyCreatePage from './shared/YAMLPolicyCreatePage';
import { AUTH_POLICY_EXAMPLE } from '../constants/policyExamples';

const KuadrantAuthPolicyCreatePage: React.FC = () => (
  <YAMLPolicyCreatePage
    kind="AuthPolicy"
    exampleName="example-authpolicy"
    exampleSpec={AUTH_POLICY_EXAMPLE}
  />
);

export default KuadrantAuthPolicyCreatePage;
