import { Visualization } from '@patternfly/react-topology';

interface GraphModel {
  nodes: any[];
  edges: any[];
  graph: {
    id: string;
    type: string;
    layout: string;
  };
}

/**
 * Creates initial model for the graph
 */
export const createInitialModel = (): GraphModel => ({
  nodes: [],
  edges: [],
  graph: {
    id: 'g1',
    type: 'graph',
    layout: 'Dagre',
  },
});

/**
 * Update graph with new model, handling initial load and filter changes
 */
export const updateGraph = (
  controller: Visualization,
  nodes: any[],
  edges: any[],
  isInitialLoad: boolean,
  filterChanged: boolean,
) => {
  const newModel: GraphModel = {
    nodes,
    edges,
    graph: {
      id: 'g1',
      type: 'graph',
      layout: 'Dagre',
    },
  };

  if (isInitialLoad && nodes.length > 0) {
    // First load
    controller.fromModel(newModel, false);
    controller.getGraph().layout();

    // Fit to screen after layout
    setTimeout(() => {
      controller.getGraph().fit(80);
    }, 100);
  } else if (!isInitialLoad && nodes.length > 0) {
    // Updates
    if (filterChanged) {
      // Filter changed - refit
      controller.fromModel(newModel, false);
      controller.getGraph().layout();

      setTimeout(() => {
        controller.getGraph().fit(80);
      }, 100);
    } else {
      // Preserve zoom/pan
      const currentScale = controller.getGraph().getScale();
      const currentPosition = controller.getGraph().getPosition();

      controller.fromModel(newModel, false);
      controller.getGraph().layout();

      controller.getGraph().setScale(currentScale);
      controller.getGraph().setPosition(currentPosition);
    }
  } else {
    // No nodes yet
    controller.fromModel(newModel, false);
  }
};
