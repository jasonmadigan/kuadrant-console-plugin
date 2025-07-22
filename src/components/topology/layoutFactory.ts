import { DagreLayout } from '@patternfly/react-topology';

/**
 * Factory function to create custom layout for the topology graph
 */
export const customLayoutFactory = (type: string, graph: any): any => {
  return new DagreLayout(graph, {
    rankdir: 'TB',
    nodesep: 20,
    ranksep: 0,
    nodeDistance: 80,
  });
};
