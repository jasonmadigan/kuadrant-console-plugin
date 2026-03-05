import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExtensionHookResult } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { Action } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/actions';
import {
  K8sResourceCommon,
  useK8sModel,
  getGroupVersionKindForResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { AccessReviewResourceAttributes } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/console-types';
import {
  useAnnotationsModal,
  useDeleteModal,
  useLabelsModal,
} from '@openshift-console/dynamic-plugin-sdk';

const usePolicyActions = (
  obj: K8sResourceCommon,
  kind: string,
  editPathPrefix: string,
  editLabel: string,
): ExtensionHookResult<Action[]> => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
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

  const idPrefix = kind.toLowerCase().replace(/policy$/, 'policy');

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

    return [
      {
        id: `edit-labels-${idPrefix}`,
        label: t('Edit labels'),
        cta: launchLabelsModal,
        accessReview: updateAccess,
      },
      {
        id: `edit-annotations-${idPrefix}`,
        label: t('Edit annotations'),
        cta: launchAnnotationsModal,
        accessReview: updateAccess,
      },
      {
        id: `kuadrant-${idPrefix}-edit-form`,
        label: editLabel,
        description: t('Edit via form'),
        cta: () =>
          history.push({
            pathname: `/k8s/ns/${namespace}/${editPathPrefix}/name/${name}/edit`,
          }),
        insertBefore: 'edit-yaml',
        accessReview: updateAccess,
      },
      {
        id: `delete-${idPrefix}`,
        label: t('Delete'),
        cta: launchDeleteModal,
        accessReview: deleteAccess,
      },
    ];
  }, [history, obj, policyModel, launchAnnotationsModal, launchDeleteModal, launchLabelsModal]);

  return [actions, true, undefined];
};

export default usePolicyActions;
