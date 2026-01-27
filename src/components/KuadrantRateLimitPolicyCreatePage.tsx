import * as React from 'react';
import YAMLPolicyCreatePage from './shared/YAMLPolicyCreatePage';
import { RATE_LIMIT_POLICY_EXAMPLE } from '../constants/policyExamples';

const KuadrantRateLimitPolicyCreatePage: React.FC = () => (
  <YAMLPolicyCreatePage
    kind="RateLimitPolicy"
    exampleName="example-ratelimitpolicy"
    exampleSpec={RATE_LIMIT_POLICY_EXAMPLE}
  />
);

export default KuadrantRateLimitPolicyCreatePage;
