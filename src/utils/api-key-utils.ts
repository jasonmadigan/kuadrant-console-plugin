import {
  ApiKeySecret,
  ApiKeyRequest,
  ApiKeyRequestConfigMap,
  ANNOTATION_PLAN_ID,
  ANNOTATION_USER_ID,
  ANNOTATION_REQUEST_USER_ID,
  LABEL_REQUEST_TYPE,
  LABEL_STATUS,
  API_KEY_REQUEST_PREFIX,
  PlanTier,
} from '../types/api-management';

// generate 64-character hex api key
export const generateApiKey = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// create api key secret manifest
export const createApiKeySecret = (
  userId: string,
  apiName: string,
  namespace: string,
  planTier: PlanTier,
  apiKey?: string,
): ApiKeySecret => {
  const timestamp = Date.now();
  const secretName = `${userId}-${apiName}-${timestamp}`;
  const key = apiKey || generateApiKey();

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    type: 'Opaque',
    metadata: {
      name: secretName,
      namespace,
      labels: {
        'authorino.kuadrant.io/managed-by': 'authorino',
        app: apiName,
      },
      annotations: {
        [ANNOTATION_PLAN_ID]: planTier,
        [ANNOTATION_USER_ID]: userId,
      },
    },
    data: {
      api_key: btoa(key), // base64 encode
    },
  };
};

// create api key request CR manifest
// note: status cannot be set during creation, only via PATCH to status subresource
export const createApiKeyRequest = (
  userId: string,
  userEmail: string,
  apiName: string,
  apiNamespace: string,
  planTier: PlanTier,
  useCase?: string,
): ApiKeyRequest => {
  const requestId = generateRequestId();
  const requestName = `${userId}-${apiName}-${requestId}`;

  return {
    apiVersion: 'extensions.kuadrant.io/v1alpha1',
    kind: 'APIKeyRequest',
    metadata: {
      name: requestName,
    },
    spec: {
      apiName,
      apiNamespace,
      planTier,
      ...(useCase && { useCase }),
      requestedBy: {
        userId,
        email: userEmail,
      },
      requestedAt: new Date().toISOString(),
    },
    // status intentionally omitted - will default to empty/undefined
    // filtering logic checks for status?.phase === 'Pending' or undefined
  };
};

// legacy configmap creation (deprecated)
export const createApiKeyRequestConfigMap = (
  userId: string,
  userEmail: string,
  apiName: string,
  apiNamespace: string,
  planTier: PlanTier,
  useCase: string,
): ApiKeyRequestConfigMap => {
  const requestId = generateRequestId();
  const requestName = `${API_KEY_REQUEST_PREFIX}${requestId}`;

  return {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: requestName,
      labels: {
        [LABEL_REQUEST_TYPE]: 'api-key',
        [LABEL_STATUS]: 'pending',
      },
      annotations: {
        [ANNOTATION_REQUEST_USER_ID]: userId,
      },
    },
    data: {
      userId,
      userEmail,
      apiName,
      apiNamespace,
      planTier,
      useCase,
      requestedAt: new Date().toISOString(),
    },
  } as ApiKeyRequestConfigMap;
};

// generate random request id
const generateRequestId = (): string => {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// extract username from console identity
export const getUserFromIdentity = (identity: any): string => {
  if (!identity || !identity.userEntityRef) {
    return 'unknown';
  }
  // format: user:default/username -> username
  const parts = identity.userEntityRef.split('/');
  return parts.length > 1 ? parts[1] : identity.userEntityRef;
};

// filter secrets by user-id annotation
export const filterSecretsByUser = (secrets: ApiKeySecret[], userId: string): ApiKeySecret[] => {
  return secrets.filter(
    (secret) =>
      secret.metadata?.annotations?.[ANNOTATION_USER_ID] === userId &&
      secret.metadata?.annotations?.[ANNOTATION_PLAN_ID], // must have plan-id to be api key
  );
};

// decode base64 api key for display
export const revealApiKey = (secret: ApiKeySecret): string => {
  try {
    return atob(secret.data.api_key);
  } catch (e) {
    return 'invalid key';
  }
};

// filter CR requests by user
export const filterRequestsByUser = (
  requests: ApiKeyRequest[],
  userId: string,
): ApiKeyRequest[] => {
  return requests.filter((req) => req.spec?.requestedBy?.userId === userId);
};

// filter legacy configmap requests by user
export const filterConfigMapRequestsByUser = (
  requests: ApiKeyRequestConfigMap[],
  userId: string,
): ApiKeyRequestConfigMap[] => {
  return requests.filter((req) => req.data?.userId === userId);
};
