import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { APIKey, APIKeyModel } from '../types/api-management';

export interface ApproveRequestParams {
  request: APIKey;
  reviewedBy: string;
}

// approve an API key request - controller handles secret creation
export const approveRequest = async (
  params: ApproveRequestParams,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { request, reviewedBy } = params;

    const patches = [
      {
        op: request.status ? 'replace' : 'add',
        path: '/status',
        value: {
          ...request.status,
          phase: 'Approved',
          reviewedBy,
          reviewedAt: new Date().toISOString(),
        },
      },
    ];

    await k8sPatch({
      model: APIKeyModel,
      resource: request,
      data: patches,
      path: 'status',
    });

    return { success: true };
  } catch (error) {
    console.error('error approving request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
};

export interface RejectRequestParams {
  request: APIKey;
  reviewedBy: string;
  reason: string;
}

export const rejectRequest = async (
  params: RejectRequestParams,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { request, reviewedBy, reason } = params;

    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'rejection reason is required' };
    }

    const patches = [
      {
        op: request.status ? 'replace' : 'add',
        path: '/status',
        value: {
          ...request.status,
          phase: 'Rejected',
          reviewedBy,
          reviewedAt: new Date().toISOString(),
        },
      },
    ];

    await k8sPatch({
      model: APIKeyModel,
      resource: request,
      data: patches,
      path: 'status',
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

// bulk approve multiple requests
export const bulkApproveRequests = async (
  requests: APIKey[],
  reviewedBy: string,
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const results = await Promise.allSettled(
    requests.map((request) => approveRequest({ request, reviewedBy })),
  );

  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      success++;
    } else {
      failed++;
      const errorMsg =
        result.status === 'rejected'
          ? result.reason?.message || 'unknown error'
          : result.value.error || 'unknown error';
      errors.push(`${requests[index].metadata?.name}: ${errorMsg}`);
    }
  });

  return { success, failed, errors };
};

// bulk reject multiple requests
export const bulkRejectRequests = async (
  requests: APIKey[],
  reviewedBy: string,
  reason: string,
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const results = await Promise.allSettled(
    requests.map((request) => rejectRequest({ request, reviewedBy, reason })),
  );

  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      success++;
    } else {
      failed++;
      const errorMsg =
        result.status === 'rejected'
          ? result.reason?.message || 'unknown error'
          : result.value.error || 'unknown error';
      errors.push(`${requests[index].metadata?.name}: ${errorMsg}`);
    }
  });

  return { success, failed, errors };
};
