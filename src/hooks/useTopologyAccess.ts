import * as React from 'react';
import { useAccessReview, K8sVerb } from '@openshift-console/dynamic-plugin-sdk';

interface TopologyConfig {
  TOPOLOGY_CONFIGMAP_NAME: string;
  TOPOLOGY_CONFIGMAP_NAMESPACE: string;
}

interface AccessReviewResult {
  canReadTopology: boolean;
  isLoadingPermissions: boolean;
}

/**
 * Custom hook to check if user has access to read the topology ConfigMap
 */
export const useTopologyAccess = (config: TopologyConfig | null): AccessReviewResult => {
  const accessReviewProps = React.useMemo(() => {
    return config
      ? {
          group: '',
          resource: 'ConfigMap',
          verb: 'read' as K8sVerb,
          namespace: config.TOPOLOGY_CONFIGMAP_NAMESPACE,
          name: config.TOPOLOGY_CONFIGMAP_NAME,
        }
      : {
          // fallback
          group: '',
          resource: '',
          verb: 'read' as K8sVerb,
          namespace: '',
          name: '',
        };
  }, [config]);

  const [canReadTopology, isLoadingPermissions] = useAccessReview(accessReviewProps);

  return { canReadTopology, isLoadingPermissions };
};
