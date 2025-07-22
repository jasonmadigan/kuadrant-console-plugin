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
  getDynamicResourceGVKMapping: () => Record<string, any>,
): Visualization | null => {
  const [controller, setController] = React.useState<Visualization | null>(null);
  const isInitialized = React.useRef(false);

  React.useEffect(() => {
    if (!isInitialized.current) {
      const initialModel = createInitialModel();
      const visualization = new Visualization();
      const componentFactory = createComponentFactory({
        goToResource,
        navigateToCreatePolicy,
        getDynamicResourceGVKMapping,
      });
      visualization.registerLayoutFactory(customLayoutFactory);
      visualization.registerComponentFactory(componentFactory);
      visualization.fromModel(initialModel, false);
      setController(visualization);
      isInitialized.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (isInitialized.current) {
        setController(null);
        isInitialized.current = false;
      }
    };
  }, []);

  return controller;
};
