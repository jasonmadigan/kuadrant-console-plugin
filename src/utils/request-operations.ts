import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { createApiKeyRequest } from './api-key-utils';
import { PlanTier, APIKeyRequestGVK } from '../types/api-management';

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

export interface CreateAccessRequestParams {
  apiName: string;
  apiNamespace: string;
  planTier: PlanTier;
  useCase?: string;
  userId: string;
  userEmail: string;
  requestNamespace: string; // user's namespace where request cr will be created
}

export const createAccessRequest = async (
  params: CreateAccessRequestParams,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const requestCR = createApiKeyRequest(
      params.userId,
      params.userEmail,
      params.apiName,
      params.apiNamespace,
      params.planTier,
      params.useCase,
    );

    await k8sCreate({
      model: APIKeyRequestModel,
      data: requestCR,
      ns: params.requestNamespace,
    });

    return { success: true };
  } catch (error) {
    console.error('error creating access request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
};
