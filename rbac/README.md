# Kuadrant Console Plugin RBAC Configuration

## Overview

This directory contains RBAC manifests for the Kuadrant Console Plugin, including:
- PlanPolicy permissions (base RBAC)
- Test user configurations (`test-users/`)
- Admission policy examples

## ⚠️ Important: Label-Based Filtering Limitations

**Kubernetes RBAC does NOT support filtering resources by labels.** You cannot create a Role that says "only allow access to ConfigMaps with label X=Y".

**What this means:**
- Users with `list` permission on ConfigMaps can see ALL ConfigMaps in a namespace
- RBAC can only filter by: namespace, resource type, resource name (for `get` verb only)
- Label filtering must be done at application level (frontend) or via admission policies

**See `LABEL-BASED-RBAC.md` for detailed explanation and solutions.**

**Recommended layered approach:**
1. **Namespace separation** - Different namespaces for different data types (RBAC enforced)
2. **Application filtering** - Frontend filters by labels using selectors (UX, not security)
3. **Admission policies** - Prevent label tampering via ValidatingAdmissionPolicy (enforcement)

## Test Users

See `test-users/` directory for pre-configured test users with different permission levels.

## PlanPolicy RBAC

This section describes the base RBAC for PlanPolicy resources.

## Problem

The PlanPolicy CRD (`extensions.kuadrant.io/v1alpha1`) lacks the default RBAC permissions that other Kuadrant policy types have. Without these ClusterRoles, users (including cluster-admin) cannot list, view, or create PlanPolicies through the OpenShift Console, resulting in permission errors like:

```
[PoliciesListPage] No list permission for PlanPolicy
```

## Solution

These manifests create ClusterRoles and ClusterRoleBindings that grant the necessary permissions:

### Reader Permissions
- `planpolicy-reader-clusterrole.yaml` - Grants list/get/watch permissions for PlanPolicies
- `planpolicy-reader-clusterrolebinding.yaml` - Binds the reader role to specific users

### Editor Permissions
- `planpolicy-editor-clusterrole.yaml` - Grants create/update/delete permissions for PlanPolicies
- `planpolicy-editor-clusterrolebinding.yaml` - Binds the editor role to specific users

## Installation

Apply all RBAC manifests to your cluster:

```bash
kubectl apply -f rbac/
```

Or apply them individually:

```bash
kubectl apply -f rbac/planpolicy-reader-clusterrole.yaml
kubectl apply -f rbac/planpolicy-reader-clusterrolebinding.yaml
kubectl apply -f rbac/planpolicy-editor-clusterrole.yaml
kubectl apply -f rbac/planpolicy-editor-clusterrolebinding.yaml
```

## Customisation

### Adding More Users

Edit the ClusterRoleBinding files to add more subjects:

```yaml
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: jasonmadigan
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: another-user
```

### Using Groups

You can also bind to groups:

```yaml
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:authenticated
```

## Role Aggregation

The ClusterRoles include aggregation labels that automatically add PlanPolicy permissions to standard Kubernetes roles:

- `rbac.authorization.k8s.io/aggregate-to-view: "true"` - Aggregates to the `view` role
- `rbac.authorization.k8s.io/aggregate-to-edit: "true"` - Aggregates to the `edit` role
- `rbac.authorization.k8s.io/aggregate-to-admin: "true"` - Aggregates to the `admin` role

Once applied, users with cluster-admin, admin, edit, or view roles will automatically inherit the appropriate PlanPolicy permissions.

## Verification

Check if a user has the correct permissions:

```bash
oc auth can-i list planpolicies.extensions.kuadrant.io --all-namespaces
oc auth can-i create planpolicies.extensions.kuadrant.io -n toystore-jmadigan-1
```

## Upstream Fix

This RBAC configuration should ideally be included in the Kuadrant operator itself, similar to how other policy types (AuthPolicy, DNSPolicy, RateLimitPolicy, TLSPolicy) have their reader ClusterRoles created automatically.

Until the upstream fix is implemented, these manifests must be applied manually to any cluster where the Kuadrant Console Plugin is used with PlanPolicy support.
