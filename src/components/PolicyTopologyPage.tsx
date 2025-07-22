/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import Helmet from 'react-helmet';
import { PageSection, Title, Card, CardTitle, CardBody, Content } from '@patternfly/react-core';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  TopologyView,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import { useTranslation } from 'react-i18next';

import './kuadrant.css';
import NoPermissionsView from './NoPermissionsView';

import { resourceHints } from '../utils/topology/topologyConstants';
import { GVK, getGroupVersionKindForKind } from '../utils/topology/topologyUtils';
import {
  createGoToResource,
  createNavigateToCreatePolicy,
} from '../utils/topology/navigationUtils';
import { fetchConfig } from '../utils/topology/configLoader';
import { ResourceFilterToolbar } from './topology/ResourceFilterToolbar';
import { updateGraph } from '../utils/topology/graphManager';
import { useTopologyData } from '../hooks/useTopologyData';
import { useVisualizationController } from '../hooks/useVisualizationController';
import { useTopologyAccess } from '../hooks/useTopologyAccess';
import { TopologyControls } from './topology/TopologyControls';

let dynamicResourceGVKMapping: Record<string, GVK> = {};

const goToResource = createGoToResource(dynamicResourceGVKMapping);
const navigateToCreatePolicy = createNavigateToCreatePolicy(dynamicResourceGVKMapping);

const PolicyTopologyPage: React.FC = () => {
  const [config, setConfig] = React.useState<any | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  // dynamically generated list of all resource types from the parsed DOT file
  const [allResourceTypes, setAllResourceTypes] = React.useState<string[]>([]);
  // Resource filter state. On initial render, show only resources in showByDefault
  const [selectedResourceTypes, setSelectedResourceTypes] = React.useState<string[]>([]);
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

  const controller = useVisualizationController(
    goToResource,
    navigateToCreatePolicy,
    dynamicResourceGVKMapping,
  );

  const topologyData = useTopologyData(
    configMap,
    loaded,
    loadError,
    selectedResourceTypes,
    setSelectedResourceTypes,
    isInitialLoad,
    setParseError,
    setAllResourceTypes,
  );

  // Handle graph updates when data changes
  React.useEffect(() => {
    if (controller && topologyData) {
      updateGraph(
        controller,
        topologyData.finalNodes,
        topologyData.filteredEdges,
        isInitialLoad,
        topologyData.filterChanged,
      );
      if (isInitialLoad && topologyData.finalNodes.length > 0) {
        setIsInitialLoad(false);
      }
    }
  }, [controller, topologyData, isInitialLoad]);

  const { canReadTopology, isLoadingPermissions } = useTopologyAccess(config);

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
            <ResourceFilterToolbar
              allResourceTypes={allResourceTypes}
              selectedResourceTypes={selectedResourceTypes}
              onResourceSelect={onResourceSelect}
              onDeleteResourceFilter={onDeleteResourceFilter}
              onDeleteResourceGroup={onDeleteResourceGroup}
              clearAllFilters={clearAllFilters}
            />
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
                  controlBar={<TopologyControls controller={controller} />}
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
