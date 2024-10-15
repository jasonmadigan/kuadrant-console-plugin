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
  Flex,
  Spinner,
  FlexItem,
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

import { getKindGroupLatestVersion } from '../utils/getModelFromResource';

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

// Define the resource kinds you want to fetch
const resourceKinds: { kind: string; group: string }[] = [
  { kind: 'Gateway', group: 'gateway.networking.k8s.io' },
  { kind: 'HTTPRoute', group: 'gateway.networking.k8s.io' },
  { kind: 'TLSPolicy', group: 'kuadrant.io' },
  { kind: 'DNSPolicy', group: 'kuadrant.io' },
  { kind: 'AuthPolicy', group: 'kuadrant.io' },
  { kind: 'RateLimitPolicy', group: 'kuadrant.io' },
  { kind: 'ConfigMap', group: '' }, // Core group
  { kind: 'Listener', group: 'gateway.networking.k8s.io' },
  { kind: 'GatewayClass', group: 'gateway.networking.k8s.io' },
];

// Convert DOT graph to PatternFly node/edge models
const parseDotToModel = (dotString: string): { nodes: any[]; edges: any[] } => {
  try {
    const graph = dot.read(dotString);
    const nodes: any[] = [];
    const edges: any[] = [];
    const groups: any[] = [];

    const shapeMapping: { [key: string]: NodeShape } = {
      Gateway: NodeShape.rect,
      HTTPRoute: NodeShape.rect,
      TLSPolicy: NodeShape.rect,
      DNSPolicy: NodeShape.rect,
      AuthPolicy: NodeShape.rect,
      RateLimitPolicy: NodeShape.rect,
      ConfigMap: NodeShape.ellipse,
      Listener: NodeShape.rect,
      GatewayClass: NodeShape.rect,
      Kuadrant: NodeShape.ellipse,
    };

    const connectedNodeIds = new Set<string>();

    graph.edges().forEach((edge) => {
      const sourceNode = graph.node(edge.v);
      const targetNode = graph.node(edge.w);

      if (!sourceNode || !targetNode) return;

      connectedNodeIds.add(edge.v);
      connectedNodeIds.add(edge.w);

      const isPolicy = ['TLSPolicy', 'DNSPolicy', 'AuthPolicy', 'RateLimitPolicy'].includes(
        sourceNode.type,
      );

      edges.push({
        id: `edge-${edge.v}-${edge.w}`,
        type: 'edge',
        source: edge.v,
        target: edge.w,
        edgeStyle: isPolicy ? EdgeStyle.dashedMd : EdgeStyle.default,
        animationSpeed: isPolicy ? EdgeAnimationSpeed.medium : undefined,
        style: {
          strokeWidth: 2,
          stroke: '#393F44',
        },
      });
    });

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

    const unconnectedNodes = nodes.filter((node) => !connectedNodeIds.has(node.id));
    if (unconnectedNodes.length > 0) {
      groups.push({
        id: 'group-unconnected',
        children: unconnectedNodes.map((node) => node.id),
        type: 'group',
        group: true,
        label: 'Unassociated Policies and Resources',
        style: {
          padding: 40,
        },
      });
    }

    const finalNodes = [...nodes, ...groups];
    return { nodes: finalNodes, edges };
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
      onContextMenu={onContextMenu}
      contextMenuOpen={contextMenuOpen}
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

const customLayoutFactory = (type: string, graph: any): any => {
  return new DagreLayout(graph, {
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 0,
    nodeDistance: 80,
  });
};

const PolicyTopologyPage: React.FC = () => {
  const [config, setConfig] = React.useState<any | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  // State to store dynamic GVK mapping
  const [dynamicGVKMapping, setDynamicGVKMapping] = React.useState<{
    [key: string]: { group: string; version: string; kind: string };
  }>({});

  const goToResource = (resourceType: string, resourceName: string) => {
    const mapping = dynamicGVKMapping[resourceType];

    if (!mapping) {
      console.error(`GVK mapping not found for resource type: ${resourceType}`);
      return;
    }

    const { group, version, kind } = mapping;

    // Special case: Listener should go to associated Gateway
    let finalGroup = group;
    let finalKind = kind;
    let finalVersion = version;

    if (resourceType === 'Listener') {
      finalKind = 'Gateway';
      const gatewayMapping = dynamicGVKMapping['Gateway'];
      if (!gatewayMapping) {
        console.error(`GVK mapping not found for Gateway associated with Listener.`);
        return;
      }
      finalGroup = gatewayMapping.group;
      finalVersion = gatewayMapping.version;
    }

    const [namespace, name] = resourceName.includes('/')
      ? resourceName.split('/')
      : [null, resourceName];

    const url = namespace
      ? `/k8s/ns/${namespace}/${finalGroup}~${finalVersion}~${finalKind}/${name}`
      : `/k8s/cluster/${finalGroup}~${finalVersion}~${finalKind}/${name}`;

    window.location.href = url;
  };

  const customComponentFactory = (kind: ModelKind, type: string) => {
    const contextMenuItem = (resourceType: string, resourceName: string) => (
      <ContextMenuItem
        key="go-to-resource"
        onClick={() => goToResource(resourceType, resourceName)}
      >
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

  // State to track loading status of dynamic mapping
  const [isGVKLoading, setIsGVKLoading] = React.useState<boolean>(true);

  // State to track errors in dynamic mapping
  const [gvkError, setGvkError] = React.useState<string | null>(null);

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

  // Fetch dynamic GVK mapping after config is loaded
  React.useEffect(() => {
    const fetchGVKMapping = async () => {
      if (resourceKinds.length === 0) {
        setIsGVKLoading(false);
        return;
      }

      const mapping: { [key: string]: { group: string; version: string; kind: string } } = {};
      try {
        // Fetch versions in parallel
        const fetchPromises = resourceKinds.map(async (resource) => {
          const { kind, group } = resource;
          const result = await getKindGroupLatestVersion(kind, group);
          if (result.version) {
            mapping[kind] = {
              group: result.group,
              version: result.version,
              kind: result.kind,
            };
          }
        });

        await Promise.all(fetchPromises);
        setDynamicGVKMapping(mapping);
        setIsGVKLoading(false);
      } catch (error) {
        console.error('Error fetching dynamic GVK mapping:', error);
        setGvkError('Failed to fetch resource versions.');
        setIsGVKLoading(false);
      }
    };

    // Only fetch if config is loaded
    if (config) {
      fetchGVKMapping();
    }
  }, [config]);

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

  // Handle data updates
  React.useEffect(() => {
    if (loaded && !loadError && configMap && !isGVKLoading && !gvkError) {
      const dotString = configMap.data?.topology || '';
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
    } else if (loadError) {
      setParseError('Failed to load topology data.');
    }
  }, [configMap, loaded, loadError, isGVKLoading, gvkError]);

  // Memoize the controller
  const controller = controllerRef.current;

  if (!config) {
    return (
      <Flex
        direction={{ default: 'column' }}
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentCenter' }}
        style={{ height: '100%', minHeight: '250px' }}
      >
        <Spinner size="lg" />
        <FlexItem>
          <Text component="p">Loading configuration...</Text>
        </FlexItem>
      </Flex>
    );
  }

  if (isGVKLoading) {
    return (
      <Flex
        direction={{ default: 'column' }}
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentCenter' }}
        style={{ height: '100%', minHeight: '250px' }}
      >
        <Spinner size="lg" />
        <FlexItem>
          <Text component="p">Loading Topology...</Text>
        </FlexItem>
      </Flex>
    );
  }

  if (gvkError) {
    return <div>Error: {gvkError}</div>;
  }

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
                  connections between Gateways, HTTPRoutes and Kuadrant Policies.
                </Text>
              </TextContent>
              {!loaded ? (
                <div>Loading topology...</div>
              ) : loadError ? (
                <div>Error loading topology: {loadError.message}</div>
              ) : parseError ? (
                <div>Error parsing topology: {parseError}</div>
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
      </Page>
    </>
  );
};

export default PolicyTopologyPage;
