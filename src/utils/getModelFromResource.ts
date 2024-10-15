import { K8sModel, K8sResourceCommon, k8sList } from '@openshift-console/dynamic-plugin-sdk';

const CustomResourceDefinitionModel: K8sModel = {
  apiVersion: 'v1',
  apiGroup: 'apiextensions.k8s.io',
  kind: 'CustomResourceDefinition',
  plural: 'customresourcedefinitions',
  namespaced: false,
  abbr: 'CRD',
  label: 'CustomResourceDefinition',
  labelPlural: 'CustomResourceDefinitions',
};

interface CustomResourceDefinition extends K8sResourceCommon {
  spec: {
    group: string;
    names: {
      kind: string;
    };
    versions: {
      name: string;
      storage: boolean;
    }[];
  };
}

// Helper function to extract K8sModel from a resource
// TODO: refactor to use resource fetching?
const getModelFromResource = (obj: K8sResourceCommon): K8sModel => {
  const [group, version] = obj.apiVersion.split('/');
  const pluralizeKind = (kind: string) =>
    kind.endsWith('y') && !/[aeiou]y$/i.test(kind)
      ? `${kind.slice(0, -1)}ies`.toLowerCase()
      : `${kind}s`.toLowerCase();

  return {
    apiGroup: group,
    apiVersion: version || 'v1', // Default to 'v1' if version is undefined
    kind: obj.kind,
    plural: pluralizeKind(obj.kind),
    namespaced: !!obj.metadata.namespace,
    abbr: obj.kind.charAt(0).toUpperCase(),
    label: obj.kind,
    labelPlural: pluralizeKind(obj.kind),
  };
};

// Groups we're interested in
const labeledInterestedGroups = ['kuadrant.io'];
const unlabeledGroups = ['gateway.networking.k8s.io'];

let crdCache: CustomResourceDefinition[] | null = null;
let crdPromise: Promise<CustomResourceDefinition[]> | null = null;

// Hard-coded version mapping for Gateway resources (these change less frequently)
const hardCodedCRDVersions: { [key: string]: string } = {
  'gateway.networking.k8s.io/Gateway': 'v1',
  'gateway.networking.k8s.io/HTTPRoute': 'v1',
};

// Helper function to fetch and cache CRDs with labels.
// CRD lists are expensive, so ensure only one network request is made, even with multiple calls.
const fetchLabeledCRDs = async (): Promise<CustomResourceDefinition[]> => {
  if (crdCache) return crdCache; // Return cache if available
  if (crdPromise) return crdPromise; // Return promise if fetch is in progress

  const labelSelector = { matchLabels: { app: 'kuadrant' } };

  crdPromise = k8sList<CustomResourceDefinition>({
    model: CustomResourceDefinitionModel,
    queryParams: { labelSelector },
  })
    .then((crds) => {
      crdCache = Array.isArray(crds) ? crds : crds.items; // Cache result
      return crdCache;
    })
    .catch((error) => {
      console.error('Error fetching labeled CRDs:', error);
      crdCache = null;
      throw error;
    })
    .finally(() => {
      crdPromise = null; // Reset promise after fetch completes
    });

  return crdPromise;
};

// Helper function to get the latest version of a CRD
const getKindGroupLatestVersion = async (
  kind: string,
  group: string,
): Promise<{ kind: string; group: string; version: string | null }> => {
  try {
    if (labeledInterestedGroups.includes(group)) {
      const crdItems = await fetchLabeledCRDs();
      const matchedCRD = crdItems.find(
        (crd) =>
          crd.spec.group.toLowerCase() === group.toLowerCase() &&
          crd.spec.names.kind.toLowerCase() === kind.toLowerCase(),
      );

      if (!matchedCRD) return { kind, group, version: null }; // CRD not found

      const latestVersion =
        matchedCRD.spec.versions.find((v) => v.storage) ?? matchedCRD.spec.versions[0];
      return { kind, group, version: latestVersion.name };
    }

    if (unlabeledGroups.includes(group)) {
      const version = hardCodedCRDVersions[`${group}/${kind}`] ?? null;
      return { kind, group, version };
    }

    console.error(`Group not recognized: ${group}`);
    return { kind, group, version: null };
  } catch (error) {
    console.error('Error in getKindGroupLatestVersion:', error);
    return { kind, group, version: null };
  }
};

export { getModelFromResource, getKindGroupLatestVersion };
