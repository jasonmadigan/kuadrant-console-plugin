import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import usePolicyActions from '../../hooks/usePolicyActions';

const useAuthPolicyActions = (obj: K8sResourceCommon) =>
  usePolicyActions(obj, 'AuthPolicy', 'authpolicy', 'Edit Auth Policy');

export default useAuthPolicyActions;
