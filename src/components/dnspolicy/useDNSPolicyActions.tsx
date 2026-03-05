import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import usePolicyActions from '../../hooks/usePolicyActions';

const useDNSPolicyActions = (obj: K8sResourceCommon) =>
  usePolicyActions(obj, 'DNSPolicy', 'dnspolicy', 'Edit DNS Policy');

export default useDNSPolicyActions;
