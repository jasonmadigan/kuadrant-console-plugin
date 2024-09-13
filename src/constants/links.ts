// Internal Links
export const INTERNAL_LINKS = {
  createPolicies: "/kuadrant/all-namespaces/policies",
  // TODO replace
  apiDesignerOperator: (namespace: string) => 
    `/operatorhub/ns/${namespace}?keyword=api+desi&details-item=fuse-apicurito-redhat-operators-openshift-marketplace`,
  addNewGateway: (namespace: string) =>
    `/k8s/ns/${namespace}/gateway.networking.k8s.io~v1~Gateway/~new`,
  observabilitySetup: '#',
  certManagerOperator:  (namespace: string) =>
    `/operatorhub/ns/${namespace}?keyword=cert-manager&details-item=openshift-cert-manager-operator-redhat-operators-openshift-marketplace`
};

// External Links
export const EXTERNAL_LINKS = {
  // TODO: Update these when available for real
  documentation: "https://access.redhat.com/articles/7065949",
  releaseNotes: "https://access.redhat.com/articles/7065949",
  quickStarts: "https://access.redhat.com/articles/7065949",
  highlights: "#", 
  blog: "https://access.redhat.com/articles/7065949",
};
