import { APIKey } from '../types/api-management';

// generate random suffix for request names
export const generateRandomSuffix = (): string => {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// create APIKey CR manifest
export const createAPIKey = (
  userId: string,
  userEmail: string | undefined,
  apiProductName: string,
  apiProductNamespace: string,
  planTier: string,
  useCase?: string,
): APIKey => {
  const suffix = generateRandomSuffix();
  // sanitize userId for k8s name (lowercase, no special chars)
  const sanitizedUserId = userId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const requestName = `${sanitizedUserId}-${apiProductName}-${suffix}`;

  return {
    apiVersion: 'devportal.kuadrant.io/v1alpha1',
    kind: 'APIKey',
    metadata: {
      name: requestName,
      namespace: apiProductNamespace,
    },
    spec: {
      apiProductRef: {
        name: apiProductName,
      },
      planTier,
      ...(useCase && { useCase }),
      requestedBy: {
        userId,
        ...(userEmail && { email: userEmail }),
      },
    },
  };
};

// filter APIKeys by user
export const filterAPIKeysByUser = (apiKeys: APIKey[], userId: string): APIKey[] => {
  return apiKeys.filter((key) => key.spec?.requestedBy?.userId === userId);
};

// decode base64 secret value
export const decodeSecretValue = (base64Value: string): string => {
  try {
    return atob(base64Value);
  } catch (e) {
    return 'invalid key';
  }
};
