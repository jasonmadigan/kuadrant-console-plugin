import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { ExtensionHookResult } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { Action } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/actions';
import {
  K8sResourceCommon,
  useK8sModel,
  getGroupVersionKindForResource,
  useAnnotationsModal,
  useDeleteModal,
  useLabelsModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { AccessReviewResourceAttributes } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/console-types';

interface PolicyActionsConfig {
  kind: string;
  editPathSegment: string;
}

export const createPolicyActionsHook = (config: PolicyActionsConfig) => {
  const { kind, editPathSegment } = config;
  const kindLower = kind.toLowerCase();

  return (obj: K8sResourceCommon): ExtensionHookResult<Action[]> => {
    const history = useHistory();
    const gvk = obj ? getGroupVersionKindForResource(obj) : undefined;
    const [policyModel] = useK8sModel(
      gvk
        ? { group: gvk.group, version: gvk.version, kind: gvk.kind }
        : { group: '', version: '', kind: '' },
    );
    const launchDeleteModal = useDeleteModal(obj);
    const launchLabelsModal = useLabelsModal(obj);
    const launchAnnotationsModal = useAnnotationsModal(obj);

    const actions = React.useMemo<Action[]>(() => {
      if (!obj || obj.kind !== kind) return [];
      const namespace = obj.metadata?.namespace || 'default';
      const name = obj.metadata?.name || '';

      const updateAccess: AccessReviewResourceAttributes | undefined = policyModel
        ? {
            group: policyModel.apiGroup,
            resource: policyModel.plural,
            verb: 'update',
            name,
            namespace,
          }
        : undefined;
      const deleteAccess: AccessReviewResourceAttributes | undefined = policyModel
        ? {
            group: policyModel.apiGroup,
            resource: policyModel.plural,
            verb: 'delete',
            name,
            namespace,
          }
        : undefined;

      const actionsList: Action[] = [
        {
          id: `edit-labels-${kindLower}`,
          label: 'Edit labels',
          cta: launchLabelsModal,
          accessReview: updateAccess,
        },
        {
          id: `edit-annotations-${kindLower}`,
          label: 'Edit annotations',
          cta: launchAnnotationsModal,
          accessReview: updateAccess,
        },
        {
          id: `kuadrant-${kindLower}-edit-form`,
          label: 'Edit',
          description: 'Edit via form',
          cta: () =>
            history.push({
              pathname: `/k8s/ns/${namespace}/${editPathSegment}/name/${name}/edit`,
            }),
          insertBefore: 'edit-yaml',
          accessReview: updateAccess,
        },
        {
          id: `delete-${kindLower}`,
          label: 'Delete',
          cta: launchDeleteModal,
          accessReview: deleteAccess,
        },
      ];

      return actionsList;
    }, [history, obj, policyModel, launchAnnotationsModal, launchDeleteModal, launchLabelsModal]);

    return [actions, true, undefined];
  };
};
