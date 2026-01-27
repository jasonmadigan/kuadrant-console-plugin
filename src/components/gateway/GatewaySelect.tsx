import * as React from 'react';
import ResourceSelect, { NamespacedResource } from '../shared/ResourceSelect';
import { getGVK } from '../../utils/resources';

interface GatewaySelectProps {
  selectedGateway: NamespacedResource;
  onChange: (updated: NamespacedResource) => void;
}

const GatewaySelect: React.FC<GatewaySelectProps> = ({ selectedGateway, onChange }) => (
  <ResourceSelect
    gvk={getGVK('Gateway')}
    selected={selectedGateway}
    onChange={onChange}
    label="Gateway API Target Reference"
    placeholder="Select a gateway"
    helperText="Gateway: Reference to a Kubernetes resource that the policy attaches to. To create an additional gateway go to"
    fieldId="gateway-select"
  />
);

export default GatewaySelect;
