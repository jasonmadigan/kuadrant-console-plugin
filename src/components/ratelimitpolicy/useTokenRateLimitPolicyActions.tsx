import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import usePolicyActions from '../../hooks/usePolicyActions';

const useTokenRateLimitPolicyActions = (obj: K8sResourceCommon) =>
  usePolicyActions(obj, 'TokenRateLimitPolicy', 'tokenratelimitpolicy', 'Edit TokenRateLimit Policy');

export default useTokenRateLimitPolicyActions;
