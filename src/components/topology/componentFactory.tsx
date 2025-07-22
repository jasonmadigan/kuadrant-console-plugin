import * as React from 'react';
import {
  ModelKind,
  GraphComponent,
  DefaultGroup,
  DefaultEdge,
  withPanZoom,
  withSelection,
  withContextMenu,
  ContextMenuItem,
} from '@patternfly/react-topology';
import { CustomNode } from './CustomNode';
import { PolicyConfig } from '../../utils/topology/topologyConstants';
import { getPolicyConfigsForResource } from '../../utils/topology/navigationUtils';

interface ComponentFactoryProps {
  goToResource: (resourceType: string, resourceName: string) => void;
  navigateToCreatePolicy: (policyType: string) => void;
  getDynamicResourceGVKMapping: () => Record<string, any>;
}

/**
 * Filter policy configs based on available GVK mappings
 */
const getFilteredPolicyConfigs = (
  resourceType: string,
  getDynamicResourceGVKMapping: () => Record<string, any>,
): PolicyConfig[] =>
  (getPolicyConfigsForResource(resourceType) || []).filter(
    (policy) => getDynamicResourceGVKMapping()[policy.key],
  );

/**
 * Create context menu items for a resource
 */
const createContextMenuItem = (
  resourceType: string,
  resourceName: string,
  goToResource: (resourceType: string, resourceName: string) => void,
  navigateToCreatePolicy: (policyType: string) => void,
  getDynamicResourceGVKMapping: () => Record<string, any>,
) => {
  const policyConfigs = getFilteredPolicyConfigs(resourceType, getDynamicResourceGVKMapping);
  return (
    <>
      <ContextMenuItem
        key="go-to-resource"
        onClick={() => goToResource(resourceType, resourceName)}
      >
        Go to Resource
      </ContextMenuItem>
      {policyConfigs.map((policy) => (
        <ContextMenuItem
          key={`create-${policy.key.toLowerCase()}`}
          onClick={() => navigateToCreatePolicy(policy.key)}
        >
          {policy.displayName}
        </ContextMenuItem>
      ))}
    </>
  );
};

/**
 * Factory function to create topology components
 */
export const createComponentFactory = ({
  goToResource,
  navigateToCreatePolicy,
  getDynamicResourceGVKMapping,
}: ComponentFactoryProps) => {
  const contextMenu = (element: any) => {
    const resourceType = element.getData().type;
    const resourceName = element.getLabel();
    return [
      createContextMenuItem(
        resourceType,
        resourceName,
        goToResource,
        navigateToCreatePolicy,
        getDynamicResourceGVKMapping,
      ),
    ];
  };

  return (kind: ModelKind, type: string) => {
    switch (type) {
      case 'group':
        return DefaultGroup;
      default:
        switch (kind) {
          case ModelKind.graph:
            return withPanZoom()(GraphComponent);
          case ModelKind.node:
            return withContextMenu(contextMenu)(CustomNode);
          case ModelKind.edge:
            return withSelection()(DefaultEdge);
          default:
            return undefined;
        }
    }
  };
};
