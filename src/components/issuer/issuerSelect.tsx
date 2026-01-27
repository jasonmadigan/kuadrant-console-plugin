import * as React from 'react';
import ResourceSelect, { NamespacedResource } from '../shared/ResourceSelect';

const ISSUER_GVK = { group: 'cert-manager.io', version: 'v1', kind: 'Issuer' };

interface IssuerSelectProps {
  selectedIssuer: NamespacedResource;
  onChange: (updated: NamespacedResource) => void;
}

const IssuerSelect: React.FC<IssuerSelectProps> = ({ selectedIssuer, onChange }) => (
  <ResourceSelect
    gvk={ISSUER_GVK}
    selected={selectedIssuer}
    onChange={onChange}
    label="Issuer API Target Reference"
    placeholder="Select an Issuer"
    helperText="Issuer: Reference to the issuer for the created certificate. To create an additional Issuer go to"
    fieldId="issuer-select"
  />
);

export default IssuerSelect;
