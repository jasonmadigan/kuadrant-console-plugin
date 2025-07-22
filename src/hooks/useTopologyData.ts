import * as React from 'react';
import { parseDotToModel, preserveTransitiveEdges } from '../utils/topology/graphParser';
import { showByDefault } from '../utils/topology/topologyConstants';

interface ProcessedTopologyData {
  finalNodes: any[];
  filteredEdges: any[];
  allResourceTypes: string[];
  filterChanged: boolean;
}

/**
 * Custom hook to process topology data from ConfigMap
 */
export const useTopologyData = (
  configMap: any,
  loaded: boolean,
  loadError: any,
  selectedResourceTypes: string[],
  setSelectedResourceTypes: (types: string[]) => void,
  isInitialLoad: boolean,
  setParseError: (error: string | null) => void,
  setAllResourceTypes: (types: string[]) => void,
): ProcessedTopologyData | null => {
  const prevSelectedResourceTypesRef = React.useRef<string[]>([]);

  return React.useMemo(() => {
    if (!loaded || loadError || !configMap) {
      if (loadError) {
        setParseError('Failed to load topology data.');
      }
      return null;
    }

    const dotString = configMap.data?.topology || '';
    if (!dotString) {
      return null;
    }

    try {
      const { nodes, edges } = parseDotToModel(dotString);
      setParseError(null);

      // Separate group nodes from normal nodes
      const groupNodes = nodes.filter((n) => n.type === 'group');
      const normalNodes = nodes.filter((n) => n.type !== 'group');

      // Dynamically generate the list of resource types
      const uniqueTypes = Array.from(new Set(normalNodes.map((node) => node.resourceType))).sort();
      setAllResourceTypes(uniqueTypes);

      // If the user has not yet set any filter, default to those in the showByDefault set
      let newSelected = selectedResourceTypes.filter((r) => uniqueTypes.includes(r));
      if (selectedResourceTypes.length === 0 && isInitialLoad) {
        newSelected = uniqueTypes.filter((t) => showByDefault.has(t));
        setSelectedResourceTypes(newSelected);
      }

      // Filter nodes by the selected resource types
      const filteredNormalNodes = normalNodes.filter((n) => newSelected.includes(n.resourceType));

      // For each group, only keep children that are in the filtered nodes
      const keptNormalNodeIds = new Set(filteredNormalNodes.map((n) => n.id));
      const updatedGroups = groupNodes.map((g) => {
        const validChildren = g.children?.filter((childId: string) =>
          keptNormalNodeIds.has(childId),
        );
        return {
          ...g,
          children: validChildren,
        };
      });
      const filteredGroups = updatedGroups.filter((g) => g.children?.length > 0);

      const finalNodes = [...filteredNormalNodes, ...filteredGroups];

      // Filter edges to include transitive connections
      const validNodeIds = new Set(finalNodes.map((n) => n.id));
      const filteredEdges = preserveTransitiveEdges(nodes, edges, validNodeIds);

      // Check if filter changed
      const filterChanged =
        JSON.stringify([...prevSelectedResourceTypesRef.current].sort()) !==
        JSON.stringify([...selectedResourceTypes].sort());

      prevSelectedResourceTypesRef.current = [...selectedResourceTypes];

      return {
        finalNodes,
        filteredEdges,
        allResourceTypes: uniqueTypes,
        filterChanged,
      };
    } catch (error) {
      setParseError('Failed to parse topology data.');
      console.error(error, dotString);
      return null;
    }
  }, [
    configMap,
    loaded,
    loadError,
    selectedResourceTypes,
    isInitialLoad,
    setSelectedResourceTypes,
    setParseError,
    setAllResourceTypes,
  ]);
};
