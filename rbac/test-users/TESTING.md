# Quick Start: RBAC Testing Guide

This guide helps you quickly set up and test the Kuadrant Console Plugin with different permission levels.

## Quick Setup (5 minutes)

### 1. Create test users and namespaces
```bash
cd rbac/test-users
./setup-test-users.sh
```

This creates:
- 3 ServiceAccounts (api-consumer, api-admin, limited-viewer)
- 3 ClusterRoles with appropriate permissions
- 2 namespaces (kuadrant-test-users, api-requests)

### 2. Verify RBAC permissions
```bash
./test-permissions.sh
```

This tests that each user has the correct permissions set up.

## Testing Methods

### Method 1: kubectl with Impersonation (Quick Test)

Test permissions without logging in:

```bash
# test as api-consumer
kubectl --as=system:serviceaccount:kuadrant-test-users:api-consumer get httproutes -A
kubectl --as=system:serviceaccount:kuadrant-test-users:api-consumer get planpolicies -A
kubectl --as=system:serviceaccount:kuadrant-test-users:api-consumer get configmaps -n api-requests

# test as api-admin
kubectl --as=system:serviceaccount:kuadrant-test-users:api-admin get authpolicies -A
kubectl --as=system:serviceaccount:kuadrant-test-users:api-admin get configmaps -n api-requests

# test as limited-viewer
kubectl --as=system:serviceaccount:kuadrant-test-users:limited-viewer get authpolicies -A
kubectl --as=system:serviceaccount:kuadrant-test-users:limited-viewer get dnspolicies -A  # should fail
```

### Method 2: OpenShift Console (Full UI Test)

For testing the actual console plugin UI, you need to create real users via HTPasswd.

**See `htpasswd-setup.md` for detailed instructions.**

Quick steps:
1. Create HTPasswd file with test users
2. Configure OpenShift OAuth
3. Grant permissions to users
4. Log in to console as test user

## What to Test

### API Consumer (api-consumer user)

**Expected UI Behaviour:**
- ✅ Can access API Management section
- ✅ Sees 4 tabs: Browse APIs, My APIs, My API Keys, My Requests
- ❌ Cannot see Approval Queue tab
- ❌ Cannot see API Key Overview tab
- ❌ Cannot access Kuadrant > Policies section

**Test Cases:**
1. Navigate to API Management
2. Verify only 4 tabs are visible
3. Browse available APIs
4. Request access to an API
5. View own requests in My Requests tab
6. Try to access Kuadrant > Policies (should fail or show no data)

### API Admin (api-admin user)

**Expected UI Behaviour:**
- ✅ Can access API Management section
- ✅ Sees all 6 tabs (including Approval Queue + API Key Overview)
- ✅ Can access Kuadrant > Policies section
- ✅ Can see all policy tabs (DNS, TLS, Auth, RateLimit, Plan)

**Test Cases:**
1. Navigate to API Management
2. Verify all 6 tabs are visible
3. View Approval Queue
4. Approve/reject API requests
5. View API Key Overview (user-to-key mappings)
6. Navigate to Kuadrant > Policies
7. Create/edit/delete all policy types

### Limited Viewer (limited-viewer user)

**Expected UI Behaviour:**
- ❌ Cannot access API Management section
- ✅ Can access Kuadrant > Policies section
- ✅ Can see Auth and RateLimit tabs only
- ❌ Cannot see DNS, TLS, Plan tabs

**Test Cases:**
1. Try to access API Management (should fail)
2. Navigate to Kuadrant > Policies
3. Verify only Auth and RateLimit tabs visible
4. Try to create a policy (should fail)
5. Try to access DNS/TLS/Plan tabs (should fail)

## Tab Visibility Reference

| User Type       | Browse APIs | My APIs | My Keys | My Requests | Approval Queue | API Key Overview |
|-----------------|-------------|---------|---------|-------------|----------------|------------------|
| api-consumer    | ✅          | ✅      | ✅      | ✅          | ❌             | ❌               |
| api-admin       | ✅          | ✅      | ✅      | ✅          | ✅             | ✅               |
| limited-viewer  | ❌          | ❌      | ❌      | ❌          | ❌             | ❌               |

## Common Issues

### Tabs not showing/hiding correctly
- Check that `canApproveRequests` logic in ApiManagementPage.tsx works correctly
- Verify that the api-requests namespace exists
- Check that user has proper permissions to list configmaps in api-requests namespace

### Empty data in tabs
- Ensure you have test data set up (HTTPRoutes with PlanPolicies, API key requests)
- Check namespace is correct (api-requests not kuadrant-system)
- Verify permissions with `./test-permissions.sh`

### Cannot log in with HTPasswd user
- Wait 2-3 minutes for OAuth pods to restart
- Check OAuth configuration: `oc get oauth cluster -o yaml`
- Check authentication operator logs

## Cleanup

```bash
# delete namespaces (cascades to all resources)
kubectl delete namespace kuadrant-test-users
kubectl delete namespace api-requests

# delete clusterroles and bindings
kubectl delete clusterrolebinding kuadrant-test-api-consumer
kubectl delete clusterrolebinding kuadrant-test-api-admin
kubectl delete clusterrolebinding kuadrant-test-limited-viewer
kubectl delete clusterrole api-consumer-role
kubectl delete clusterrole api-admin-role
kubectl delete clusterrole limited-viewer-role
```

For HTPasswd user cleanup, see `htpasswd-setup.md`.

## Next Steps

After RBAC testing, you may want to:
1. Create example HTTPRoutes and PlanPolicies for testing
2. Test the full API request → approval → key generation workflow
3. Test API key usage with actual API calls
4. Set up metrics collection for API key usage
