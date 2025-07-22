import * as dot from 'graphlib-dot';
import {
  EdgeStyle,
  EdgeAnimationSpeed,
  LabelPosition,
  NodeShape,
} from '@patternfly/react-topology';
import {
  shapeMapping,
  unassociatedPolicies,
  kuadrantInternals,
  transitiveNodeTypes,
} from './topologyConstants';
import { kindToAbbr } from './topologyUtils';

interface ParsedGraph {
  nodes: any[];
  edges: any[];
}

/**
 * Add an edge to the graph
 */
const addEdge = (
  edges: any[],
  connectedNodeIds: Set<string>,
  source: string,
  target: string,
  type: string,
) => {
  edges.push({
    id: `edge-${source}-${target}`,
    type: 'edge',
    source,
    target,
    edgeStyle: type === 'policy' ? EdgeStyle.dashedMd : EdgeStyle.default,
    animationSpeed: type === 'policy' ? EdgeAnimationSpeed.medium : undefined,
    style: { strokeWidth: 2, stroke: '#393F44' },
  });
  connectedNodeIds.add(source);
  connectedNodeIds.add(target);
};

/**
 * Create a group node
 */
const createGroup = (id: string, children: any[], label: string) => ({
  id,
  children: children.map((node) => node.id),
  type: 'group',
  group: true,
  label,
  style: { padding: 40 },
});

/**
 * Preserve transitive connections when intermediate nodes are filtered out
 */
export const preserveTransitiveEdges = (
  allNodes: any[],
  allEdges: any[],
  keptNodeIds: Set<string>,
): any[] => {
  const edgesBySource = new Map<string, any[]>();
  const edgesByTarget = new Map<string, any[]>();

  // Build edge lookup maps
  allEdges.forEach((edge) => {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }
    edgesBySource.get(edge.source)?.push(edge);

    if (!edgesByTarget.has(edge.target)) {
      edgesByTarget.set(edge.target, []);
    }
    edgesByTarget.get(edge.target)?.push(edge);
  });

  const resultEdges: any[] = [];
  const processedEdges = new Set<string>();

  // For each filtered-out node, create transitive edges
  allNodes.forEach((node) => {
    if (!keptNodeIds.has(node.id) && transitiveNodeTypes.has(node.resourceType)) {
      // This node is being filtered out and is a type we want to preserve connections for
      const incomingEdges = edgesByTarget.get(node.id) || [];
      const outgoingEdges = edgesBySource.get(node.id) || [];

      // Create transitive edges from all predecessors to all successors
      incomingEdges.forEach((inEdge) => {
        outgoingEdges.forEach((outEdge) => {
          if (keptNodeIds.has(inEdge.source) && keptNodeIds.has(outEdge.target)) {
            const edgeKey = `${inEdge.source}-${outEdge.target}`;
            if (!processedEdges.has(edgeKey)) {
              processedEdges.add(edgeKey);
              resultEdges.push({
                id: `edge-${inEdge.source}-${outEdge.target}`,
                type: 'edge',
                source: inEdge.source,
                target: outEdge.target,
                edgeStyle: EdgeStyle.default,
                style: { strokeWidth: 2, stroke: '#393F44' },
              });
            }
          }
        });
      });
    }
  });

  // Add original edges between kept nodes
  allEdges.forEach((edge) => {
    if (keptNodeIds.has(edge.source) && keptNodeIds.has(edge.target)) {
      const edgeKey = `${edge.source}-${edge.target}`;
      if (!processedEdges.has(edgeKey)) {
        processedEdges.add(edgeKey);
        resultEdges.push(edge);
      }
    }
  });

  return resultEdges;
};

/**
 * Convert DOT graph to PatternFly node/edge models
 */
export const parseDotToModel = (dotString: string): ParsedGraph => {
  try {
    const graph = dot.read(dotString);
    const nodes: any[] = [];
    const edges: any[] = [];
    const groups: any[] = [];
    const connectedNodeIds = new Set<string>();

    // Process edges: add each edge directly
    graph
      .edges()
      .forEach(({ v: sourceNodeId, w: targetNodeId }: { v: string; w: string }) =>
        addEdge(edges, connectedNodeIds, sourceNodeId, targetNodeId, 'default'),
      );

    // Create nodes
    graph.nodes().forEach((nodeId: string) => {
      const nodeData = graph.node(nodeId);
      const [resourceType, resourceName] = nodeData.label.split('\\n');
      nodes.push({
        id: nodeId,
        type: 'node',
        label: resourceName,
        resourceType,
        width: 120,
        height: 65,
        labelPosition: LabelPosition.bottom,
        shape: shapeMapping[resourceType] || NodeShape.rect,
        data: {
          label: resourceName,
          type: resourceType,
          badge: kindToAbbr(resourceType),
          badgeColor: '#2b9af3',
        },
      });
    });

    // Group unassociated policies
    const unassociatedPolicyNodes = nodes.filter(
      (node) => !connectedNodeIds.has(node.id) && unassociatedPolicies.has(node.resourceType),
    );
    if (unassociatedPolicyNodes.length) {
      groups.push(createGroup('group-unattached', unassociatedPolicyNodes, 'Unattached Policies'));
    }

    // Group Kuadrant internals
    const kuadrantInternalNodes = nodes.filter((node) => kuadrantInternals.has(node.resourceType));
    if (kuadrantInternalNodes.length) {
      groups.push(
        createGroup('group-kuadrant-internals', kuadrantInternalNodes, 'Kuadrant Internals'),
      );
    }

    // Filter out any remaining edges with missing nodes
    const nodeIds = new Set(nodes.map((node) => node.id));
    const validEdges = edges.filter(
      ({ source, target }) => nodeIds.has(source) && nodeIds.has(target),
    );

    return { nodes: [...nodes, ...groups], edges: validEdges };
  } catch (error) {
    console.error('Error parsing DOT string:', error);
    throw error;
  }
};
