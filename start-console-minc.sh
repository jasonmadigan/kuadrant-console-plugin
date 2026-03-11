#!/usr/bin/env bash
# start the openshift console container against an existing minc cluster.
# requires: minc running, kubectl configured, console SA created (e2e/setup.sh).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=e2e/lib.sh
source "${SCRIPT_DIR}/e2e/lib.sh"

export RUNTIME=$(detect_runtime)
export CONSOLE_IMAGE="${CONSOLE_IMAGE:-quay.io/openshift/origin-console:latest}"
export CONSOLE_PORT="${CONSOLE_PORT:-9000}"
export PLUGIN_PORT="${PLUGIN_PORT:-9001}"

# check the cluster is reachable
if ! kubectl get nodes &>/dev/null; then
  echo "error: cannot reach cluster. Is minc running?"
  echo "  minc status -p docker"
  exit 1
fi

# ensure console SA exists
if ! kubectl -n kube-system get sa openshift-console &>/dev/null; then
  log "creating console SA and RBAC..."
  kubectl apply -f "${SCRIPT_DIR}/e2e/manifests/console.yaml"
fi

start_console "${SCRIPT_DIR}"
log "plugin dev server expected at http://localhost:${PLUGIN_PORT}"
log "run 'yarn start' in another terminal if not already running"
