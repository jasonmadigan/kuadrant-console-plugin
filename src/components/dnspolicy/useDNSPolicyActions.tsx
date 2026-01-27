import { createPolicyActionsHook } from '../../hooks/usePolicyActions';

const useDNSPolicyActions = createPolicyActionsHook({
  kind: 'DNSPolicy',
  editPathSegment: 'dnspolicy',
});

export default useDNSPolicyActions;
