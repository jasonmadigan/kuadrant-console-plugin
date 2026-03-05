import { TargetRef } from '../shared/types';
export { TargetRef };

export interface Rate {
  limit: number;
  window: string;
}

export interface Counter {
  expression: string;
}

export interface Predicate {
  predicate: string;
}

export interface LimitConfig {
  rates?: Rate[];
  counters?: Counter[];
  when?: Predicate[];
}

export interface DefaultsOrOverrides {
  limits?: Record<string, LimitConfig>;
  strategy?: 'atomic' | 'merge';
  when?: Predicate[];
}

export interface RateLimitPolicySpec {
  targetRef: TargetRef;
  limits?: Record<string, LimitConfig>;
  defaults?: DefaultsOrOverrides;
  overrides?: DefaultsOrOverrides;
  when?: Predicate[];
}

export interface RateLimitPolicy {
  apiVersion: string;
  kind: string;
  metadata: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  spec: RateLimitPolicySpec;
}
