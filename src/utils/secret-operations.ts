import { k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { ApiKeySecret } from '../types/api-management';
import { revealApiKey } from './api-key-utils';

const SecretModel = {
  apiVersion: 'v1',
  apiGroup: '',
  kind: 'Secret',
  plural: 'secrets',
  abbr: 'secret',
  label: 'Secret',
  labelPlural: 'Secrets',
  namespaced: true,
};

export const deleteApiKey = async (
  secret: ApiKeySecret,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await k8sDelete({
      model: SecretModel,
      resource: secret,
    });

    return { success: true };
  } catch (error) {
    console.error('error deleting api key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
};

export const getApiKeyValue = (secret: ApiKeySecret): string => {
  return revealApiKey(secret);
};
