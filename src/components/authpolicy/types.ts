export interface TargetRef {
  group: string;
  kind: 'HTTPRoute' | 'Gateway';
  name: string;
  sectionName?: string;
}

export type PatternOperator = 'eq' | 'neq' | 'incl' | 'excl' | 'matches';

export interface PatternExpression {
  selector: string;
  operator: PatternOperator;
  value: string;
}

// when predicates support simple, nested (all/any), and patternRef forms
export type WhenPredicate =
  | { selector: string; operator: PatternOperator; value: string }
  | { all: { patternExpression: PatternExpression }[] }
  | { any: { patternExpression: PatternExpression }[] }
  | { patternRef: string };

export interface SelectorValue {
  selector?: string;
  value?: string;
}

export interface CacheConfig {
  key: SelectorValue;
  ttl: number;
}

// credentials source - one-of
export type Credentials =
  | { authorizationHeader: { prefix: string } }
  | { cookie: { name: string } }
  | { customHeader: { name: string } }
  | { queryString: { name: string } };

export type CredentialsType = 'authorizationHeader' | 'cookie' | 'customHeader' | 'queryString';

export interface HttpRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  body?: SelectorValue;
  bodyParameters?: Record<string, SelectorValue>;
  headers?: Record<string, SelectorValue>;
  credentials?: Credentials;
  contentType?: string;
  oauth2?: OAuth2Config;
}

export interface OAuth2Config {
  tokenUrl: string;
  clientId: string;
  clientSecretRef: { name: string; namespace?: string };
  scopes?: string[];
  extraParams?: Record<string, string>;
  cache?: boolean;
}

// authentication types
export type AuthenticationType =
  | 'apiKey'
  | 'jwt'
  | 'oauth2Introspection'
  | 'kubernetesTokenReview'
  | 'x509'
  | 'plain'
  | 'anonymous';

export interface ApiKeyAuth {
  selector: { matchLabels: Record<string, string> };
  allNamespaces?: boolean;
}

export interface JwtAuth {
  issuerUrl: string;
  ttl?: number;
}

export interface OAuth2IntrospectionAuth {
  endpoint: string;
  credentialsRef: { name: string };
  tokenTypeHint?: string;
}

export interface KubernetesTokenReviewAuth {
  audiences: string[];
}

export interface X509Auth {
  selector: { matchLabels: Record<string, string> };
  allNamespaces?: boolean;
}

export interface PlainAuth {
  selector: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AnonymousAuth {}

export interface EvaluatorCommon {
  cache?: CacheConfig;
  priority?: number;
  when?: WhenPredicate[];
  metrics?: boolean;
}

export interface AuthenticationSpec extends EvaluatorCommon {
  apiKey?: ApiKeyAuth;
  jwt?: JwtAuth;
  oauth2Introspection?: OAuth2IntrospectionAuth;
  kubernetesTokenReview?: KubernetesTokenReviewAuth;
  x509?: X509Auth;
  plain?: PlainAuth;
  anonymous?: AnonymousAuth;
  credentials?: Credentials;
  defaults?: Record<string, SelectorValue>;
  overrides?: Record<string, SelectorValue>;
}

// metadata types
export type MetadataType = 'http' | 'userInfo' | 'uma';

export interface UserInfoMetadata {
  identitySource: string;
}

export interface UmaMetadata {
  endpoint: string;
  credentialsRef: { name: string };
}

export interface MetadataSpec extends EvaluatorCommon {
  http?: HttpRequestConfig;
  userInfo?: UserInfoMetadata;
  uma?: UmaMetadata;
}

// authorization types
export type AuthorizationType =
  | 'patternMatching'
  | 'opa'
  | 'kubernetesSubjectAccessReview'
  | 'spicedb';

export interface PatternMatchingAuthz {
  patterns: PatternExpression[];
}

export interface OpaAuthz {
  rego?: string;
  allValues?: boolean;
  externalPolicy?: HttpRequestConfig;
}

export interface KubernetesSubjectAccessReviewAuthz {
  user?: SelectorValue;
  groups?: SelectorValue[];
  resourceAttributes?: {
    group?: SelectorValue;
    resource?: SelectorValue;
    verb?: SelectorValue;
    name?: SelectorValue;
    namespace?: SelectorValue;
    subresource?: SelectorValue;
  };
}

export interface SpiceDbAuthz {
  endpoint: string;
  insecure?: boolean;
  sharedSecretRef?: { name: string };
  subject?: SelectorValue;
  resource?: SelectorValue;
  permission?: SelectorValue;
}

export interface AuthorizationSpec extends EvaluatorCommon {
  patternMatching?: PatternMatchingAuthz;
  opa?: OpaAuthz;
  kubernetesSubjectAccessReview?: KubernetesSubjectAccessReviewAuthz;
  spicedb?: SpiceDbAuthz;
}

// response types
export interface DenyWithSpec {
  body?: SelectorValue;
  code?: number;
  headers?: Record<string, SelectorValue>;
}

export interface WristbandConfig {
  issuer: string;
  signingKeyRefs: { name: string; algorithm: string }[];
  tokenDuration?: number;
  customClaims?: Record<string, SelectorValue>;
}

export interface SuccessResponseSpec extends EvaluatorCommon {
  json?: Record<string, SelectorValue>;
  plain?: SelectorValue;
  wristband?: WristbandConfig;
  key?: string;
}

export interface ResponseSpec {
  unauthenticated?: DenyWithSpec;
  unauthorized?: DenyWithSpec;
  success?: {
    headers?: Record<string, SuccessResponseSpec>;
    filters?: Record<string, SuccessResponseSpec>;
  };
}

// callback types
export interface CallbackSpec extends EvaluatorCommon {
  http: HttpRequestConfig;
}

// auth scheme spec wraps all rule types
export interface AuthSchemeSpec {
  authentication?: Record<string, AuthenticationSpec>;
  metadata?: Record<string, MetadataSpec>;
  authorization?: Record<string, AuthorizationSpec>;
  response?: ResponseSpec;
  callbacks?: Record<string, CallbackSpec>;
}

export type Strategy = 'atomic' | 'merge';

export interface AuthPolicySpecProper {
  patterns?: Record<string, { allOf: PatternExpression[] }>;
  when?: WhenPredicate[];
  rules?: AuthSchemeSpec;
}

export interface DefaultsOrOverrides extends AuthPolicySpecProper {
  strategy?: Strategy;
}

export interface AuthPolicySpec {
  targetRef: TargetRef;
  defaults?: DefaultsOrOverrides;
  overrides?: DefaultsOrOverrides;
  // bare fields = implicit defaults
  patterns?: Record<string, { allOf: PatternExpression[] }>;
  when?: WhenPredicate[];
  rules?: AuthSchemeSpec;
}

export interface AuthPolicy {
  apiVersion: string;
  kind: string;
  metadata: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  spec: AuthPolicySpec;
}
