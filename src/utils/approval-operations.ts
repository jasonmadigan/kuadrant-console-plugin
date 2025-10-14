import { k8sCreate, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { createApiKeySecret } from './api-key-utils';
import { ApiKeyRequest, APIKeyRequestGVK } from '../types/api-management';

const SecretModel = {
  apiVersion: 'v1',
  kind: 'Secret',
  plural: 'secrets',
  abbr: 'secret',
  label: 'Secret',
  labelPlural: 'Secrets',
  namespaced: true,
};

const APIKeyRequestModel = {
  apiGroup: APIKeyRequestGVK.group,
  apiVersion: APIKeyRequestGVK.version,
  kind: APIKeyRequestGVK.kind,
  plural: 'apikeyrequests',
  abbr: 'akr',
  label: 'APIKeyRequest',
  labelPlural: 'APIKeyRequests',
  namespaced: true,
};

export interface ApproveRequestParams {
  request: ApiKeyRequest;
  reviewedBy: string;
  comment?: string;
}

export const approveRequest = async (
  params: ApproveRequestParams,
): Promise<{ success: boolean; error?: string; secretName?: string }> => {
  try {
    const { request, reviewedBy, comment } = params;
    const { userId } = request.spec.requestedBy;
    const { apiName, apiNamespace, planTier } = request.spec;

    // generate and create api key secret
    const secret = createApiKeySecret(userId, apiName, apiNamespace, planTier);

    await k8sCreate({
      model: SecretModel,
      data: secret,
      ns: apiNamespace,
    });

    // extract the plain-text api key from the secret
    const apiKeyBase64 = secret.data?.api_key || '';
    const apiKey = atob(apiKeyBase64);

    // update status to approved and add api metadata
    // note: this is a status subresource update
    const patches = [
      {
        op: request.status ? 'replace' : 'add',
        path: '/status',
        value: {
          phase: 'Approved',
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          reason: comment || 'approved',
          apiKey,
          // TODO: fetch API metadata from HTTPRoute or ConfigMap
          // for now, use placeholder values
          apiHostname: `${apiName}.apps.example.com`,
          apiBasePath: '/api/v1',
          apiDescription: `${apiName} API`,
        },
      },
    ];

    await k8sPatch({
      model: APIKeyRequestModel,
      resource: request,
      data: patches,
      path: 'status', // patch the status subresource
    });

    return { success: true, secretName: secret.metadata.name };
  } catch (error) {
    console.error('error approving request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
};

export interface RejectRequestParams {
  request: ApiKeyRequest;
  reviewedBy: string;
  comment: string;
}

export const rejectRequest = async (
  params: RejectRequestParams,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { request, reviewedBy, comment } = params;

    if (!comment || comment.trim().length === 0) {
      return { success: false, error: 'rejection reason is required' };
    }

    const patches = [
      {
        op: request.status ? 'replace' : 'add',
        path: '/status',
        value: {
          phase: 'Rejected',
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          reason: comment.trim(),
        },
      },
    ];

    await k8sPatch({
      model: APIKeyRequestModel,
      resource: request,
      data: patches,
      path: 'status', // patch the status subresource
    });

    return { success: true };
  } catch (error) {
    console.error('error rejecting request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
};
