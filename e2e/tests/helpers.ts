import { Page, expect } from '@playwright/test';

const TEST_NAMESPACE = 'kuadrant-test';

// start impersonating a user via the console masthead
export async function impersonateUser(page: Page, username: string): Promise<void> {
  const userDropdown = page.locator('[data-test="user-dropdown-toggle"]');
  await userDropdown.waitFor({ state: 'visible', timeout: 30_000 });
  await userDropdown.click();

  const impersonateItem = page.locator('[data-test="impersonate-user"] button');
  await impersonateItem.waitFor({ state: 'visible' });
  await impersonateItem.click();

  const usernameInput = page.locator('[data-test="username-input"]');
  await usernameInput.waitFor({ state: 'visible' });
  await usernameInput.fill(username);

  const submitButton = page.locator('[data-test="impersonate-button"]');
  await submitButton.click();

  // wait for the page to reload and impersonation banner to appear
  await page.locator('.pf-v6-c-banner.pf-m-blue').waitFor({
    state: 'visible',
    timeout: 10_000,
  });
}

// stop impersonation if active
export async function stopImpersonation(page: Page): Promise<void> {
  const banner = page.locator('.pf-v6-c-banner.pf-m-blue');
  if (await banner.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const stopButton = banner.locator('button:has-text("Stop impersonating")');
    await stopButton.waitFor({ state: 'visible', timeout: 5_000 });
    await stopButton.click();
    await banner.waitFor({ state: 'hidden', timeout: 5_000 });
  }
}

// SPA navigation using pushState - preserves redux state (including impersonation)
// page.goto() causes a full reload which destroys impersonation state
export async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForLoadState('domcontentloaded');
}

export async function navigateToPolicies(page: Page): Promise<void> {
  await spaNavigate(page, `/kuadrant/ns/${TEST_NAMESPACE}/policies`);
}

export async function navigateToOverview(page: Page): Promise<void> {
  await spaNavigate(page, '/kuadrant/overview');
}

export async function navigateToTopology(page: Page): Promise<void> {
  await spaNavigate(page, '/kuadrant/policy-topology');
}

// navigate to a resource create page
export async function navigateToCreate(
  page: Page,
  group: string,
  version: string,
  kind: string,
  namespace = TEST_NAMESPACE,
): Promise<void> {
  await spaNavigate(page, `/k8s/ns/${namespace}/${group}~${version}~${kind}/~new`);
}

// navigate to a policy edit page
export async function navigateToEdit(
  page: Page,
  policyType: string,
  name: string,
  namespace = TEST_NAMESPACE,
): Promise<void> {
  await spaNavigate(page, `/k8s/ns/${namespace}/${policyType}/name/${name}/edit`);
}

// navigate to policies page with a specific tab selected
export async function navigateToPolicyTab(
  page: Page,
  tab: string,
  namespace = TEST_NAMESPACE,
): Promise<void> {
  await spaNavigate(page, `/kuadrant/ns/${namespace}/policies/${tab}`);
}

// wait for RBAC permission checks to finish loading.
// the loading indicator may appear and disappear very quickly, so we try to
// catch it appearing first to avoid a false-green race condition.
export async function waitForPermissionsLoaded(page: Page): Promise<void> {
  const loading = page.locator('text=Loading permissions...');
  try {
    await loading.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    // already gone or never appeared - either way, not loading
  }
  await expect(loading).toBeHidden({ timeout: 30_000 });
}

// wait for a FormSelect to have real options (beyond the placeholder)
export async function waitForSelectOptions(
  page: Page,
  selectId: string,
  timeout = 15_000,
): Promise<void> {
  await page.waitForFunction(
    ({ id, min }) => {
      const select = document.querySelector(`#${id}`) as HTMLSelectElement;
      return select && select.options.length > min;
    },
    { id: selectId, min: 1 },
    { timeout },
  );
}

// open the kebab menu for a resource row matching the given name
export async function openKebab(page: Page, resourceName: string): Promise<void> {
  const row = page.locator(`tr:has-text("${resourceName}")`).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  const kebab = row.locator('[aria-label="kebab dropdown toggle"]');
  await kebab.click();
}

// delete a resource via the kebab menu and confirm the modal
export async function deleteViaKebab(page: Page, resourceName: string): Promise<void> {
  await openKebab(page, resourceName);
  const deleteItem = page.locator('[role="menuitem"]:has-text("Delete")');
  await expect(deleteItem).toBeVisible();
  await deleteItem.click();

  // confirm delete modal
  const confirmButton = page.locator('.pf-v6-c-modal-box button.pf-m-danger');
  await expect(confirmButton).toBeVisible({ timeout: 5_000 });
  await confirmButton.click();

  // wait for modal to close
  await confirmButton.waitFor({ state: 'hidden', timeout: 10_000 });
}

export function generateTestName(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${time}${rand}`;
}

// best-effort cleanup of test resources by name prefix via kubectl
export async function cleanupTestResources(
  resourceType: string,
  ...names: string[]
): Promise<void> {
  const { execSync } = await import('child_process');
  for (const name of names) {
    try {
      execSync(`kubectl delete ${resourceType} ${name} -n ${TEST_NAMESPACE} --ignore-not-found`, {
        timeout: 10_000,
      });
    } catch {
      // best-effort
    }
  }
}

export { TEST_NAMESPACE };
