/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import Helmet from 'react-helmet';
import {
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  Content,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarItem,
  Badge,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
} from '@patternfly/react-core';
import {
  useK8sWatchResource,
  useAccessReview,
  K8sVerb,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  DagreLayout,
  DefaultEdge,
  DefaultNode,
  ModelKind,
  GraphComponent,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  withPanZoom,
  withSelection,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  withContextMenu,
  ContextMenuItem,
  action,
  DefaultGroup,
} from '@patternfly/react-topology';
import { useTranslation } from 'react-i18next';

import { CubesIcon, CloudUploadAltIcon, TopologyIcon, RouteIcon } from '@patternfly/react-icons';

import './kuadrant.css';
import NoPermissionsView from './NoPermissionsView';

import { showByDefault, resourceHints, PolicyConfig } from '../utils/topology/topologyConstants';
import { GVK, getGroupVersionKindForKind } from '../utils/topology/topologyUtils';
import {
  createGoToResource,
  createNavigateToCreatePolicy,
  getPolicyConfigsForResource,
} from '../utils/topology/navigationUtils';
import { parseDotToModel, preserveTransitiveEdges } from '../utils/topology/graphParser';

let dynamicResourceGVKMapping: Record<string, GVK> = {};

// Fetch the config.js file dynamically at runtime
// Normally served from <cluster-host>/api/plugins/kuadrant-console/config.js
const fetchConfig = async () => {
  const defaultConfig = {
    TOPOLOGY_CONFIGMAP_NAME: 'topology',
    TOPOLOGY_CONFIGMAP_NAMESPACE: 'kuadrant-system',
  };

  try {
    const response = await fetch('/api/plugins/kuadrant-console-plugin/config.js');
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('config.js not found (running locally perhaps). Falling back to defaults.');
      } else {
        throw new Error(`Failed to fetch config.js: ${response.statusText}`);
      }
      return defaultConfig; // Fallback on 404
    }

    const script = await response.text();

    const configScript = document.createElement('script');
    configScript.innerHTML = script;
    document.head.appendChild(configScript);

    return (window as any).kuadrant_config || defaultConfig;
  } catch (error) {
    console.error('Error loading config.js:', error);
    return defaultConfig;
  }
};

// Custom node renderer
const CustomNode: React.FC<any> = ({
  element,
  onSelect,
  selected,
  onContextMenu,
  contextMenuOpen,
}) => {
  // Disable the context menu for these 'meta-kinds'
  const disabledContextMenuTypes = ['GatewayClass', 'HTTPRouteRule', 'Listener'];
  const data = element.getData();
  const { type, badge, badgeColor } = data;

  const isPolicyNode = ['TLSPolicy', 'DNSPolicy', 'AuthPolicy', 'RateLimitPolicy'].includes(type);

  let IconComponent;
  switch (type) {
    case 'Gateway':
      IconComponent = CubesIcon;
      break;
    case 'HTTPRoute':
      IconComponent = RouteIcon;
      break;
    case 'TLSPolicy':
    case 'DNSPolicy':
      IconComponent = CloudUploadAltIcon;
      break;
    case 'ConfigMap':
    case 'Listener':
      IconComponent = TopologyIcon;
      break;
    case 'GatewayClass':
      IconComponent = CubesIcon;
      break;
    case 'HttpRouteRule':
      IconComponent = RouteIcon;
      break;
    default:
      IconComponent = TopologyIcon;
      break;
  }

  const iconSize = 35;
  const paddingTop = 5;
  const paddingBottom = 15;
  const nodeHeight = element.getBounds().height;
  const nodeWidth = element.getBounds().width;

  return (
    <DefaultNode
      element={element}
      showStatusDecorator
      badge={badge}
      badgeColor={badgeColor}
      badgeTextColor="#fff"
      onSelect={onSelect}
      selected={selected}
      className={isPolicyNode ? 'policy-node' : ''}
      // Disable context menu for specified types
      onContextMenu={!disabledContextMenuTypes.includes(type) ? onContextMenu : undefined}
      contextMenuOpen={!disabledContextMenuTypes.includes(type) && contextMenuOpen}
    >
      <g transform={`translate(${nodeWidth / 2}, ${paddingTop})`}>
        <foreignObject width={iconSize} height={iconSize} x={-iconSize / 2}>
          <IconComponent
            className="kuadrant-topology-node-icon"
            style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
          />
        </foreignObject>
      </g>
      <g transform={`translate(${nodeWidth / 2}, ${nodeHeight - paddingBottom})`}>
        <text
          className="kuadrant-topology-type-text"
          style={{
            fontWeight: 'bold',
            fontSize: '12px',
            textAnchor: 'middle',
          }}
          dominantBaseline="central"
        >
          {type}
        </text>
      </g>
    </DefaultNode>
  );
};

const goToResource = createGoToResource(dynamicResourceGVKMapping);

const customLayoutFactory = (type: string, graph: any): any => {
  return new DagreLayout(graph, {
    rankdir: 'TB',
    nodesep: 20,
    ranksep: 0,
    nodeDistance: 80,
  });
};

const navigateToCreatePolicy = createNavigateToCreatePolicy(dynamicResourceGVKMapping);

// Filter policy configs based on available GVK mappings
const getFilteredPolicyConfigs = (resourceType: string): PolicyConfig[] =>
  (getPolicyConfigsForResource(resourceType) || []).filter(
    (policy) => dynamicResourceGVKMapping[policy.key],
  );

const customComponentFactory = (kind: ModelKind, type: string) => {
  const contextMenuItem = (resourceType: string, resourceName: string) => {
    const policyConfigs = getFilteredPolicyConfigs(resourceType);
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

  const contextMenu = (element: any) => {
    const resourceType = element.getData().type;
    const resourceName = element.getLabel();
    return [contextMenuItem(resourceType, resourceName)];
  };

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

const PolicyTopologyPage: React.FC = () => {
  const [config, setConfig] = React.useState<any | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  // dynamically generated list of all resource types from the parsed DOT file
  const [allResourceTypes, setAllResourceTypes] = React.useState<string[]>([]);
  // Resource filter state. On initial render, show only resources in showByDefault
  const [selectedResourceTypes, setSelectedResourceTypes] = React.useState<string[]>([]);
  const [isResourceFilterOpen, setIsResourceFilterOpen] = React.useState(false);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  const onResourceSelect = (
    _event: React.MouseEvent | React.ChangeEvent | undefined,
    selection: string,
  ) => {
    // Toggle selection: remove if already selected, add if not
    if (selectedResourceTypes.includes(selection)) {
      setSelectedResourceTypes(selectedResourceTypes.filter((r) => r !== selection));
    } else {
      setSelectedResourceTypes([...selectedResourceTypes, selection]);
    }
  };

  const onDeleteResourceFilter = (_category: string, chip: string) => {
    if (chip) {
      setSelectedResourceTypes(selectedResourceTypes.filter((r) => r !== chip));
    }
  };

  const onDeleteResourceGroup = () => {
    setSelectedResourceTypes([]);
  };

  const clearAllFilters = () => {
    setSelectedResourceTypes([]);
  };

  // Fetch configuration on mount
  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const configData = await fetchConfig();
        setConfig(configData);
      } catch (error) {
        console.error('Error loading config.js:', error);
        setParseError('Failed to load configuration.');
      }
    };
    loadConfig();
  }, []);

  React.useEffect(() => {
    getGroupVersionKindForKind(resourceHints)
      .then((mapping) => {
        dynamicResourceGVKMapping = mapping; // used in goToResource
        console.debug('Prewarmed API resource mapping:', mapping);
      })
      .catch((err) => {
        console.error('Error prewarming API resource mapping:', err);
      });
  }, []);

  // Watch the ConfigMap named "topology" in the namespace provided by the config.js
  const [configMap, loaded, loadError] = useK8sWatchResource<any>(
    config
      ? {
          groupVersionKind: {
            version: 'v1',
            kind: 'ConfigMap',
          },
          name: config.TOPOLOGY_CONFIGMAP_NAME,
          namespace: config.TOPOLOGY_CONFIGMAP_NAMESPACE,
        }
      : null, // Only watch if config is loaded
  );

  const controllerRef = React.useRef<Visualization | null>(null);

  React.useEffect(() => {
    if (!controllerRef.current) {
      const initialModel = {
        nodes: [],
        edges: [],
        graph: {
          id: 'g1',
          type: 'graph',
          layout: 'Dagre',
        },
      };

      const visualization = new Visualization();
      visualization.registerLayoutFactory(customLayoutFactory);
      visualization.registerComponentFactory(customComponentFactory);
      visualization.fromModel(initialModel, false);
      controllerRef.current = visualization;
    }

    // Cleanup on unmount
    return () => {
      controllerRef.current = null;
    };
  }, []);

  // track previous filter selections
  const prevSelectedResourceTypesRef = React.useRef<string[]>([]);

  // Handle data updates
  React.useEffect(() => {
    if (loaded && !loadError && configMap) {
      const dotString = configMap.data?.topology || '';
      if (dotString) {
        try {
          const { nodes, edges } = parseDotToModel(dotString);
          setParseError(null);

          // Separate group nodes from normal nodes
          const groupNodes = nodes.filter((n) => n.type === 'group');
          const normalNodes = nodes.filter((n) => n.type !== 'group');

          // Dynamically generate the list of resource types
          const uniqueTypes = Array.from(
            new Set(normalNodes.map((node) => node.resourceType)),
          ).sort();
          setAllResourceTypes(uniqueTypes);

          // If the user has not yet set any filter, default to those in the showByDefault set
          let newSelected = selectedResourceTypes.filter((r) => uniqueTypes.includes(r));
          if (selectedResourceTypes.length === 0 && isInitialLoad) {
            newSelected = uniqueTypes.filter((t) => showByDefault.has(t));
            setSelectedResourceTypes(newSelected);
          }

          // Filter nodes by the selected resource types
          const filteredNormalNodes = normalNodes.filter((n) =>
            newSelected.includes(n.resourceType),
          );

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

          // check if filter changed
          const filterChanged =
            JSON.stringify([...prevSelectedResourceTypesRef.current].sort()) !==
            JSON.stringify([...selectedResourceTypes].sort());

          if (controllerRef.current) {
            const newModel = {
              nodes: finalNodes,
              edges: filteredEdges,
              graph: {
                id: 'g1',
                type: 'graph',
                layout: 'Dagre',
              },
            };

            if (isInitialLoad && finalNodes.length > 0) {
              // first load
              controllerRef.current.fromModel(newModel, false);
              controllerRef.current.getGraph().layout();

              // fit to screen after layout
              setTimeout(() => {
                if (controllerRef.current) {
                  controllerRef.current.getGraph().fit(80);
                }
              }, 100);
              setIsInitialLoad(false);
            } else if (!isInitialLoad && finalNodes.length > 0) {
              // updates
              if (filterChanged) {
                // filter changed - refit
                controllerRef.current.fromModel(newModel, false);
                controllerRef.current.getGraph().layout();

                setTimeout(() => {
                  if (controllerRef.current) {
                    controllerRef.current.getGraph().fit(80);
                  }
                }, 100);
              } else {
                // preserve zoom/pan
                const currentScale = controllerRef.current.getGraph().getScale();
                const currentPosition = controllerRef.current.getGraph().getPosition();

                controllerRef.current.fromModel(newModel, false);
                controllerRef.current.getGraph().layout();

                controllerRef.current.getGraph().setScale(currentScale);
                controllerRef.current.getGraph().setPosition(currentPosition);
              }
            } else {
              // no nodes yet
              controllerRef.current.fromModel(newModel, false);
            }
          }

          prevSelectedResourceTypesRef.current = [...selectedResourceTypes];
        } catch (error) {
          setParseError('Failed to parse topology data.');
          console.error(error, dotString);
        }
      }
    } else if (loadError) {
      setParseError('Failed to load topology data.');
    }
  }, [configMap, loaded, loadError, selectedResourceTypes]);

  const accessReviewProps = React.useMemo(() => {
    return config
      ? {
          group: '',
          resource: 'ConfigMap',
          verb: 'read' as K8sVerb,
          namespace: config.TOPOLOGY_CONFIGMAP_NAMESPACE,
          name: config.TOPOLOGY_CONFIGMAP_NAME,
        }
      : {
          // fallback
          group: '',
          resource: '',
          verb: 'read' as K8sVerb,
          namespace: '',
          name: '',
        };
  }, [config]);

  const [canReadTopology, isLoadingPermissions] = useAccessReview(accessReviewProps);

  if (!config) {
    return <div>{t('Loading configuration...')}</div>;
  }

  if (isLoadingPermissions) {
    return <div>{t('Loading Permissions...')}</div>;
  }

  if (!canReadTopology) {
    return (
      <NoPermissionsView
        primaryMessage={t('You do not have permission to view Policy Topology')}
        secondaryMessage={
          <>
            {t('Specifically, you do not have permission to read the ConfigMap ')}
            <strong>{config.TOPOLOGY_CONFIGMAP_NAME}</strong> {t('in the namespace ')}
            <strong>{config.TOPOLOGY_CONFIGMAP_NAMESPACE}</strong>
          </>
        }
      />
    );
  }

  const controller = controllerRef.current;

  return (
    <>
      <Helmet>
        <title>{t('Policy Topology')}</title>
      </Helmet>
      <PageSection>
        <Title headingLevel="h1">{t('Policy Topology')}</Title>
        <Card>
          <CardTitle>{t('Topology View')}</CardTitle>
          <CardBody>
            <Content>
              <Content component="p" className="pf-u-mb-md">
                {t(
                  'This view visualizes the relationships and interactions between different resources within your cluster related to Kuadrant, allowing you to explore connections between Gateways, HTTPRoutes and Kuadrant Policies.',
                )}
              </Content>
            </Content>
            <Toolbar
              id="resource-filter-toolbar"
              className="pf-m-toggle-group-container"
              collapseListedFiltersBreakpoint="xl"
              clearAllFilters={clearAllFilters}
              clearFiltersButtonText={t('Reset Filters')}
            >
              <ToolbarContent>
                <ToolbarItem variant="label-group">
                  <ToolbarFilter
                    categoryName="Resource"
                    labels={selectedResourceTypes}
                    deleteLabel={onDeleteResourceFilter}
                    deleteLabelGroup={onDeleteResourceGroup}
                  >
                    <Select
                      aria-label="Resource filter"
                      role="menu"
                      isOpen={isResourceFilterOpen}
                      onOpenChange={(isOpen) => setIsResourceFilterOpen(isOpen)}
                      onSelect={onResourceSelect}
                      selected={selectedResourceTypes}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() => setIsResourceFilterOpen(!isResourceFilterOpen)}
                          isExpanded={isResourceFilterOpen}
                        >
                          Resource{' '}
                          {selectedResourceTypes.length > 0 && (
                            <Badge isRead>{selectedResourceTypes.length}</Badge>
                          )}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {allResourceTypes.map((type) => (
                          <SelectOption
                            key={type}
                            value={type}
                            hasCheckbox
                            isSelected={selectedResourceTypes.includes(type)}
                          >
                            {type}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  </ToolbarFilter>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
            {!loaded ? (
              <div>{t('Loading topology...')}</div>
            ) : loadError ? (
              <div>
                {t('Error loading topology:')} {loadError.message}
              </div>
            ) : parseError ? (
              <div>
                {t('Error parsing topology:')} {parseError}
              </div>
            ) : (
              controller && (
                <TopologyView
                  style={{ height: '70vh' }}
                  className="kuadrant-policy-topology"
                  controlBar={
                    <TopologyControlBar
                      controlButtons={createTopologyControlButtons({
                        ...defaultControlButtonsOptions,
                        resetView: false,
                        zoomInCallback: action(() => {
                          controller.getGraph().scaleBy(4 / 3);
                        }),
                        zoomOutCallback: action(() => {
                          controller.getGraph().scaleBy(0.75);
                        }),
                        fitToScreenCallback: action(() => {
                          controller.getGraph().fit(80);
                        }),
                        legend: false,
                      })}
                    />
                  }
                >
                  <VisualizationProvider controller={controller}>
                    <VisualizationSurface />
                  </VisualizationProvider>
                </TopologyView>
              )
            )}
          </CardBody>
        </Card>
      </PageSection>
    </>
  );
};

export default PolicyTopologyPage;
