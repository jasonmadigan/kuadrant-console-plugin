interface KuadrantConfig {
  TOPOLOGY_CONFIGMAP_NAME: string;
  TOPOLOGY_CONFIGMAP_NAMESPACE: string;
}

const DEFAULT_CONFIG: KuadrantConfig = {
  TOPOLOGY_CONFIGMAP_NAME: 'topology',
  TOPOLOGY_CONFIGMAP_NAMESPACE: 'kuadrant-system',
};

/**
 * Fetch the config.js file dynamically at runtime
 * Normally served from <cluster-host>/api/plugins/kuadrant-console/config.js
 */
export const fetchConfig = async (): Promise<KuadrantConfig> => {
  try {
    const response = await fetch('/api/plugins/kuadrant-console-plugin/config.js');
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('config.js not found (running locally perhaps). Falling back to defaults.');
      } else {
        throw new Error(`Failed to fetch config.js: ${response.statusText}`);
      }
      return DEFAULT_CONFIG; // Fallback on 404
    }

    const script = await response.text();

    const configScript = document.createElement('script');
    configScript.innerHTML = script;
    document.head.appendChild(configScript);

    return (window as any).kuadrant_config || DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error loading config.js:', error);
    return DEFAULT_CONFIG;
  }
};
