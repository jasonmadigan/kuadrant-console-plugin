import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import usePolicyActions from '../../hooks/usePolicyActions';

const useOIDCPolicyActions = (obj: K8sResourceCommon) =>
  usePolicyActions(obj, 'OIDCPolicy', 'oidcpolicy', 'Edit OIDC Policy');

export default useOIDCPolicyActions;
