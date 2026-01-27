import * as React from 'react';
import ResourceSelect, { NamespacedResource } from '../shared/ResourceSelect';

const CLUSTER_ISSUER_GVK = { group: 'cert-manager.io', version: 'v1', kind: 'ClusterIssuer' };

interface ClusterIssuerSelectProps {
  selectedClusterIssuer: NamespacedResource;
  onChange: (updated: NamespacedResource) => void;
}

const ClusterIssuerSelect: React.FC<ClusterIssuerSelectProps> = ({
  selectedClusterIssuer,
  onChange,
}) => (
  <ResourceSelect
    gvk={CLUSTER_ISSUER_GVK}
    selected={selectedClusterIssuer}
    onChange={onChange}
    label="ClusterIssuer API Target Reference"
    placeholder="Select a ClusterIssuer"
    helperText="Cluster Issuer: Reference to the cluster issuer for the created certificate. To create an additional ClusterIssuer go to"
    fieldId="clusterissuer-select"
    isClusterScoped
  />
);

export default ClusterIssuerSelect;
