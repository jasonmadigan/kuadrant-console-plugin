import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import usePolicyActions from '../../hooks/usePolicyActions';

const usePlanPolicyActions = (obj: K8sResourceCommon) =>
  usePolicyActions(obj, 'PlanPolicy', 'planpolicy', 'Edit Plan Policy');

export default usePlanPolicyActions;
