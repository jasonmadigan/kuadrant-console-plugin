import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import usePolicyActions from '../../hooks/usePolicyActions';

const useRateLimitPolicyActions = (obj: K8sResourceCommon) =>
  usePolicyActions(obj, 'RateLimitPolicy', 'ratelimitpolicy', 'Edit Rate Limit Policy');

export default useRateLimitPolicyActions;
