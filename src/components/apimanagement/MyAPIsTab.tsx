import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableHeader, TableBody } from '@patternfly/react-table/deprecated';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  Label,
  LabelGroup,
  Alert,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Form,
  FormGroup,
  TextInput,
  TextArea,
  FormSelect,
  FormSelectOption,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { CubeIcon, EllipsisVIcon, PlusCircleIcon } from '@patternfly/react-icons';
import {
  useK8sWatchResource,
  k8sCreate,
  k8sPatch,
  k8sDelete,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { APIProduct, APIProductGVK, APIProductModel } from '../../types/api-management';
import resourceGVKMapping from '../../utils/resources';

interface HTTPRoute extends K8sResourceCommon {
  spec: {
    parentRefs?: Array<{ name: string; namespace?: string }>;
    hostnames?: string[];
  };
}

interface MyAPIsTabProps {
  userId: string;
}

export const MyAPIsTab: React.FC<MyAPIsTabProps> = ({ userId }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<APIProduct | null>(null);
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);

  // form state
  const [formData, setFormData] = React.useState({
    name: '',
    displayName: '',
    description: '',
    version: 'v1',
    targetHttpRoute: '',
    targetNamespace: '',
    approvalMode: 'manual' as 'manual' | 'automatic',
    publishStatus: 'Draft' as 'Draft' | 'Published',
    tags: '',
    contactTeam: '',
    contactEmail: '',
  });

  // watch APIProducts
  const [products, productsLoaded, productsError] = useK8sWatchResource<APIProduct[]>({
    groupVersionKind: APIProductGVK,
    isList: true,
    namespaced: false,
  });

  // watch HTTPRoutes for target selection
  const [httpRoutes, httpRoutesLoaded] = useK8sWatchResource<HTTPRoute[]>({
    groupVersionKind: resourceGVKMapping.HTTPRoute,
    isList: true,
    namespaced: false,
  });

  // filter to user's products (by creator annotation or ownership)
  const myProducts = React.useMemo(() => {
    if (!productsLoaded || !products) return [];
    return products.filter((p) => {
      const owner = p.metadata?.annotations?.['kuadrant.io/created-by'];
      return owner === userId;
    });
  }, [products, productsLoaded, userId]);

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      version: 'v1',
      targetHttpRoute: '',
      targetNamespace: '',
      approvalMode: 'manual',
      publishStatus: 'Draft',
      tags: '',
      contactTeam: '',
      contactEmail: '',
    });
    setError('');
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.displayName || !formData.targetHttpRoute) {
      setError('name, display name, and target HTTPRoute are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const apiProduct: APIProduct = {
        apiVersion: 'devportal.kuadrant.io/v1alpha1',
        kind: 'APIProduct',
        metadata: {
          name: formData.name,
          namespace: formData.targetNamespace,
          annotations: {
            'kuadrant.io/created-by': userId,
          },
        },
        spec: {
          displayName: formData.displayName,
          description: formData.description || undefined,
          version: formData.version || undefined,
          targetRef: {
            group: 'gateway.networking.k8s.io',
            kind: 'HTTPRoute',
            name: formData.targetHttpRoute,
          },
          approvalMode: formData.approvalMode,
          publishStatus: formData.publishStatus,
          tags: formData.tags
            ? formData.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
          contact:
            formData.contactTeam || formData.contactEmail
              ? {
                  team: formData.contactTeam || undefined,
                  email: formData.contactEmail || undefined,
                }
              : undefined,
        },
      };

      await k8sCreate({ model: APIProductModel, data: apiProduct });
      setCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to create API product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedProduct) return;

    setSubmitting(true);
    setError('');

    try {
      const patches = [
        { op: 'replace', path: '/spec/displayName', value: formData.displayName },
        { op: 'replace', path: '/spec/description', value: formData.description || '' },
        { op: 'replace', path: '/spec/version', value: formData.version || '' },
        { op: 'replace', path: '/spec/approvalMode', value: formData.approvalMode },
        { op: 'replace', path: '/spec/publishStatus', value: formData.publishStatus },
        {
          op: 'replace',
          path: '/spec/tags',
          value: formData.tags
            ? formData.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
        },
      ];

      await k8sPatch({ model: APIProductModel, resource: selectedProduct, data: patches });
      setEditModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to update API product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    setSubmitting(true);
    setError('');

    try {
      await k8sDelete({ model: APIProductModel, resource: selectedProduct });
      setDeleteModalOpen(false);
      setSelectedProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to delete API product');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (product: APIProduct) => {
    setSelectedProduct(product);
    setFormData({
      name: product.metadata?.name || '',
      displayName: product.spec.displayName,
      description: product.spec.description || '',
      version: product.spec.version || 'v1',
      targetHttpRoute: product.spec.targetRef.name,
      targetNamespace: product.metadata?.namespace || '',
      approvalMode: product.spec.approvalMode,
      publishStatus: product.spec.publishStatus,
      tags: product.spec.tags?.join(', ') || '',
      contactTeam: product.spec.contact?.team || '',
      contactEmail: product.spec.contact?.email || '',
    });
    setError('');
    setEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const openDeleteModal = (product: APIProduct) => {
    setSelectedProduct(product);
    setError('');
    setDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const columns = ['Name', 'Version', 'Status', 'Approval', 'Tags', 'Actions'];

  const rows = myProducts.map((product) => {
    const productId = `${product.metadata?.namespace}/${product.metadata?.name}`;
    const tags = product.spec.tags || [];

    return {
      cells: [
        {
          title: (
            <div>
              <strong>{product.spec.displayName}</strong>
              <div style={{ fontSize: '12px', color: 'var(--pf-v6-global--Color--200)' }}>
                {product.metadata?.namespace}/{product.metadata?.name}
              </div>
            </div>
          ),
        },
        product.spec.version || '-',
        {
          title: (
            <Label color={product.spec.publishStatus === 'Published' ? 'green' : 'grey'}>
              {product.spec.publishStatus}
            </Label>
          ),
        },
        {
          title: (
            <Label color={product.spec.approvalMode === 'automatic' ? 'blue' : 'orange'}>
              {product.spec.approvalMode}
            </Label>
          ),
        },
        {
          title:
            tags.length > 0 ? (
              <LabelGroup>
                {tags.slice(0, 2).map((tag) => (
                  <Label key={tag} isCompact>
                    {tag}
                  </Label>
                ))}
                {tags.length > 2 && <Label isCompact>+{tags.length - 2}</Label>}
              </LabelGroup>
            ) : (
              '-'
            ),
        },
        {
          title: (
            <Dropdown
              isOpen={openDropdownId === productId}
              onSelect={() => setOpenDropdownId(null)}
              onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? productId : null)}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  variant="plain"
                  onClick={() => setOpenDropdownId(openDropdownId === productId ? null : productId)}
                  isExpanded={openDropdownId === productId}
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              popperProps={{ position: 'right' }}
            >
              <DropdownList>
                <DropdownItem key="edit" onClick={() => openEditModal(product)}>
                  {t('Edit')}
                </DropdownItem>
                <DropdownItem key="delete" onClick={() => openDeleteModal(product)}>
                  {t('Delete')}
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          ),
        },
      ],
    };
  });

  if (productsError) {
    return <Alert variant="danger" title={t('Error loading API products')} />;
  }

  if (!productsLoaded) {
    return <div>{t('Loading...')}</div>;
  }

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <Button
          variant="primary"
          icon={<PlusCircleIcon />}
          onClick={() => {
            resetForm();
            setCreateModalOpen(true);
          }}
        >
          {t('Create API Product')}
        </Button>
      </div>

      {myProducts.length === 0 ? (
        <EmptyState icon={CubeIcon} titleText={t('No API Products')}>
          <EmptyStateBody>
            {t(
              'You have not created any API products yet. Create one to publish an API for consumers.',
            )}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="My APIs table" variant="compact" cells={columns} rows={rows}>
          <TableHeader />
          <TableBody />
        </Table>
      )}

      {/* Create Modal */}
      <Modal
        variant="medium"
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        aria-labelledby="create-api-modal"
      >
        <ModalHeader title={t('Create API Product')} />
        <ModalBody>
          <Form>
            <FormGroup label={t('Name')} isRequired fieldId="name">
              <TextInput
                id="name"
                value={formData.name}
                onChange={(_e, v) => setFormData({ ...formData, name: v })}
                placeholder="my-api"
              />
            </FormGroup>
            <FormGroup label={t('Display Name')} isRequired fieldId="displayName">
              <TextInput
                id="displayName"
                value={formData.displayName}
                onChange={(_e, v) => setFormData({ ...formData, displayName: v })}
                placeholder="My API"
              />
            </FormGroup>
            <FormGroup label={t('Description')} fieldId="description">
              <TextArea
                id="description"
                value={formData.description}
                onChange={(_e, v) => setFormData({ ...formData, description: v })}
                rows={3}
              />
            </FormGroup>
            <FormGroup label={t('Target HTTPRoute')} isRequired fieldId="targetHttpRoute">
              <FormSelect
                id="targetHttpRoute"
                value={`${formData.targetNamespace}/${formData.targetHttpRoute}`}
                onChange={(_e, v) => {
                  const [ns, name] = v.split('/');
                  setFormData({ ...formData, targetNamespace: ns, targetHttpRoute: name });
                }}
              >
                <FormSelectOption value="" label={t('Select an HTTPRoute...')} />
                {httpRoutesLoaded &&
                  httpRoutes?.map((route) => (
                    <FormSelectOption
                      key={`${route.metadata?.namespace}/${route.metadata?.name}`}
                      value={`${route.metadata?.namespace}/${route.metadata?.name}`}
                      label={`${route.metadata?.namespace}/${route.metadata?.name}`}
                    />
                  ))}
              </FormSelect>
            </FormGroup>
            <FormGroup label={t('Version')} fieldId="version">
              <TextInput
                id="version"
                value={formData.version}
                onChange={(_e, v) => setFormData({ ...formData, version: v })}
                placeholder="v1"
              />
            </FormGroup>
            <FormGroup label={t('Approval Mode')} fieldId="approvalMode">
              <FormSelect
                id="approvalMode"
                value={formData.approvalMode}
                onChange={(_e, v) =>
                  setFormData({ ...formData, approvalMode: v as 'manual' | 'automatic' })
                }
              >
                <FormSelectOption value="manual" label={t('Manual')} />
                <FormSelectOption value="automatic" label={t('Automatic')} />
              </FormSelect>
            </FormGroup>
            <FormGroup label={t('Publish Status')} fieldId="publishStatus">
              <FormSelect
                id="publishStatus"
                value={formData.publishStatus}
                onChange={(_e, v) =>
                  setFormData({ ...formData, publishStatus: v as 'Draft' | 'Published' })
                }
              >
                <FormSelectOption value="Draft" label={t('Draft')} />
                <FormSelectOption value="Published" label={t('Published')} />
              </FormSelect>
            </FormGroup>
            <FormGroup label={t('Tags')} fieldId="tags">
              <TextInput
                id="tags"
                value={formData.tags}
                onChange={(_e, v) => setFormData({ ...formData, tags: v })}
                placeholder="api, demo, v1"
              />
            </FormGroup>
            {error && <Alert variant="danger" isInline title={error} />}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleCreate}
            isDisabled={submitting}
            isLoading={submitting}
          >
            {t('Create')}
          </Button>
          <Button variant="link" onClick={() => setCreateModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal
        variant="medium"
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        aria-labelledby="edit-api-modal"
      >
        <ModalHeader title={t('Edit API Product')} />
        <ModalBody>
          <Form>
            <FormGroup label={t('Display Name')} isRequired fieldId="editDisplayName">
              <TextInput
                id="editDisplayName"
                value={formData.displayName}
                onChange={(_e, v) => setFormData({ ...formData, displayName: v })}
              />
            </FormGroup>
            <FormGroup label={t('Description')} fieldId="editDescription">
              <TextArea
                id="editDescription"
                value={formData.description}
                onChange={(_e, v) => setFormData({ ...formData, description: v })}
                rows={3}
              />
            </FormGroup>
            <FormGroup label={t('Version')} fieldId="editVersion">
              <TextInput
                id="editVersion"
                value={formData.version}
                onChange={(_e, v) => setFormData({ ...formData, version: v })}
              />
            </FormGroup>
            <FormGroup label={t('Approval Mode')} fieldId="editApprovalMode">
              <FormSelect
                id="editApprovalMode"
                value={formData.approvalMode}
                onChange={(_e, v) =>
                  setFormData({ ...formData, approvalMode: v as 'manual' | 'automatic' })
                }
              >
                <FormSelectOption value="manual" label={t('Manual')} />
                <FormSelectOption value="automatic" label={t('Automatic')} />
              </FormSelect>
            </FormGroup>
            <FormGroup label={t('Publish Status')} fieldId="editPublishStatus">
              <FormSelect
                id="editPublishStatus"
                value={formData.publishStatus}
                onChange={(_e, v) =>
                  setFormData({ ...formData, publishStatus: v as 'Draft' | 'Published' })
                }
              >
                <FormSelectOption value="Draft" label={t('Draft')} />
                <FormSelectOption value="Published" label={t('Published')} />
              </FormSelect>
            </FormGroup>
            <FormGroup label={t('Tags')} fieldId="editTags">
              <TextInput
                id="editTags"
                value={formData.tags}
                onChange={(_e, v) => setFormData({ ...formData, tags: v })}
              />
            </FormGroup>
            {error && <Alert variant="danger" isInline title={error} />}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleEdit}
            isDisabled={submitting}
            isLoading={submitting}
          >
            {t('Save')}
          </Button>
          <Button variant="link" onClick={() => setEditModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal
        variant="small"
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        aria-labelledby="delete-api-modal"
      >
        <ModalHeader title={t('Delete API Product')} />
        <ModalBody>
          <Alert variant="warning" isInline title={t('This action cannot be undone')}>
            {t('Deleting this API product will also delete all associated API key requests.')}
          </Alert>
          <p style={{ marginTop: '16px' }}>
            {t('Are you sure you want to delete')}{' '}
            <strong>{selectedProduct?.spec.displayName}</strong>?
          </p>
          {error && <Alert variant="danger" isInline title={error} className="pf-v6-u-mt-md" />}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={handleDelete}
            isDisabled={submitting}
            isLoading={submitting}
          >
            {t('Delete')}
          </Button>
          <Button variant="link" onClick={() => setDeleteModalOpen(false)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
