import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { createAPIKey } from './api-key-utils';
import { APIKeyModel } from '../types/api-management';

export interface CreateAccessRequestParams {
  apiProductName: string;
  apiProductNamespace: string;
  planTier: string;
  useCase?: string;
  userId: string;
  userEmail?: string;
}

export const createAccessRequest = async (
  params: CreateAccessRequestParams,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const apiKey = createAPIKey(
      params.userId,
      params.userEmail,
      params.apiProductName,
      params.apiProductNamespace,
      params.planTier,
      params.useCase,
    );

    await k8sCreate({
      model: APIKeyModel,
      data: apiKey,
    });

    return { success: true };
  } catch (error) {
    console.error('error creating api key request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
};
