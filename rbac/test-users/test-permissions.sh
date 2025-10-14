#!/bin/bash
set -e

echo "🧪 Testing RBAC permissions for Kuadrant Console Plugin"
echo "======================================================="
echo

# colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_permission() {
    local user=$1
    local namespace=$2
    local resource=$3
    local verb=$4
    local expected=$5

    local result=$(kubectl --as=system:serviceaccount:kuadrant-test-users:$user auth can-i $verb $resource -n $namespace 2>/dev/null)

    if [ "$result" == "$expected" ]; then
        echo -e "${GREEN}✓${NC} $user can $verb $resource in $namespace: $result"
    else
        echo -e "${RED}✗${NC} $user can $verb $resource in $namespace: $result (expected $expected)"
    fi
}

test_cluster_permission() {
    local user=$1
    local resource=$2
    local verb=$3
    local expected=$4

    local result=$(kubectl --as=system:serviceaccount:kuadrant-test-users:$user auth can-i $verb $resource --all-namespaces 2>/dev/null)

    if [ "$result" == "$expected" ]; then
        echo -e "${GREEN}✓${NC} $user can $verb $resource (cluster-wide): $result"
    else
        echo -e "${RED}✗${NC} $user can $verb $resource (cluster-wide): $result (expected $expected)"
    fi
}

echo "Testing API Consumer permissions..."
echo "-----------------------------------"
test_cluster_permission "api-consumer" "httproutes.gateway.networking.k8s.io" "list" "yes"
test_cluster_permission "api-consumer" "planpolicies.extensions.kuadrant.io" "list" "yes"
test_permission "api-consumer" "api-requests" "configmaps" "create" "yes"
test_permission "api-consumer" "api-requests" "configmaps" "list" "yes"
test_permission "api-consumer" "api-requests" "configmaps" "update" "no"
test_permission "api-consumer" "api-requests" "configmaps" "delete" "no"
test_cluster_permission "api-consumer" "authpolicies.kuadrant.io" "list" "no"
echo

echo "Testing API Admin permissions..."
echo "--------------------------------"
test_cluster_permission "api-admin" "httproutes.gateway.networking.k8s.io" "list" "yes"
test_cluster_permission "api-admin" "planpolicies.extensions.kuadrant.io" "create" "yes"
test_cluster_permission "api-admin" "authpolicies.kuadrant.io" "create" "yes"
test_cluster_permission "api-admin" "dnspolicies.kuadrant.io" "create" "yes"
test_cluster_permission "api-admin" "ratelimitpolicies.kuadrant.io" "create" "yes"
test_cluster_permission "api-admin" "tlspolicies.kuadrant.io" "create" "yes"
test_permission "api-admin" "api-requests" "configmaps" "list" "yes"
test_permission "api-admin" "api-requests" "configmaps" "update" "yes"
test_permission "api-admin" "api-requests" "configmaps" "delete" "yes"
echo

echo "Testing Limited Viewer permissions..."
echo "-------------------------------------"
test_cluster_permission "limited-viewer" "authpolicies.kuadrant.io" "list" "yes"
test_cluster_permission "limited-viewer" "ratelimitpolicies.kuadrant.io" "list" "yes"
test_cluster_permission "limited-viewer" "dnspolicies.kuadrant.io" "list" "no"
test_cluster_permission "limited-viewer" "tlspolicies.kuadrant.io" "list" "no"
test_cluster_permission "limited-viewer" "planpolicies.extensions.kuadrant.io" "list" "no"
test_permission "limited-viewer" "api-requests" "configmaps" "list" "no"
echo

echo "======================================================="
echo "✅ RBAC permission tests complete"
echo
echo "💡 To test in OpenShift Console:"
echo "   1. Set up HTPasswd users (see htpasswd-setup.md)"
echo "   2. Log in as test user"
echo "   3. Navigate to API Management"
echo "   4. Verify tab visibility matches expected permissions"
echo
