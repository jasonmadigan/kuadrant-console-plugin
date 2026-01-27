import * as React from 'react';
import YAMLPolicyCreatePage from './shared/YAMLPolicyCreatePage';
import { TOKEN_RATE_LIMIT_POLICY_EXAMPLE } from '../constants/policyExamples';

const KuadrantTokenRateLimitPolicyCreatePage: React.FC = () => (
  <YAMLPolicyCreatePage
    kind="TokenRateLimitPolicy"
    exampleName="basic-token-limit"
    exampleSpec={TOKEN_RATE_LIMIT_POLICY_EXAMPLE}
  />
);

export default KuadrantTokenRateLimitPolicyCreatePage;
