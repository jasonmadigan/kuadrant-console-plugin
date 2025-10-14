# Testing Console Plugin with Different Permission Levels

This directory contains ServiceAccount configurations for testing the Kuadrant Console Plugin with different permission levels.

## Test Users

### 1. API Consumer (api-consumer)
- **Purpose**: Test the API Management portal from a developer's perspective
- **Permissions**:
  - Read HTTPRoutes (all namespaces) - browse available APIs
  - Read PlanPolicies (all namespaces) - see API plans
  - Create/Read ConfigMaps in api-requests namespace - request API keys
  - Read own ConfigMaps - view request status

### 2. API Admin (api-admin)
- **Purpose**: Test the full Policies management interface and API approval workflow
- **Permissions**:
  - Full access to all Kuadrant policies (AuthPolicy, DNSPolicy, RateLimitPolicy, TLSPolicy, PlanPolicy)
  - Read/Write HTTPRoutes and Gateways
  - Full access to api-requests namespace (for approval queue and API key management)
  - Create/update ConfigMaps and Secrets

### 3. Limited Viewer (limited-viewer)
- **Purpose**: Test permission errors and restricted access
- **Permissions**:
  - Only read AuthPolicy and RateLimitPolicy
  - No access to DNSPolicy, TLSPolicy, or PlanPolicy

## Setup

### Create ServiceAccounts and Bindings

```bash
# Create all test users
kubectl apply -f test-users/

# Verify creation
kubectl get sa -n kuadrant-test-users
kubectl get clusterrolebinding | grep kuadrant-test
```

### Get ServiceAccount Token

```bash
# For api-consumer
kubectl create token api-consumer -n kuadrant-test-users --duration=8h

# For api-admin
kubectl create token api-admin -n kuadrant-test-users --duration=8h

# For limited-viewer
kubectl create token limited-viewer -n kuadrant-test-users --duration=8h
```

### Use Token with kubectl/oc

```bash
# Save token to variable
TOKEN=$(kubectl create token api-consumer -n kuadrant-test-users --duration=8h)

# Test with kubectl
kubectl --token=$TOKEN get planpolicies -A

# Or create a kubeconfig context
kubectl config set-credentials api-consumer --token=$TOKEN
kubectl config set-context api-consumer --cluster=$(kubectl config current-context | cut -d/ -f1) --user=api-consumer
kubectl config use-context api-consumer
```

## Testing with OpenShift Console

Unfortunately, the OpenShift Console doesn't directly support ServiceAccount tokens for browser-based login. However, you can:

### Method 1: Use Impersonation (Requires cluster-admin)

```bash
# As cluster-admin, impersonate the ServiceAccount
oc --as=system:serviceaccount:kuadrant-test-users:api-consumer get planpolicies -A
```

### Method 2: Create HTPasswd Users with RoleBindings

See `htpasswd-users/README.md` for instructions on creating real users with the same permissions.

### Method 3: Test via kubectl with Plugin Development

The console plugin runs in the browser and uses your logged-in user's credentials. To test different permissions:

1. Create HTPasswd users (see htpasswd-users/)
2. Log in to OpenShift Console as that user
3. The plugin will use that user's permissions

## Permission Testing Checklist

### API Consumer Tests (4 tabs visible)
- [ ] **Can** view Browse APIs tab - see available APIs
- [ ] **Can** view My APIs tab - see own approved APIs with keys
- [ ] **Can** view My API Keys tab - see own API keys
- [ ] **Can** view My Requests tab - see own requests
- [ ] **Can** request access to APIs from Browse APIs
- [ ] **Cannot** see Approval Queue tab
- [ ] **Cannot** see API Key Overview tab
- [ ] **Cannot** access Kuadrant > Policies pages

### API Admin Tests (6 tabs visible)
- [ ] **Can** view all 4 consumer tabs (Browse, My APIs, My API Keys, My Requests)
- [ ] **Can** view Approval Queue tab (5th tab)
- [ ] **Can** view API Key Overview tab (6th tab)
- [ ] **Can** approve/reject API key requests in Approval Queue
- [ ] **Can** see all user-to-API-key mappings in API Key Overview
- [ ] **Can** view all policy types in Kuadrant > Policies
- [ ] **Can** create/edit/delete all policy types

### Limited Viewer Tests
- [ ] **Cannot** access API Management section at all
- [ ] **Can** only see Auth and RateLimit tabs in Kuadrant > Policies
- [ ] **Cannot** see DNS, TLS, or Plan tabs
- [ ] **Cannot** create any policies
- [ ] Gets "No permission" errors for restricted resources

## Cleanup

```bash
# Delete all test resources
kubectl delete namespace kuadrant-test-users
kubectl delete clusterrolebinding kuadrant-test-api-consumer
kubectl delete clusterrolebinding kuadrant-test-api-admin
kubectl delete clusterrolebinding kuadrant-test-limited-viewer
kubectl delete clusterrole api-consumer-role
kubectl delete clusterrole api-admin-role
kubectl delete clusterrole limited-viewer-role
```
