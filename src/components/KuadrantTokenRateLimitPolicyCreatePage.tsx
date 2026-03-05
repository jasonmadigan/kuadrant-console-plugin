import * as React from 'react';
import RateLimitPolicyForm from './ratelimitpolicy/RateLimitPolicyForm';

const KuadrantTokenRateLimitPolicyCreatePage: React.FC = () => (
  <RateLimitPolicyForm
    config={{
      resourceKey: 'TokenRateLimitPolicy',
      policyType: 'tokenratelimit',
      tokenMode: true,
      createTitle: 'Create TokenRateLimit Policy',
      editTitle: 'Edit TokenRateLimit Policy',
      description:
        'TokenRateLimitPolicy enables token-based rate limiting for Gateway API resources',
      nameHelperText: 'Unique name of the TokenRateLimit Policy',
    }}
  />
);

export default KuadrantTokenRateLimitPolicyCreatePage;
