import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type RequestPhase = 'Pending' | 'Approved' | 'Rejected';

export interface PlanLimits {
  daily?: number;
  weekly?: number;
  monthly?: number;
  yearly?: number;
  custom?: Array<{
    limit: number;
    window: string;
  }>;
}

// plan definition within PlanPolicy or APIProduct status
export interface Plan {
  tier: string;
  description?: string;
  limits?: PlanLimits;
}

// APIKey spec - references an APIProduct
export interface APIKeySpec {
  apiProductRef: {
    name: string;
  };
  planTier: string;
  useCase?: string;
  requestedBy: {
    userId: string;
    email?: string;
  };
}

// APIKey status - managed by controller
export interface APIKeyStatus {
  phase?: RequestPhase;
  reviewedBy?: string;
  reviewedAt?: string;
  apiHostname?: string;
  limits?: PlanLimits;
  secretRef?: {
    name: string;
    key: string;
  };
  canReadSecret?: boolean;
  conditions?: Array<{
    type: string;
    status: 'True' | 'False' | 'Unknown';
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
}

// APIKey CR - devportal.kuadrant.io/v1alpha1
export interface APIKey extends K8sResourceCommon {
  apiVersion: 'devportal.kuadrant.io/v1alpha1';
  kind: 'APIKey';
  spec: APIKeySpec;
  status?: APIKeyStatus;
}

// APIProduct spec - wraps an HTTPRoute with metadata
export interface APIProductSpec {
  displayName: string;
  description?: string;
  version?: string;
  tags?: string[];
  targetRef: {
    group: string;
    kind: string;
    name: string;
  };
  approvalMode: 'automatic' | 'manual';
  publishStatus: 'Draft' | 'Published';
  documentation?: {
    openAPISpecURL?: string;
    swaggerUI?: string;
    docsURL?: string;
    gitRepository?: string;
  };
  contact?: {
    team?: string;
    email?: string;
    slack?: string;
    url?: string;
  };
}

// APIProduct status - populated by controller
export interface APIProductStatus {
  observedGeneration?: number;
  discoveredPlans?: Plan[];
  openapi?: {
    raw: string;
    lastSyncTime: string;
  };
  conditions?: Array<{
    type: string;
    status: 'True' | 'False' | 'Unknown';
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
}

// APIProduct CR - devportal.kuadrant.io/v1alpha1
export interface APIProduct extends K8sResourceCommon {
  apiVersion: 'devportal.kuadrant.io/v1alpha1';
  kind: 'APIProduct';
  spec: APIProductSpec;
  status?: APIProductStatus;
}

// GVK constants
export const APIKeyGVK = {
  group: 'devportal.kuadrant.io',
  version: 'v1alpha1',
  kind: 'APIKey',
};

export const APIProductGVK = {
  group: 'devportal.kuadrant.io',
  version: 'v1alpha1',
  kind: 'APIProduct',
};

// model for k8s operations
export const APIKeyModel = {
  apiGroup: APIKeyGVK.group,
  apiVersion: APIKeyGVK.version,
  kind: APIKeyGVK.kind,
  plural: 'apikeys',
  abbr: 'ak',
  label: 'APIKey',
  labelPlural: 'APIKeys',
  namespaced: true,
};

export const APIProductModel = {
  apiGroup: APIProductGVK.group,
  apiVersion: APIProductGVK.version,
  kind: APIProductGVK.kind,
  plural: 'apiproducts',
  abbr: 'ap',
  label: 'APIProduct',
  labelPlural: 'APIProducts',
  namespaced: true,
};
