import { ResourceKind, RESOURCES, getPoliciesForResource } from '../resources';

export interface PolicyConfig {
  key: ResourceKind;
  displayName: string;
}

// get available policy configurations for a given resource type
export const getPolicyConfigsForResource = (resourceType: string): PolicyConfig[] => {
  const policies = getPoliciesForResource(resourceType as ResourceKind);
  return policies
    .filter((policyKind) => RESOURCES[policyKind])
    .map((policyKind) => ({
      key: policyKind,
      displayName: `Create ${policyKind.replace(/Policy$/, ' Policy')}`,
    }));
};

// navigate to a resource detail page
export const goToResource = (resourceType: string, resourceName: string) => {
  let lookupType = resourceType as ResourceKind;

  // special cases for synthetic topology nodes
  if (resourceType === 'Listener') {
    lookupType = 'Gateway';
  } else if (resourceType === 'HTTPRouteRule') {
    lookupType = 'HTTPRoute';
  }

  const finalGVK = RESOURCES[lookupType]?.gvk;
  if (!finalGVK) {
    console.warn(
      `Cannot navigate: resource type '${resourceType}' not found in registry. This may be a synthetic topology node.`,
    );
    return;
  }

  const [namespace, name] = resourceName.includes('/')
    ? resourceName.split('/')
    : [null, resourceName];

  const url = namespace
    ? `/k8s/ns/${namespace}/${finalGVK.group}~${finalGVK.version}~${finalGVK.kind}/${name}`
    : `/k8s/cluster/${finalGVK.group}~${finalGVK.version}~${finalGVK.kind}/${name}`;

  window.location.href = url;
};

// navigate to policy creation page, optionally pre-filling the target resource
export const navigateToCreatePolicy = (
  policyType: string,
  targetKind?: string,
  targetName?: string,
) => {
  const resourceKind = policyType as ResourceKind;
  const resource = RESOURCES[resourceKind];
  if (!resource) {
    console.error(`Resource not found for policy type: ${policyType}`);
    return;
  }

  // extract namespace from "namespace/name" format
  let namespace = 'default';
  let name = targetName;
  if (targetName?.includes('/')) {
    const parts = targetName.split('/');
    namespace = parts[0];
    name = parts[1];
  }

  const base = `/k8s/ns/${namespace}/${resource.gvk.group}~${resource.gvk.version}~${resource.gvk.kind}/~new`;
  const params = new URLSearchParams();
  if (targetKind) params.set('targetKind', targetKind);
  if (name) params.set('targetName', name);
  const qs = params.toString();
  window.location.href = qs ? `${base}?${qs}` : base;
};
