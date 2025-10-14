import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type PlanTier = 'gold' | 'silver' | 'bronze';

export type RequestPhase = 'Pending' | 'Approved' | 'Rejected';

// api key secret stored in api namespace
export interface ApiKeySecret extends K8sResourceCommon {
  type?: string; // e.g. 'Opaque'
  data: {
    api_key: string; // base64-encoded 64-char hex
  };
  metadata: {
    name: string;
    namespace: string;
    labels?: {
      app?: string; // matches AuthPolicy selector
      'authorino.kuadrant.io/managed-by'?: string; // authorino label
      [key: string]: string | undefined; // allow additional labels
    };
    annotations?: {
      'secret.kuadrant.io/plan-id'?: string;
      'secret.kuadrant.io/user-id'?: string;
      [key: string]: string | undefined; // allow additional annotations
    };
    creationTimestamp?: string;
  };
}

// api key request CR (extensions.kuadrant.io/v1alpha1)
export interface APIKeyRequestSpec {
  apiName: string;
  apiNamespace: string;
  planTier: PlanTier;
  useCase?: string;
  requestedBy: {
    userId: string;
    email: string;
  };
  requestedAt?: string;
}

export interface PlanLimits {
  daily?: number;
  weekly?: number;
  monthly?: number;
  custom?: Array<{
    limit: number;
    window: string;
  }>;
}

export interface APIKeyRequestStatus {
  phase?: RequestPhase;
  reviewedBy?: string;
  reviewedAt?: string;
  reason?: string;
  apiKey?: string;
  apiHostname?: string;
  apiBasePath?: string;
  apiDescription?: string;
  apiOasUrl?: string;
  apiOasUiUrl?: string;
  planLimits?: PlanLimits;
  conditions?: Array<{
    type: string;
    status: 'True' | 'False' | 'Unknown';
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
}

export interface ApiKeyRequest extends K8sResourceCommon {
  apiVersion: 'extensions.kuadrant.io/v1alpha1';
  kind: 'APIKeyRequest';
  spec: APIKeyRequestSpec;
  status?: APIKeyRequestStatus;
}

// legacy configmap interface (deprecated, remove after migration)
export interface ApiKeyRequestConfigMap extends K8sResourceCommon {
  data: {
    userId: string;
    userEmail: string;
    apiName: string;
    apiNamespace: string;
    planTier: string;
    useCase: string;
    requestedAt: string;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewComment?: string;
    secretName?: string;
    apiKey?: string;
    apiHostname?: string;
    apiBasePath?: string;
    apiDescription?: string;
    apiOasUrl?: string;
    apiOasUiUrl?: string;
  };
  metadata: {
    name: string;
    namespace: string;
    labels: {
      'kuadrant.io/request-type': 'api-key';
      'kuadrant.io/status': string;
    };
    annotations?: {
      'request.kuadrant.io/user-id': string;
      [key: string]: string | undefined;
    };
  };
}

// annotations used throughout
export const ANNOTATION_PLAN_ID = 'secret.kuadrant.io/plan-id';
export const ANNOTATION_USER_ID = 'secret.kuadrant.io/user-id';

// labels used for configmaps (legacy)
export const LABEL_REQUEST_TYPE = 'kuadrant.io/request-type';
export const LABEL_STATUS = 'kuadrant.io/status';

// api key request gvk
export const APIKeyRequestGVK = {
  group: 'extensions.kuadrant.io',
  version: 'v1alpha1',
  kind: 'APIKeyRequest',
};

// api metadata configmap stored in kuadrant-system (admin-accessible)
// represents a published api that users can request access to
// approvers copy relevant fields into ApiKeyRequest on approval
export interface ApiMetadata extends K8sResourceCommon {
  data: {
    name: string; // display name
    description: string; // human-readable description
    hostname: string; // e.g. petstore.apps.example.com
    basePath?: string; // e.g. /api/v1
    oasUrl?: string; // openapi spec json/yaml url
    oasUiUrl?: string; // swagger ui or similar
  };
  metadata: {
    name: string;
    namespace: string; // always kuadrant-system
    labels: {
      'kuadrant.io/api': 'true';
      'kuadrant.io/httproute-name'?: string; // source httproute
      'kuadrant.io/httproute-namespace'?: string;
    };
    annotations?: {
      'api.kuadrant.io/auth-scheme'?: string; // e.g. 'api-key', 'oauth2'
      [key: string]: string | undefined;
    };
  };
}

// constants
export const KUADRANT_SYSTEM_NS = 'kuadrant-system'; // for kuadrant resources and api metadata
export const API_REQUESTS_NS = 'api-requests'; // for consumer requests and approved keys
export const API_KEY_REQUEST_PREFIX = 'api-key-request-';
export const LABEL_API = 'kuadrant.io/api';
export const ANNOTATION_REQUEST_USER_ID = 'request.kuadrant.io/user-id';
