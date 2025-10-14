export interface PlanPolicy {
  apiVersion: string;
  kind: string;
  metadata: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  spec: {
    targetRef: TargetRef;
    plans: Plan[];
  };
  status?: PlanPolicyStatus;
}

export interface Plan {
  tier: string;
  predicate?: string;
  description?: string;
  limits?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
    yearly?: number;
    custom?: Array<{
      limit: number;
      window: string;
    }>;
  };
}

export interface TargetRef {
  group: string;
  kind: 'HTTPRoute' | 'Gateway';
  name: string;
  namespace?: string;
}

export interface PlanPolicyStatus {
  conditions?: Condition[];
}

export interface Condition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}
