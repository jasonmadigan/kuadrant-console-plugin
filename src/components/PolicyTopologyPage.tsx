import * as React from 'react';
import Helmet from 'react-helmet';
import {
  Page,
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  TextContent,
  Text,
  Select,
  SelectOption,
  Button,
} from '@patternfly/react-core';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  DagreLayout,
  DefaultEdge,
  DefaultNode,
  ModelKind,
  GraphComponent,
  NodeShape,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  withPanZoom,
  withSelection,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  LabelPosition,
  EdgeStyle,
  EdgeAnimationSpeed,
  withContextMenu,
  ContextMenuItem,
  action,
  DefaultGroup,
} from '@patternfly/react-topology';

import { CubesIcon, CloudUploadAltIcon, TopologyIcon, RouteIcon } from '@patternfly/react-icons';
import * as dot from 'graphlib-dot';
import './kuadrant.css';
import resourceGVKMapping from '../utils/latest';

interface ConfigMap {
  metadata: {
    name: string;
    namespace: string;
    labels?: {
      [key: string]: string;
    };
  };
  data: {
    topology?: string;
    [key: string]: any;
  };
}

// Fetch the config.js file dynamically at runtime
// Normally served from <cluster-host>/api/plugins/kuadrant-console/config.js
const fetchConfig = async () => {
  const defaultConfig = {
    TOPOLOGY_CONFIGMAP_NAME: 'topology',
    TOPOLOGY_CONFIGMAP_NAMESPACE: 'kuadrant-system',
  };

  try {
    const response = await fetch('/api/plugins/kuadrant-console/config.js');
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

export const kindToAbbr = (kind: string) => {
  return (kind.replace(/[^A-Z]/g, '') || kind.toUpperCase()).slice(0, 4);
};

// Convert DOT graph to PatternFly node/edge models
const parseDotToModel = (dotString: string): { nodes: any[]; edges: any[] } => {
  try {
    const graph = dot.read(dotString);
    const nodes: any[] = [];
    const edges: any[] = [];
    const groups: any[] = [];
    const connectedNodeIds = new Set<string>();

    const shapeMapping: { [key: string]: NodeShape } = {
      Gateway: NodeShape.rect,
      HTTPRoute: NodeShape.rect,
      TLSPolicy: NodeShape.rect,
      DNSPolicy: NodeShape.rect,
      AuthPolicy: NodeShape.rect,
      RateLimitPolicy: NodeShape.rect,
      ConfigMap: NodeShape.ellipse,
      Listener: NodeShape.rect,
      Kuadrant: NodeShape.ellipse,
    };

    // Excluded kinds that will be rewired if connected to other nodes
    const excludedKinds = new Set([
      'Issuer',
      'ClusterIssuer',
      'Certificate',
      'WasmPlugin',
      'AuthorizationPolicy',
      'EnvoyFilter',
      'GatewayClass',
      'DNSRecord',
      'AuthConfig',
    ]);

    // Kinds for unassociated policies - these will be grouped
    const unassociatedPolicies = new Set([
      'TLSPolicy',
      'DNSPolicy',
      'AuthPolicy',
      'RateLimitPolicy',
    ]);

    // Kinds for Kuadrant internals - these will be grouped also
    const kuadrantInternals = new Set([
      'ConfigMap',
      'Kuadrant',
      'Limitador',
      'Authorino',
      'ConsolePlugin',
    ]);

    // Reconnect edges for excluded, connected nodes (e.g., GatewayClass)
    const rewireExcludedEdges = (graph, sourceNodeId, targetNodeId) => {
      const sourceNode = graph.node(sourceNodeId);
      const targetNode = graph.node(targetNodeId);

      if (!sourceNode || !targetNode) return;

      if (excludedKinds.has(sourceNode.type)) {
        rewireNode(sourceNodeId, targetNodeId, 'source');
      } else if (excludedKinds.has(targetNode.type)) {
        rewireNode(sourceNodeId, targetNodeId, 'target');
      } else {
        addEdge(sourceNodeId, targetNodeId, sourceNode.type);
      }
    };

    const rewireNode = (excludedId, connectedId, position) => {
      const connections =
        position === 'source' ? graph.successors(excludedId) : graph.predecessors(excludedId);
      connections?.forEach((node) => {
        addEdge(connectedId, node, 'default');
        connectedNodeIds.add(node);
      });
    };

    const addEdge = (source, target, type) => {
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

    // Process edges with excluded kinds reconnected
    graph
      .edges()
      .forEach(({ v: sourceNodeId, w: targetNodeId }) =>
        rewireExcludedEdges(graph, sourceNodeId, targetNodeId),
      );

    // Create nodes while excluding specified kinds
    graph.nodes().forEach((nodeId) => {
      const nodeData = graph.node(nodeId);
      const [resourceType, resourceName] = nodeData.label.split('\\n');

      if (!excludedKinds.has(resourceType)) {
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
      }
    });

    const addGroup = (id, children, label) => {
      groups.push({
        id,
        children: children.map((node) => node.id),
        type: 'group',
        group: true,
        label,
        style: { padding: 40 },
      });
    };

    // Group unassociated policies and Kuadrant resources
    const unassociatedPolicyNodes = nodes.filter(
      (node) => !connectedNodeIds.has(node.id) && unassociatedPolicies.has(node.resourceType),
    );
    if (unassociatedPolicyNodes.length)
      addGroup('group-unattached', unassociatedPolicyNodes, 'Unattached Policies');

    const kuadrantInternalNodes = nodes.filter((node) => kuadrantInternals.has(node.resourceType));
    if (kuadrantInternalNodes.length)
      addGroup('group-kuadrant-internals', kuadrantInternalNodes, 'Kuadrant Internals');

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

const CustomNode: React.FC<any> = ({
  element,
  onSelect,
  selected,
  onContextMenu,
  contextMenuOpen,
}) => {
  const excludedKinds = ['GatewayClass', 'HTTPRouteRule', 'Listener'];
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
      // Disable context menu for excluded kinds
      onContextMenu={!excludedKinds.includes(type) ? onContextMenu : undefined}
      contextMenuOpen={!excludedKinds.includes(type) && contextMenuOpen}
    >
      <g transform={`translate(${nodeWidth / 2}, ${paddingTop})`}>
        <foreignObject width={iconSize} height={iconSize} x={-iconSize / 2}>
          <IconComponent
            style={{ color: '#393F44', width: `${iconSize}px`, height: `${iconSize}px` }}
          />
        </foreignObject>
      </g>
      <g transform={`translate(${nodeWidth / 2}, ${nodeHeight - paddingBottom})`}>
        <text
          className="kuadrant-topology-type-text"
          style={{
            fontWeight: 'bold',
            fontSize: '12px',
            fill: '#000',
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

const goToResource = (resourceType: string, resourceName: string) => {
  let finalResourceType = resourceType;
  let finalGVK = resourceGVKMapping[resourceType];

  // Special case - Listener should go to associated Gateway
  if (resourceType === 'Listener') {
    finalResourceType = 'Gateway';
    finalGVK = resourceGVKMapping[finalResourceType];
  }

  const [namespace, name] = resourceName.includes('/')
    ? resourceName.split('/')
    : [null, resourceName];

  if (!finalGVK) {
    console.error(`GVK mapping not found for resource type: ${finalResourceType}`);
    return;
  }

  const url = namespace
    ? `/k8s/ns/${namespace}/${finalGVK.group}~${finalGVK.version}~${finalGVK.kind}/${name}`
    : `/k8s/cluster/${finalGVK.group}~${finalGVK.version}~${finalGVK.kind}/${name}`;

  window.location.href = url;
};

const customLayoutFactory = (type: string, graph: any): any => {
  return new DagreLayout(graph, {
    rankdir: 'TB',
    nodesep: 20,
    ranksep: 0,
    nodeDistance: 80,
  });
};

const customComponentFactory = (kind: ModelKind, type: string) => {
  const contextMenuItem = (resourceType: string, resourceName: string) => (
    <ContextMenuItem key="go-to-resource" onClick={() => goToResource(resourceType, resourceName)}>
      Go to Resource
    </ContextMenuItem>
  );

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

  // state for ConfigMap selection
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [selectedConfigMap, setSelectedConfigMap] = React.useState<string | undefined>(undefined);

  // Fetch the configuration on mount
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

  // Watch a list of ConfigMaps with label kuadrant.io/topology: "true"
  const [configMapList, loadedList, loadErrorList] = useK8sWatchResource<ConfigMap[]>({
    groupVersionKind: {
      group: '',
      version: 'v1',
      kind: 'ConfigMap',
    },
    namespace: config ? config.TOPOLOGY_CONFIGMAP_NAMESPACE : 'kuadrant-system', // Default namespace
    namespaced: true,
    selector: {
      matchLabels: {
        'kuadrant.io/topology': 'true',
      },
    },
    isList: true,
  });

  // Watch the selected ConfigMap
  const [selectedConfigMapData, loadedSelected, loadErrorSelected] = useK8sWatchResource<ConfigMap>(
    selectedConfigMap
      ? {
          groupVersionKind: {
            group: '',
            version: 'v1',
            kind: 'ConfigMap',
          },
          name: selectedConfigMap,
          namespace: config ? config.TOPOLOGY_CONFIGMAP_NAMESPACE : 'kuadrant-system',
        }
      : null, // Only watch if a ConfigMap is picked
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

  // Update the topology if the selected ConfigMap changes
  React.useEffect(() => {
    if (loadedSelected && !loadErrorSelected && selectedConfigMapData) {
      const dotString = selectedConfigMapData.data?.topology || '';
      if (dotString) {
        try {
          const { nodes, edges } = parseDotToModel(dotString);
          setParseError(null);

          if (controllerRef.current) {
            const newModel = {
              nodes,
              edges,
              graph: {
                id: 'g1',
                type: 'graph',
                layout: 'Dagre',
              },
            };

            controllerRef.current.fromModel(newModel, false);
            controllerRef.current.getGraph().layout();
            controllerRef.current.getGraph().fit(80);
          }
        } catch (error) {
          setParseError('Failed to parse topology data.');
        }
      }
    } else if (loadErrorSelected) {
      setParseError('Failed to load selected topology data.');
    }
  }, [selectedConfigMapData, loadedSelected, loadErrorSelected]);

  // Memoize the controller
  const controller = controllerRef.current;

  // select toggle handler
  const onToggle = (isOpen: boolean) => {
    setIsSelectOpen(isOpen);
  };

  const onSelect = (event: React.MouseEvent<Element, MouseEvent>, selection: string) => {
    setSelectedConfigMap(selection);
    setIsSelectOpen(false);
  };

  const configMapOptions = configMapList
    ? configMapList
        .filter((cm) => cm.metadata.name)
        .map((cm) => ({
          label: cm.metadata.name,
          value: cm.metadata.name,
        }))
    : [];

  // select the first ConfigMap by default
  React.useEffect(() => {
    if (loadedList && !loadErrorList && configMapList.length > 0 && !selectedConfigMap) {
      setSelectedConfigMap(configMapList[0].metadata.name);
    }
  }, [loadedList, loadErrorList, configMapList, selectedConfigMap]);

  return (
    <>
      <Helmet>
        <title>Policy Topology</title>
      </Helmet>
      <Page>
        <PageSection variant="light">
          <Title headingLevel="h1">Policy Topology</Title>
        </PageSection>
        <PageSection className="policy-topology-section">
          <Card>
            <CardTitle>Topology View</CardTitle>
            <CardBody>
              <TextContent>
                <Text component="p" className="pf-u-mb-md">
                  This view visualizes the relationships and interactions between different
                  resources within your cluster related to Kuadrant, allowing you to explore
                  connections between Gateways, HTTPRoutes, and Kuadrant Policies.
                </Text>
              </TextContent>

              {/* Topology configmap picker */}
              <Select
                variant="single"
                aria-label="Select ConfigMap"
                onToggle={onToggle}
                onSelect={onSelect}
                isOpen={isSelectOpen}
                selections={selectedConfigMap}
                placeholderText="Select a Topology ConfigMap"
                className="pf-u-mb-md"
                toggle={(toggleRef) => (
                  <Button
                    variant="control"
                    aria-label="Select ConfigMap"
                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                    ref={toggleRef}
                  >
                    {selectedConfigMap || 'Select a Topology ConfigMap'}
                  </Button>
                )}
                isDisabled={!loadedList || loadErrorList || configMapOptions.length === 0}
                isClearable={false}
              >
                {configMapOptions.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </Select>

              {!selectedConfigMap ? (
                <div className="pf-u-mt-md">Please select a Topology.</div>
              ) : !loadedSelected ? (
                <div className="pf-u-mt-md">Loading topology...</div>
              ) : loadErrorSelected ? (
                <div className="pf-u-mt-md">
                  Error loading topology: {loadErrorSelected.message}
                </div>
              ) : parseError ? (
                <div className="pf-u-mt-md">Error parsing topology: {parseError}</div>
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

              {/* loading state for CM list */}
              {!loadedList && !loadErrorList && selectedConfigMap === undefined && (
                <div className="pf-u-mt-md">Loading Topologies...</div>
              )}

              {/* error state for CM list */}
              {loadErrorList && (
                <div className="pf-u-mt-md">
                  Error loading Topology ConfigMaps: {loadErrorList.message}
                </div>
              )}

              {/* no ConfigMaps found */}
              {loadedList && configMapOptions.length === 0 && (
                <div className="pf-u-mt-md">No topology ConfigMaps found.</div>
              )}
            </CardBody>
          </Card>
        </PageSection>
      </Page>
    </>
  );
};

export default PolicyTopologyPage;
