# Setting Up HTPasswd Users for Console Testing

To test the console plugin with different permission levels in the actual OpenShift Console UI, you need to create real users via HTPasswd identity provider.

## Prerequisites

- Cluster admin access
- `htpasswd` command-line tool installed

## Step 1: Create HTPasswd File

```bash
# create users with passwords
htpasswd -c -B -b /tmp/htpasswd api-consumer password123
htpasswd -B -b /tmp/htpasswd api-admin password123
htpasswd -B -b /tmp/htpasswd limited-viewer password123

# verify file
cat /tmp/htpasswd
```

## Step 2: Create HTPasswd Secret

```bash
# create secret in openshift-config namespace
oc create secret generic htpasswd-secret \
  --from-file=htpasswd=/tmp/htpasswd \
  -n openshift-config

# if secret already exists, update it
oc set data secret/htpasswd-secret \
  --from-file=htpasswd=/tmp/htpasswd \
  -n openshift-config
```

## Step 3: Configure OAuth (if not already configured)

```bash
# check if htpasswd idp exists
oc get oauth cluster -o yaml

# if not, apply this configuration
cat <<EOF | oc apply -f -
apiVersion: config.openshift.io/v1
kind: OAuth
metadata:
  name: cluster
spec:
  identityProviders:
  - name: htpasswd_provider
    mappingMethod: claim
    type: HTPasswd
    htpasswd:
      fileData:
        name: htpasswd-secret
EOF
```

**Note**: If you already have other identity providers configured, you'll need to merge this into your existing OAuth configuration.

## Step 4: Grant Permissions to Users

### API Consumer User

```bash
# bind to api-consumer-role
oc create clusterrolebinding api-consumer-user \
  --clusterrole=api-consumer-role \
  --user=api-consumer

# allow creating api key requests in api-requests namespace
oc create rolebinding api-consumer-requests \
  --clusterrole=view \
  --user=api-consumer \
  -n api-requests
```

### API Admin User

```bash
# bind to api-admin-role
oc create clusterrolebinding api-admin-user \
  --clusterrole=api-admin-role \
  --user=api-admin

# full access to api-requests namespace for approval queue
oc create rolebinding api-admin-requests \
  --clusterrole=admin \
  --user=api-admin \
  -n api-requests
```

### Limited Viewer User

```bash
# bind to limited-viewer-role
oc create clusterrolebinding limited-viewer-user \
  --clusterrole=limited-viewer-role \
  --user=limited-viewer
```

## Step 5: Test Login

1. Wait a few minutes for OAuth pods to restart
2. Log out of OpenShift Console
3. Log in with one of the test users:
   - Username: `api-consumer` / Password: `password123`
   - Username: `api-admin` / Password: `password123`
   - Username: `limited-viewer` / Password: `password123`

## Expected Behaviour

### API Consumer (4 tabs visible)
- **Can access**: API Management section
- **Can see tabs**: Browse APIs, My APIs, My API Keys, My Requests
- **Can do**: Request API access, view own API keys, view own requests
- **Cannot access**: Kuadrant > Policies section
- **Cannot see tabs**: Approval Queue, API Key Overview

### API Admin (6 tabs visible)
- **Can access**: All Kuadrant sections + API Management
- **Can see tabs**: All 4 consumer tabs + Approval Queue + API Key Overview
- **Can see policy tabs**: DNS, TLS, Auth, RateLimit, Plan
- **Can create/edit**: All policy types
- **Can do**: Approve/reject API requests, view all user-to-API-key mappings

### Limited Viewer
- **Can access**: Kuadrant > Policies section only
- **Can see**: Only Auth and RateLimit tabs
- **Cannot see**: DNS, TLS, Plan tabs (should get "No list permission" warning)
- **Cannot access**: API Management section
- **Cannot create**: Any policies

## Troubleshooting

### OAuth Pods Not Restarting

```bash
# check oauth pod status
oc get pods -n openshift-authentication

# if needed, force restart
oc delete pods -n openshift-authentication --all
```

### User Cannot Log In

```bash
# verify secret exists
oc get secret htpasswd-secret -n openshift-config

# verify oauth configuration
oc get oauth cluster -o yaml

# check authentication operator logs
oc logs -n openshift-authentication-operator deployment/authentication-operator
```

### User Has Wrong Permissions

```bash
# check user's rolebindings
oc get clusterrolebinding | grep api-consumer
oc get rolebinding -n kuadrant-system | grep api-consumer

# test permissions manually
oc auth can-i list planpolicies.extensions.kuadrant.io --as=api-consumer
oc auth can-i create authpolicies.kuadrant.io --as=api-consumer
```

## Cleanup

```bash
# remove test users from htpasswd
htpasswd -D /tmp/htpasswd api-consumer
htpasswd -D /tmp/htpasswd api-admin
htpasswd -D /tmp/htpasswd limited-viewer

# update secret
oc set data secret/htpasswd-secret \
  --from-file=htpasswd=/tmp/htpasswd \
  -n openshift-config

# remove rolebindings
oc delete clusterrolebinding api-consumer-user api-admin-user limited-viewer-user
oc delete rolebinding api-consumer-requests -n api-requests
oc delete rolebinding api-admin-requests -n api-requests

# remove identities (if needed)
oc delete identity htpasswd_provider:api-consumer
oc delete identity htpasswd_provider:api-admin
oc delete identity htpasswd_provider:limited-viewer

# remove users (if needed)
oc delete user api-consumer api-admin limited-viewer
```
