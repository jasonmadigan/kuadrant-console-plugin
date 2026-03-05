import * as React from 'react';
import RateLimitPolicyForm from './ratelimitpolicy/RateLimitPolicyForm';

const KuadrantRateLimitPolicyCreatePage: React.FC = () => (
  <RateLimitPolicyForm
    config={{
      resourceKey: 'RateLimitPolicy',
      policyType: 'ratelimit',
      createTitle: 'Create RateLimit Policy',
      editTitle: 'Edit RateLimit Policy',
      description: 'RateLimitPolicy enables rate limiting for Gateway API resources',
      nameHelperText: 'Unique name of the RateLimit Policy',
    }}
  />
);

export default KuadrantRateLimitPolicyCreatePage;
