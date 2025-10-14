# API Management RBAC Architecture

## Overview

The Kuadrant API Management feature implements a secure, multi-tenant workflow for API access requests using Kubernetes-native RBAC. This document describes the roles, permissions, and resource relationships.

## Use Cases

This section describes common scenarios and step-by-step instructions for each persona.

### Use Case 1: API Admin - Make an API Available to Consumers

**Persona:** Platform Engineer / API Provider

**Goal:** I want to make an API available to consumers via API key authentication with a rate-limited `PlanPolicy`.

**Prerequisites:**
- HTTPRoute exists for the API
- Backend service is deployed and working
- Gateway is configured and healthy
- PlanPolicy exists targeting a route to expose

**Required Permissions:**
- Read/write `HTTPRoute` resources
- Create/update `PlanPolicy` resources
- Create/update `APIProduct`s

**Steps:**

1. **Check plan in an exist `PlanPolicy` associated with an API to epose
   ```bash
   apiVersion: extensions.kuadrant.io/v1alpha1
   kind: PlanPolicy
   metadata:
     name: toystore-plan
     namespace: toystore-ns
   spec:
     targetRef:
       kind: HTTPRoute
       name: toystore
     plans:
       - tier: gold
         limits:
           daily: 10000
           weekly: 50000
           custom:
             - limit: 100
               window: 1m
         predicate: 'auth.identity.metadata.annotations["secret.kuadrant.io/plan-id"] == "gold"'
       - tier: silver
         limits:
           daily: 5000
           weekly: 20000
           custom:
             - limit: 50
               window: 1m
         predicate: 'auth.identity.metadata.annotations["secret.kuadrant.io/plan-id"] == "silver"'
       - tier: bronze
         limits:
           daily: 1000
           weekly: 5000
           custom:
             - limit: 10
               window: 1m
         predicate: 'auth.identity.metadata.annotations["secret.kuadrant.io/plan-id"] == "bronze"'
   ```

2. **Create APIProduct to publish to catalog**

   Copy* the plan information from PlanPolicy and add documentation/contact details:

   _* for now, via a copy - eventually replace with a `planPolicyRef` that can keep these in sync when we've got a controller _

   ```bash
   kubectl apply -f - <<EOF
   apiVersion: extensions.kuadrant.io/v1alpha1
   kind: APIProduct
   metadata:
     name: toystore-api
     namespace: kuadrant-system
   spec:
     displayName: "Toy Store API"
     description: "RESTful API for managing toy inventory, orders, and customer data"
     version: "v1"
     tags: ["retail", "inventory", "e-commerce"]

     # Reference to the PlanPolicy
     planPolicyRef:
       name: toystore-plan
       namespace: toystore-ns

     # Copy plan info from PlanPolicy (for consumer visibility)
     plans:
       - tier: gold
         description: "Premium tier with highest rate limits for production use"
         limits:
           daily: 10000
           weekly: 50000
           custom:
             - limit: 100
               window: 1m
       - tier: silver
         description: "Standard tier suitable for most applications"
         limits:
           daily: 5000
           weekly: 20000
           custom:
             - limit: 50
               window: 1m
       - tier: bronze
         description: "Basic tier for development and testing"
         limits:
           daily: 1000
           weekly: 5000
           custom:
             - limit: 10
               window: 1m

     # Documentation
     documentation:
       openAPISpec: "https://toystore.apps.example.com/openapi.yaml"
       swaggerUI: "https://toystore.apps.example.com/docs"
       docsURL: "https://docs.example.com/apis/toystore"
       gitRepository: "https://github.com/example-org/toystore-api"

     # Contact info
     contact:
       team: "Retail Platform Team"
       email: "retail-platform@example.com"
       slack: "#retail-api-support"
       url: "https://wiki.example.com/teams/retail-platform"
   EOF
   ```

3. **Verify APIProduct is visible to consumers**
   ```bash
   kubectl get apiproduct toystore-api -n kuadrant-system

   # Test as a consumer
   kubectl auth can-i get apiproducts --as=alice@example.com -n kuadrant-system
   # Should return: yes
   ```

**Result:** API is now discoverable in the catalog and consumers can request access.

---

### Use Case 2: API Consumer - Request Access to an API

**Persona:** Application Developer

**Goal:** I want to get an API key to access an API for my application.

**Prerequisites:**
- APIProduct exists in catalog
- Access to a namespace where I can create `APIKeyRequest`s

**Required Permissions:**
- Read `APIProduct` resources
- Create/read `APIKeyRequest` resources in my namespace

**Steps:**

1. **Browse available APIs and select one**
   ```bash
   # via console: Kuadrant → API Management → Browse APIs
   # via kubectl:
   kubectl get apiproducts -n kuadrant-system
   kubectl get apiproduct toystore-api -n kuadrant-system -o yaml
   ```

2. **Create an access request**
   ```bash
   kubectl apply -f - <<EOF
   apiVersion: extensions.kuadrant.io/v1alpha1
   kind: APIKeyRequest
   metadata:
     name: alice-toystore-req
     namespace: dev-team-a
   spec:
     apiName: toystore
     apiNamespace: toystore-ns
     planTier: silver
     useCase: "Building mobile app for internal toy marketplace"
     requestedBy:
       userId: alice
       email: alice@example.com
   EOF
   ```

3. **Wait for approval and retrieve key**
   ```bash
   # check status
   kubectl get apikeyrequest alice-toystore-req -n dev-team-a

   # retrieve approved key
   kubectl get apikeyrequest alice-toystore-req -n dev-team-a -o jsonpath='{.status.apiKey}'

   # use key in API requests
   curl -H "Authorization: APIKEY $API_KEY" https://toystore.apps.example.com/products
   ```

**Result:** You have an API key and can make authenticated requests to the API.

---

### Use Case 3: API Approver - Review and Approve Access Requests

**Persona:** Platform Administrator / API Gateway Operator

**Goal:** I want to review pending API access requests and approve legitimate ones.

**Prerequisites:**
- Admin/approver role with cluster-wide permissions
- `APIKeyRequest`s exist awaiting approval

**Required Permissions:**
- List/watch `APIKeyRequest` resources (all namespaces)
- Update `APIKeyRequest` status (approve/reject)
- Create `Secret` resources (for API keys)
- Read `PlanPolicy` resources (to verify limits)

**Steps:**

1. **View pending requests**
   ```bash
   # via console: Kuadrant → API Management → Approval Queue
   # via kubectl:
   kubectl get apikeyrequests -A
   ```

2. **Review and approve/reject**
   ```bash
   # review details
   kubectl get apikeyrequest alice-toystore-req -n dev-team-a -o yaml

   # optionally verify PlanPolicy limits
   kubectl get planpolicy toystore-plan -n toystore-ns -o yaml

   # approve (via console or kubectl)
   kubectl patch apikeyrequest alice-toystore-req -n dev-team-a \
     --type=merge \
     --subresource=status \
     -p '{
       "status": {
         "phase": "Approved",
         "apiKey": "generated-key",
         "reviewedBy": "admin@example.com",
         "reviewedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
       }
     }'

   # or reject with reason
   kubectl patch apikeyrequest alice-toystore-req -n dev-team-a \
     --type=merge \
     --subresource=status \
     -p '{"status": {"phase": "Rejected", "reason": "Need more details"}}'
   ```

**Result:** Request is approved and consumer can use their API key. Secret is created in API namespace for Authorino validation.

---

### Use Case 4: API Consumer - Update or Delete a Request

**Persona:** Application Developer

**Goal:** I want to edit or delete a pending request.

**Prerequisites:**
- Existing `APIKeyRequest` in my namespace
- Request is still pending (not approved/rejected)

**Required Permissions:**
- Update/patch/delete `APIKeyRequest` resources in my namespace

**Steps:**

1. **Edit a pending request**
   ```bash
   # via console: API Management → My Requests → Edit
   # via kubectl:
   kubectl patch apikeyrequest alice-toystore-req -n dev-team-a \
     --type=merge \
     -p '{"spec": {"useCase": "Updated use case details"}}'
   ```

2. **Delete a request**
   ```bash
   # via console: API Management → My Requests → Delete
   # via kubectl:
   kubectl delete apikeyrequest alice-toystore-req -n dev-team-a
   ```

**Result:** Request is updated or removed. Note: can only edit `spec` fields, not `status` (approval state).

---

### Use Case 5: API Admin - Update Plan Limits

**Persona:** Platform Engineer / API Provider

**Goal:** I want to change the rate limits for an API's plans.

**Prerequisites:**
- Existing `PlanPolicy` and `APIProduct` for the API

**Required Permissions:**
- Update `PlanPolicy` resources in API namespace
- Update `APIProduct` resources in catalog namespace

**Steps:**

1. **Update the PlanPolicy**
   ```bash
   kubectl patch planpolicy toystore-plan -n toystore-ns --type=merge -p '
   {
     "spec": {
       "plans": [
         {
           "tier": "gold",
           "limits": {
             "daily": 20000,
             "custom": [{"limit": 200, "window": "1m"}]
           }
         }
       ]
     }
   }'

   # wait for enforcement
   kubectl get planpolicy toystore-plan -n toystore-ns -o jsonpath='{.status.conditions[?(@.type=="Enforced")]}'
   ```

2. **Update the APIProduct to match**

   _Plan info is cached in APIProduct - must update manually (or wait for future controller):_

   ```bash
   kubectl patch apiproduct toystore-api -n kuadrant-system --type=merge -p '
   {
     "spec": {
       "plans": [
         {
           "tier": "gold",
           "description": "Premium tier",
           "limits": {"daily": 20000, "custom": [{"limit": 200, "window": "1m"}]}
         }
       ]
     }
   }'
   ```

**Result:** Rate limits are updated. Consumers see new limits in catalog. Existing API keys continue to work.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ API Provider (Platform Engineer)                            │
│                                                              │
│ 1. Creates HTTPRoute for API                                │
│ 2. Attaches PlanPolicy with rate limit tiers                │
│ 3. Creates APIProduct (catalog entry)                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ APIProduct (extensions.kuadrant.io/v1alpha1)                │
│ Namespace: kuadrant-system or provider namespace            │
│                                                              │
│ spec:                                                        │
│   displayName: "Toy Store API"                              │
│   description: "RESTful API for toy store operations"       │
│   planPolicyRef:                                             │
│     name: toystore-plan           ─────────────┐            │
│     namespace: toystore-ns                     │            │
│   plans:  (cached from PlanPolicy)             │            │
│     - tier: gold                               │            │
│       limits: { daily: 10000 }                 │            │
│     - tier: silver                             │            │
│       limits: { daily: 5000 }                  │            │
│   documentation:                               │            │
│     openAPISpec: "https://..."                 │            │
│     swaggerUI: "https://..."                   │            │
└────────────────────────────────────────────────┼────────────┘
                          │                      │
                          │ Read (Browse APIs)   │ Referenced by
                          ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Consumer/Developer                  PlanPolicy               │
│ Namespace: dev-team-a               (admin-only)             │
│                                                              │
│ 1. Browses APIProducts                                       │
│ 2. Selects plan tier                                         │
│ 3. Creates APIKeyRequest ───────┐                           │
└─────────────────────────────────┼───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ APIKeyRequest (extensions.kuadrant.io/v1alpha1)             │
│ Namespace: dev-team-a                                        │
│                                                              │
│ spec:                                                        │
│   apiName: toystore                                          │
│   apiNamespace: toystore-ns                                  │
│   planTier: silver                                           │
│   requestedBy:                                               │
│     userId: alice                                            │
│     email: alice@example.com                                 │
│                                                              │
│ status: {} ← empty, waiting for approval                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Review & Approve
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Approver/Admin                                               │
│                                                              │
│ 1. Lists APIKeyRequests across all namespaces               │
│ 2. Reviews request details                                   │
│ 3. Verifies PlanPolicy for current limits                    │
│ 4. Approves or Rejects ─────────┐                           │
└─────────────────────────────────┼───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ APIKeyRequest - Updated                                      │
│                                                              │
│ status:                                                      │
│   phase: Approved                                            │
│   apiKey: "abc123..."                                        │
│   reviewedBy: admin@example.com                              │
│   reviewedAt: "2025-10-15T10:00:00Z"                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Read approved key
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Consumer uses API key in requests                           │
└─────────────────────────────────────────────────────────────┘
```

## Roles and Permissions

### 1. Consumer/Developer Role

**Target Users:** Application developers requesting API access

**Permissions:**
```yaml
# Can browse API catalog
- apiGroups: ["extensions.kuadrant.io"]
  resources: ["apiproducts"]
  verbs: ["get", "list"]

# Can manage their own requests
- apiGroups: ["extensions.kuadrant.io"]
  resources: ["apikeyrequests"]
  verbs: ["create", "get", "list", "watch", "update", "patch", "delete"]

# Can read status (approved keys) but NOT update it
- apiGroups: ["extensions.kuadrant.io"]
  resources: ["apikeyrequests/status"]
  verbs: ["get", "list"]

# Cannot read PlanPolicies (platform configuration)
```

**Capabilities:**
- ✅ Browse APIProduct catalog with plan details
- ✅ See rate limits from cached plan info
- ✅ Create API access requests
- ✅ Edit pending requests (use case, etc.)
- ✅ Delete their own requests
- ✅ View approved API keys in request status
- ❌ Approve their own requests
- ❌ View PlanPolicy configuration
- ❌ See other teams' requests (namespace isolation)

**Example RoleBinding:**
```bash
kubectl create rolebinding developer-api-access \
  --role=api-key-requester \
  --user=alice@example.com \
  --namespace=dev-team-a
```

### 2. Approver/Admin Role

**Target Users:** Platform administrators, API gateway operators

**Permissions:**
```yaml
# Can read API catalog
- apiGroups: ["extensions.kuadrant.io"]
  resources: ["apiproducts"]
  verbs: ["get", "list"]

# Can view all requests across namespaces
- apiGroups: ["extensions.kuadrant.io"]
  resources: ["apikeyrequests"]
  verbs: ["get", "list", "watch"]

# Can approve/reject by updating status
- apiGroups: ["extensions.kuadrant.io"]
  resources: ["apikeyrequests/status"]
  verbs: ["get", "update", "patch"]

# Can create secrets for API keys
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["create", "get"]

# Can read PlanPolicies to verify limits
- apiGroups: ["extensions.kuadrant.io"]
  resources: ["planpolicies"]
  verbs: ["get", "list"]
```

**Capabilities:**
- ✅ View all APIKeyRequests cluster-wide
- ✅ Approve requests (sets status, creates Secret)
- ✅ Reject requests with reason
- ✅ View PlanPolicy details for verification
- ✅ See current rate limits and configuration
- ❌ Modify request spec fields (owned by requester)

**Example ClusterRoleBinding:**
```bash
kubectl create clusterrolebinding api-admins \
  --clusterrole=api-key-approver \
  --group=platform-admins
```

### 3. Platform Engineer Role

**Target Users:** API providers, infrastructure teams

**Permissions:**
```yaml
# Full access to all API management resources
- apiGroups: ["extensions.kuadrant.io"]
  resources: ["apiproducts", "planpolicies"]
  verbs: ["*"]

# Full access to Gateway API resources
- apiGroups: ["gateway.networking.k8s.io"]
  resources: ["httproutes"]
  verbs: ["*"]
```

**Capabilities:**
- ✅ Create HTTPRoutes
- ✅ Define PlanPolicies with rate limits
- ✅ Publish APIProducts
- ✅ Update plan information
- ✅ Manage API lifecycle

## Custom Resource Definitions

### APIProduct

**Purpose:** API catalog entry visible to consumers

**Location:** Typically `kuadrant-system` namespace

**Key Fields:**
```yaml
apiVersion: extensions.kuadrant.io/v1alpha1
kind: APIProduct
spec:
  displayName: "Toy Store API"
  description: "RESTful API for toy store operations"
  version: "v1"

  # Reference to PlanPolicy (admin-only resource)
  planPolicyRef:
    name: toystore-plan
    namespace: toystore-ns

  # Cached plan info (visible to consumers)
  plans:
    - tier: gold
      description: "Premium access"
      limits:
        daily: 10000
        weekly: 50000
    - tier: silver
      limits:
        daily: 5000

  # Documentation
  documentation:
    openAPISpec: "https://api.example.com/openapi.yaml"
    swaggerUI: "https://api.example.com/docs"
    gitRepository: "https://github.com/org/toystore"

  # Contact
  contact:
    team: "Platform Team"
    email: "platform@example.com"
    slack: "#api-support"
```

### APIKeyRequest

**Purpose:** Consumer request for API access

**Location:** Consumer's namespace

**Key Fields:**
```yaml
apiVersion: extensions.kuadrant.io/v1alpha1
kind: APIKeyRequest
metadata:
  name: alice-toystore-abc123
  namespace: dev-team-a
spec:
  apiName: toystore
  apiNamespace: toystore-ns
  planTier: silver
  useCase: "Building mobile app for toy marketplace"
  requestedBy:
    userId: alice
    email: alice@example.com
  requestedAt: "2025-10-15T09:30:00Z"

status:
  phase: Approved
  reviewedBy: admin@example.com
  reviewedAt: "2025-10-15T10:00:00Z"
  reason: "approved"
  apiKey: "abc123..."
  apiHostname: "toystore.apps.example.com"
  apiBasePath: "/api/v1"
```

### PlanPolicy

**Purpose:** Rate limiting configuration (Kuadrant core resource)

**Location:** Same namespace as HTTPRoute

**Access:** Admin-only, not visible to consumers

**Key Fields:**
```yaml
apiVersion: extensions.kuadrant.io/v1alpha1
kind: PlanPolicy
metadata:
  name: toystore-plan
  namespace: toystore-ns
spec:
  targetRef:
    kind: HTTPRoute
    name: toystore
  plans:
    - tier: gold
      limits:
        daily: 10000
        custom:
          - limit: 100
            window: 1m
      predicate: 'auth.identity.metadata.annotations["secret.kuadrant.io/plan-id"] == "gold"'
    - tier: silver
      limits:
        daily: 5000
```

## Security Considerations

### Status Subresource Protection

APIKeyRequest uses Kubernetes status subresources to enforce approval workflow:

- **Spec fields:** Editable by requester (apiName, planTier, useCase)
- **Status fields:** Only editable by approvers (phase, apiKey, reviewedBy)
- **Enforcement:** Native Kubernetes RBAC at API server level

This prevents users from self-approving requests via any tool (kubectl, console, API).

### Namespace Isolation

- APIKeyRequests are created in the consumer's namespace
- RBAC automatically prevents cross-namespace access
- Approvers use cluster-scoped role to view all namespaces
- No label-based filtering needed (unlike ConfigMap approach)

### Plan Information Caching

APIProduct caches plan details from PlanPolicy:

**Why?**
- Consumers cannot read PlanPolicy resources (platform config)
- Consumers need to see rate limits before requesting access
- Avoids granting PlanPolicy read permissions to all users

**Trade-off:**
- Plan info could drift if PlanPolicy is updated
- Manual sync required on initial create
- Future: controller could watch PlanPolicy and update APIProducts

### API Key Storage

**During Approval:**
1. Admin approves request
2. System generates API key
3. Key stored in Secret (namespace: apiNamespace)
4. Key also copied to APIKeyRequest.status.apiKey for user visibility

**Secret Labels:**
```yaml
metadata:
  labels:
    authorino.kuadrant.io/managed-by: authorino
    app: toystore
  annotations:
    secret.kuadrant.io/plan-id: silver
    secret.kuadrant.io/user-id: alice
```

These labels allow Authorino to identify and validate API keys against plan predicates.

## Workflow Examples

### Example 1: Developer Requests Access

```bash
# 1. Developer browses available APIs
kubectl get apiproducts -n kuadrant-system

# 2. Views details of an API
kubectl get apiproduct toystore-api -n kuadrant-system -o yaml

# 3. Creates access request in their namespace
kubectl apply -f - <<EOF
apiVersion: extensions.kuadrant.io/v1alpha1
kind: APIKeyRequest
metadata:
  name: alice-toystore-req
  namespace: dev-team-a
spec:
  apiName: toystore
  apiNamespace: toystore-ns
  planTier: silver
  useCase: "Building mobile app"
  requestedBy:
    userId: alice
    email: alice@example.com
EOF

# 4. Checks status later
kubectl get apikeyrequest alice-toystore-req -n dev-team-a -o yaml
# Shows status.phase: Approved and status.apiKey
```

### Example 2: Admin Approves Request

```bash
# 1. Lists all pending requests
kubectl get apikeyrequests -A

# 2. Reviews specific request
kubectl get apikeyrequest alice-toystore-req -n dev-team-a -o yaml

# 3. Checks PlanPolicy for verification
kubectl get planpolicy toystore-plan -n toystore-ns -o yaml

# 4. Approves via console UI or kubectl patch
kubectl patch apikeyrequest alice-toystore-req -n dev-team-a \
  --type=merge \
  --subresource=status \
  -p '{
    "status": {
      "phase": "Approved",
      "apiKey": "generated-key-here",
      "reviewedBy": "admin@example.com",
      "reviewedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }'
```

### Example 3: Platform Engineer Publishes API

```bash
# 1. Create HTTPRoute
kubectl apply -f httproute-toystore.yaml

# 2. Create PlanPolicy
kubectl apply -f - <<EOF
apiVersion: extensions.kuadrant.io/v1alpha1
kind: PlanPolicy
metadata:
  name: toystore-plan
  namespace: toystore-ns
spec:
  targetRef:
    kind: HTTPRoute
    name: toystore
  plans:
    - tier: gold
      limits: { daily: 10000 }
    - tier: silver
      limits: { daily: 5000 }
EOF

# 3. Create APIProduct (copying plan info from PlanPolicy)
kubectl apply -f - <<EOF
apiVersion: extensions.kuadrant.io/v1alpha1
kind: APIProduct
metadata:
  name: toystore-api
  namespace: kuadrant-system
spec:
  displayName: "Toy Store API"
  description: "RESTful API for toy store operations"
  planPolicyRef:
    name: toystore-plan
    namespace: toystore-ns
  plans:
    - tier: gold
      description: "Premium access"
      limits: { daily: 10000 }
    - tier: silver
      description: "Standard access"
      limits: { daily: 5000 }
  documentation:
    openAPISpec: "https://toystore.apps.example.com/openapi.yaml"
EOF
```

## Deployment

### Apply RBAC Roles

```bash
# Create requester role (namespace-scoped)
kubectl apply -f config/rbac/api-key-requester-role.yaml

# Create approver clusterrole
kubectl apply -f config/rbac/api-key-approver-clusterrole.yaml

# Bind to users/groups
kubectl create rolebinding dev-team-a-api-access \
  --role=api-key-requester \
  --group=developers \
  --namespace=dev-team-a

kubectl create clusterrolebinding api-approvers \
  --clusterrole=api-key-approver \
  --group=platform-admins
```

### Apply CRDs

```bash
# Apply custom resource definitions
kubectl apply -f config/crd/extensions.kuadrant.io_apiproduct.yaml
kubectl apply -f config/crd/extensions.kuadrant.io_apikeyrequest.yaml

# PlanPolicy CRD is installed by Kuadrant operator
```

## Future Enhancements

### Controller for Plan Sync

A controller could watch PlanPolicies and automatically update corresponding APIProducts:

```
PlanPolicy Updated → Controller detects change
                  → Finds APIProducts referencing this PlanPolicy
                  → Updates APIProduct.spec.plans with new limits
                  → Updates APIProduct.status.lastSyncTime
```

### Webhook Validation

Add validating webhooks to enforce business rules:
- Prevent requesting non-existent plans
- Validate apiName exists in cluster
- Check user hasn't exceeded request quota

### Metrics and Observability

Track events for analytics:
- Request created/approved/rejected rates
- Time to approval
- Most requested APIs
- Plan tier distribution

## Troubleshooting

**User can't see APIProducts:**
```bash
# Check RBAC permissions
kubectl auth can-i get apiproducts --as=alice@example.com -n kuadrant-system

# Verify role binding
kubectl get rolebinding -n kuadrant-system
```

**User can't create requests:**
```bash
# Check permissions in their namespace
kubectl auth can-i create apikeyrequests --as=alice@example.com -n dev-team-a

# Create role binding if missing
kubectl create rolebinding alice-api-access \
  --role=api-key-requester \
  --user=alice@example.com \
  --namespace=dev-team-a
```

**Admin can't approve:**
```bash
# Check cluster-level permissions
kubectl auth can-i patch apikeyrequests/status --as=admin@example.com -A

# Verify cluster role binding
kubectl get clusterrolebinding api-approvers
```

## References

- CRD Definitions: `config/crd/`
- RBAC Roles: `config/rbac/`
- Detailed RBAC README: `config/rbac/README.md`
- Architecture Notes: `CLAUDE.md` (API Management RBAC Architecture section)
