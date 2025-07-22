import * as React from 'react';
import { Visualization } from '@patternfly/react-topology';
import { createComponentFactory } from '../components/topology/componentFactory';
import { customLayoutFactory } from '../components/topology/layoutFactory';
import { createInitialModel } from '../utils/topology/graphManager';

/**
 * Custom hook to manage the visualization controller
 */
export const useVisualizationController = (
  goToResource: (resourceType: string, resourceName: string) => void,
  navigateToCreatePolicy: (policyType: string) => void,
  dynamicResourceGVKMapping: Record<string, any>,
): Visualization | null => {
  const controllerRef = React.useRef<Visualization | null>(null);

  React.useEffect(() => {
    if (!controllerRef.current) {
      const initialModel = createInitialModel();
      const visualization = new Visualization();
      const componentFactory = createComponentFactory({
        goToResource,
        navigateToCreatePolicy,
        dynamicResourceGVKMapping,
      });
      visualization.registerLayoutFactory(customLayoutFactory);
      visualization.registerComponentFactory(componentFactory);
      visualization.fromModel(initialModel, false);
      controllerRef.current = visualization;
    }

    // Cleanup on unmount
    return () => {
      controllerRef.current = null;
    };
  }, [goToResource, navigateToCreatePolicy, dynamicResourceGVKMapping]);

  return controllerRef.current;
};
