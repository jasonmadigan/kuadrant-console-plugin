import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import usePolicyActions from '../../hooks/usePolicyActions';

const useTelemetryPolicyActions = (obj: K8sResourceCommon) =>
  usePolicyActions(obj, 'TelemetryPolicy', 'telemetrypolicy', 'Edit Telemetry Policy');

export default useTelemetryPolicyActions;
