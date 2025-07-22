import { NodeShape } from '@patternfly/react-topology';

// List of resource types to show by default in the filter toolbar.
// Only these kinds will be shown in the initial render if they exist in the parsed DOT file
export const showByDefault = new Set([
  'AuthPolicy',
  'Authorino',
  'ConfigMap',
  'ConsolePlugin',
  'DNSPolicy',
  'Gateway',
  'HTTPRoute',
  'HTTPRouteRule',
  'Kuadrant',
  'Limitador',
  'RateLimitPolicy',
  'TLSPolicy',
]);

// Resource hints for dynamic GVK resolution
export const resourceHints: Record<string, string> = {
  Gateway: 'gateway.networking.k8s.io',
  DNSRecord: 'kuadrant.io',
};

// Shape mapping for different resource types
export const shapeMapping: Record<string, NodeShape> = {
  Gateway: NodeShape.rect,
  GatewayClass: NodeShape.rect,
  HTTPRoute: NodeShape.rect,
  HTTPRouteRule: NodeShape.rect,
  Listener: NodeShape.rect,
};

// Policy configuration for resources
export interface PolicyConfig {
  key: string;
  displayName: string;
}

export const ResourcePolicyMap: Record<string, PolicyConfig[]> = {
  Gateway: [
    { key: 'AuthPolicy', displayName: 'Create AuthPolicy' },
    { key: 'DNSPolicy', displayName: 'Create DNSPolicy' },
    { key: 'RateLimitPolicy', displayName: 'Create RateLimitPolicy' },
    { key: 'TLSPolicy', displayName: 'Create TLSPolicy' },
  ],
  HTTPRoute: [
    { key: 'AuthPolicy', displayName: 'Create AuthPolicy' },
    { key: 'RateLimitPolicy', displayName: 'Create RateLimitPolicy' },
  ],
};

// Kinds for unassociated policies - these will be grouped in the UI
export const unassociatedPolicies = new Set([
  'AuthPolicy',
  'RateLimitPolicy',
  'DNSPolicy',
  'TLSPolicy',
]);

// Kinds for Kuadrant internals - these will be grouped also
export const kuadrantInternals = new Set([
  'ConfigMap',
  'Kuadrant',
  'Limitador',
  'Authorino',
  'ConsolePlugin',
]);

// Node types that should preserve transitive connections when filtered
export const transitiveNodeTypes = new Set(['Listener', 'HTTPRouteRule']);
