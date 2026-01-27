import * as React from 'react';
import ResourceSelect, { NamespacedResource } from '../shared/ResourceSelect';
import { getGVK } from '../../utils/resources';

interface HTTPRouteSelectProps {
  selectedHTTPRoute: NamespacedResource;
  onChange: (updated: NamespacedResource) => void;
}

const HTTPRouteSelect: React.FC<HTTPRouteSelectProps> = ({ selectedHTTPRoute, onChange }) => (
  <ResourceSelect
    gvk={getGVK('HTTPRoute')}
    selected={selectedHTTPRoute}
    onChange={onChange}
    label="HTTPRoute API Target Reference"
    placeholder="Select an HTTPRoute"
    helperText="You can view and create HTTPRoutes"
    fieldId="httproute-select"
  />
);

export default HTTPRouteSelect;
