import { CubeIcon } from '@patternfly/react-icons/dist/esm/icons/cube-icon';
import { Perspective, ResolvedExtension } from '@openshift-console/dynamic-plugin-sdk';

export const icon: ResolvedExtension<Perspective>['properties']['icon'] = { default: CubeIcon };

export const getLandingPageURL: ResolvedExtension<Perspective>['properties']['landingPageURL'] = (
  _flags,
  _isFirstVisit,
) => '/api-management/all-namespaces/browse';

export const getImportRedirectURL: ResolvedExtension<Perspective>['properties']['importRedirectURL'] =
  (namespace) =>
    namespace ? `/api-management/ns/${namespace}/browse` : '/api-management/all-namespaces/browse';
