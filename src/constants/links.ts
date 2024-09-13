// Internal Links
export const INTERNAL_LINKS = {
  createPolicies: "/kuadrant/all-namespaces/policies",
  addNewGateway: (namespace: string) =>
    `/k8s/ns/${namespace}/gateway.networking.k8s.io~v1~Gateway/~new`,
};

// External Links
export const EXTERNAL_LINKS = {
  documentation: "https://access.redhat.com/articles/7065949",
  releaseNotes: "https://access.redhat.com/articles/7065949",
  quickStarts: "https://access.redhat.com/articles/7065949",
  highlights: "#", // TODO: Update the following link when available
  blog: "https://access.redhat.com/articles/7065949",
};
