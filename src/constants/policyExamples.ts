// example specs for YAML-only policy create pages
// these provide sensible defaults when creating policies via the YAML editor

export const AUTH_POLICY_EXAMPLE = {
  rules: {
    authorization: {
      denyAll: {
        opa: {
          rego: 'allow = false',
        },
      },
    },
    response: {
      unauthorized: {
        body: {
          value: JSON.stringify(
            {
              error: 'Forbidden',
              message: 'Access denied by default. Create a specific auth policy for the route.',
            },
            null,
            2,
          ),
        },
        headers: {
          'content-type': {
            value: 'application/json',
          },
        },
      },
    },
  },
  targetRef: {
    group: 'gateway.networking.k8s.io',
    kind: 'Gateway',
    name: 'prod-web',
  },
};

export const RATE_LIMIT_POLICY_EXAMPLE = {
  targetRef: {
    group: 'gateway.networking.k8s.io',
    kind: 'Gateway',
    name: 'prod-web',
  },
  limits: {
    'toystore-api-per-username': {
      rates: [
        {
          limit: 100,
          window: '1s',
        },
        {
          limit: 1000,
          window: '1m',
        },
      ],
      counters: [{ expression: 'auth.identity.username' }],
    },
  },
};

export const OIDC_POLICY_EXAMPLE = {
  targetRef: {
    group: 'gateway.networking.k8s.io',
    kind: 'Gateway',
    name: 'my-gateway',
  },
  provider: {
    clientID: 'my-client-id',
    issuerURL: 'https://auth.example.com',
  },
};

export const PLAN_POLICY_EXAMPLE = {
  targetRef: {
    group: 'gateway.networking.k8s.io',
    kind: 'Gateway',
    name: 'my-gateway',
  },
  plans: [
    {
      tier: 'free',
      predicate: 'auth.identity.tier == "free"',
      limits: {
        daily: 1000,
      },
    },
  ],
};

export const TOKEN_RATE_LIMIT_POLICY_EXAMPLE = {
  targetRef: {
    group: 'gateway.networking.k8s.io',
    kind: 'Gateway',
    name: 'ai-gateway',
  },
  limits: {
    global: {
      rates: [
        {
          limit: 100000,
          window: '1h',
        },
      ],
    },
  },
};
