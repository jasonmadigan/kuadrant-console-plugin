import { createPolicyActionsHook } from '../../hooks/usePolicyActions';

const useTLSPolicyActions = createPolicyActionsHook({
  kind: 'TLSPolicy',
  editPathSegment: 'tlspolicy',
});

export default useTLSPolicyActions;
