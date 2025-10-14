#!/bin/bash
set -e

echo "🔧 Setting up Kuadrant Console Plugin test users..."
echo

# create serviceaccounts and rbac
echo "Creating ServiceAccounts and ClusterRoles..."
kubectl apply -f "$(dirname "$0")"

echo
echo "✅ Test users created!"
echo
echo "📋 Available test users:"
echo "  1. api-consumer    - Can browse APIs and request access (4 tabs)"
echo "  2. api-admin       - Can manage all policies and approvals (6 tabs)"
echo "  3. limited-viewer  - Can only view Auth and RateLimit policies"
echo
echo "📝 Namespaces created:"
echo "  - kuadrant-test-users (ServiceAccounts)"
echo "  - api-requests (API key request ConfigMaps)"
echo
echo "🧪 Test RBAC permissions:"
echo "  ./test-permissions.sh"
echo
echo "🎫 To get a token for kubectl testing:"
echo "  kubectl create token api-consumer -n kuadrant-test-users --duration=8h"
echo "  kubectl create token api-admin -n kuadrant-test-users --duration=8h"
echo "  kubectl create token limited-viewer -n kuadrant-test-users --duration=8h"
echo
echo "🌐 For OpenShift Console testing, see htpasswd-setup.md"
echo
