export interface GVK {
  group: string;
  version: string;
  kind: string;
}

/**
 * Convert a kind to its abbreviation for display
 */
export const kindToAbbr = (kind: string): string => {
  return (kind.replace(/[^A-Z]/g, '') || kind.toUpperCase()).slice(0, 4);
};

/**
 * Dynamically discover API resources and build a mapping of kinds to their GVKs.
 * This uses the Kubernetes API discovery mechanism to find all available resources.
 * @param resourceHints hints for resolving ambiguous resource kinds
 * @returns a Promise that resolves to an object mapping resource kinds to their GVK.
 */
export const getGroupVersionKindForKind = async (
  resourceHints: Record<string, string>,
): Promise<Record<string, GVK>> => {
  const mapping: Record<string, GVK> = {};

  // Helper to provide resource hinting where there could be resource ambiguity
  const updateMapping = (kind: string, group: string, version: string) => {
    if (resourceHints[kind]) {
      // Always override if the new group is the hinted group.
      if (group === resourceHints[kind]) {
        mapping[kind] = { group, version, kind };
      }
    } else if (!mapping[kind]) {
      mapping[kind] = { group, version, kind };
    }
  };

  // fetch core API resources
  try {
    const coreResp = await fetch('/api/kubernetes/api/v1');
    if (!coreResp.ok) {
      throw new Error(`Error fetching /api/kubernetes/api/v1: ${coreResp.statusText}`);
    }
    const coreData = await coreResp.json();
    if (Array.isArray(coreData.resources)) {
      coreData.resources.forEach((res: any) => {
        if (res.kind && !res.name?.includes('/')) {
          // core API resources have an empty group and are v1
          updateMapping(res.kind, '', 'v1');
        }
      });
    }
  } catch (error) {
    console.error('Error fetching core API resources:', error);
  }

  // aggregated API discovery data from /api/kubernetes/apis
  // https://github.com/kubernetes/enhancements/blob/master/keps/sig-api-machinery/3352-aggregated-discovery/README.md
  try {
    const aggregatedResp = await fetch('/api/kubernetes/apis', {
      headers: {
        Accept: 'application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList',
      },
    });
    if (!aggregatedResp.ok) {
      throw new Error(`Error fetching aggregated discovery: ${aggregatedResp.statusText}`);
    }
    const aggregatedData = await aggregatedResp.json();
    if (Array.isArray(aggregatedData.items)) {
      aggregatedData.items.forEach((groupItem: any) => {
        const groupName = groupItem.metadata?.name;
        if (groupItem.versions && Array.isArray(groupItem.versions)) {
          groupItem.versions.forEach((versionData: any) => {
            const version = versionData.version;
            if (versionData.resources && Array.isArray(versionData.resources)) {
              versionData.resources.forEach((resource: any) => {
                const kind = resource.responseKind?.kind || resource.kind;
                const resourceName = resource.resource || resource.name;
                if (kind && resourceName && !resourceName.includes('/')) {
                  updateMapping(kind, groupName, version);
                }
              });
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('Error fetching aggregated API discovery data:', error);
  }

  return mapping;
};
