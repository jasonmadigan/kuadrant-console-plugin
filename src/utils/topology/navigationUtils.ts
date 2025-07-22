import { ResourcePolicyMap, PolicyConfig } from './topologyConstants';

/**
 * Navigate to a specific resource
 * Note: This requires dynamicResourceGVKMapping to be populated
 */
export const createGoToResource = (dynamicResourceGVKMapping: Record<string, any>) => {
  return (resourceType: string, resourceName: string): void => {
    let lookupType = resourceType;
    // special case - Listener should go to associated Gateway
    if (resourceType === 'Listener') {
      lookupType = 'Gateway';
    }
    const finalGVK = dynamicResourceGVKMapping[lookupType];
    if (!finalGVK) {
      console.error(`GVK mapping not found for resource type: ${lookupType}`);
      return;
    }
    const [namespace, name] = resourceName.includes('/')
      ? resourceName.split('/')
      : [null, resourceName];
    const url = namespace
      ? `/k8s/ns/${namespace}/${finalGVK.group}~${finalGVK.version}~${finalGVK.kind}/${name}`
      : `/k8s/cluster/${finalGVK.group}~${finalGVK.version}~${finalGVK.kind}/${resourceName}`;
    window.location.href = url;
  };
};

/**
 * Navigate to create a policy of a specific type
 * Note: This requires dynamicResourceGVKMapping to be populated
 */
export const createNavigateToCreatePolicy = (dynamicResourceGVKMapping: Record<string, any>) => {
  return (policyType: string): void => {
    const resource = dynamicResourceGVKMapping[policyType];
    if (!resource) {
      console.error(`GVK mapping not found for policy type: ${policyType}`);
      return;
    }
    const url = `/k8s/ns/default/${resource.group}~${resource.version}~${resource.kind}/~new`;
    window.location.href = url;
  };
};

/**
 * Get policy configurations available for a specific resource type
 */
export const getPolicyConfigsForResource = (resourceType: string): PolicyConfig[] =>
  ResourcePolicyMap[resourceType] || [];
