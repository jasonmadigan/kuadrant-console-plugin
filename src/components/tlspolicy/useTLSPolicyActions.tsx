import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import usePolicyActions from '../../hooks/usePolicyActions';

const useTLSPolicyActions = (obj: K8sResourceCommon) =>
  usePolicyActions(obj, 'TLSPolicy', 'tlspolicy', 'Edit TLS Policy');

export default useTLSPolicyActions;
