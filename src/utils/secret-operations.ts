import { k8sGet, k8sPatch, k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { APIKey, APIKeyModel } from '../types/api-management';
import { decodeSecretValue } from './api-key-utils';

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

// reveal API key secret value (show-once pattern)
// reads the secret and marks canReadSecret as false
export const revealApiKeySecret = async (
  apiKey: APIKey,
): Promise<{ success: boolean; value?: string; error?: string }> => {
  try {
    if (!apiKey.status?.secretRef) {
      return { success: false, error: 'no secret reference found' };
    }

    if (apiKey.status?.canReadSecret === false) {
      return { success: false, error: 'key has already been revealed' };
    }

    const { name, key } = apiKey.status.secretRef;
    const namespace = apiKey.metadata?.namespace;

    if (!namespace) {
      return { success: false, error: 'no namespace found' };
    }

    // fetch the secret
    const secret = await k8sGet({
      model: SecretModel,
      name,
      ns: namespace,
    });

    const secretData = (secret as any).data;
    if (!secretData || !secretData[key]) {
      return { success: false, error: 'secret key not found' };
    }

    const value = decodeSecretValue(secretData[key]);

    // mark as read (show-once)
    await k8sPatch({
      model: APIKeyModel,
      resource: apiKey,
      data: [
        {
          op: 'replace',
          path: '/status/canReadSecret',
          value: false,
        },
      ],
      path: 'status',
    });

    return { success: true, value };
  } catch (error) {
    console.error('error revealing api key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
};

// delete an APIKey (controller will clean up the secret via ownerRef)
export const deleteApiKey = async (
  apiKey: APIKey,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await k8sDelete({
      model: APIKeyModel,
      resource: apiKey,
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
