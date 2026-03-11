import { test, expect } from '@playwright/test';
import {
  impersonateUser,
  stopImpersonation,
  navigateToCreate,
  navigateToEdit,
  navigateToPolicyTab,
  waitForSelectOptions,
  waitForPermissionsLoaded,
  deleteViaKebab,
  generateTestName,
  cleanupTestResources,
  TEST_NAMESPACE,
} from './helpers';

// all form tests run as test-admin (ClusterRole with full CRUD)
const setupAdmin = async (page) => {
  await page.goto('/');
  await page.locator('[data-test="user-dropdown-toggle"]').waitFor({ state: 'visible', timeout: 30_000 });
  await impersonateUser(page, 'test-admin');
};

// select the test gateway from a gateway FormSelect dropdown
const selectTestGateway = async (page) => {
  await waitForSelectOptions(page, 'gateway-select');
  await page.locator('#gateway-select').selectOption(`${TEST_NAMESPACE}/test-gateway`);
};

// --- RateLimitPolicy ---

test.describe('RateLimitPolicy form CRUD', () => {
  test.describe.configure({ mode: 'serial' });
  const policyName = generateTestName('e2e-rlp');

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
  });
  test.afterEach(async ({ page }) => {
    await stopImpersonation(page);
  });

  test('create via form', async ({ page }) => {
    await navigateToCreate(page, 'kuadrant.io', 'v1', 'RateLimitPolicy');
    await page.locator('#policy-name').fill(policyName);

    // select target gateway
    await selectTestGateway(page);

    // add a limit with a rate
    await page.locator('button:has-text("Add limit")').click();
    await page.locator('[aria-label="Max requests"]').fill('10');
    await page.locator('[aria-label="Time window"]').fill('1m');

    // submit
    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // should redirect to the ratelimit tab
    await page.waitForURL(/\/policies\/ratelimit/, { timeout: 15_000 });
  });

  test('appears in policy list', async ({ page }) => {
    await navigateToPolicyTab(page, 'ratelimit');
    await waitForPermissionsLoaded(page);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeVisible({ timeout: 15_000 });
  });

  test('edit form loads with values', async ({ page }) => {
    await navigateToEdit(page, 'ratelimitpolicy', policyName);

    // verify form fields are populated
    await expect(page.locator('#policy-name')).toHaveValue(policyName, { timeout: 15_000 });
    await expect(page.locator('#gateway-select')).toHaveValue(`${TEST_NAMESPACE}/test-gateway`);

    // verify limit exists
    await expect(page.locator('[aria-label="Limit name"]')).toBeVisible();
    await expect(page.locator('[aria-label="Max requests"]')).toHaveValue('10');
    await expect(page.locator('[aria-label="Time window"]')).toHaveValue('1m');
  });

  test('form/YAML sync', async ({ page }) => {
    await navigateToCreate(page, 'kuadrant.io', 'v1', 'RateLimitPolicy');
    await page.locator('#policy-name').fill('yaml-sync-test');
    await selectTestGateway(page);

    // switch to YAML view
    await page.locator('#create-type-radio-yaml').click();

    // verify the YAML editor renders and contains the policy name
    // (Monaco uses virtual scrolling so textContent only has visible lines)
    const editorArea = page.locator('[data-mode-id="yaml"]');
    await expect(editorArea).toBeVisible({ timeout: 10_000 });
    await expect(async () => {
      const content = await editorArea.textContent();
      expect(content).toContain('yaml-sync-test');
      expect(content).toContain('RateLimitPolicy');
    }).toPass({ timeout: 5_000 });
  });

  test('delete via kebab', async ({ page }) => {
    await navigateToPolicyTab(page, 'ratelimit');
    await waitForPermissionsLoaded(page);
    await deleteViaKebab(page, policyName);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeHidden({ timeout: 15_000 });
  });

  test.afterAll(async () => {
    await cleanupTestResources('ratelimitpolicy', policyName);
  });
});

// --- TokenRateLimitPolicy ---

test.describe('TokenRateLimitPolicy form CRUD', () => {
  test.describe.configure({ mode: 'serial' });
  const policyName = generateTestName('e2e-trlp');

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
  });
  test.afterEach(async ({ page }) => {
    await stopImpersonation(page);
  });

  test('create via form', async ({ page }) => {
    await navigateToCreate(page, 'kuadrant.io', 'v1alpha1', 'TokenRateLimitPolicy');
    await page.locator('#policy-name').fill(policyName);
    await selectTestGateway(page);

    await page.locator('button:has-text("Add limit")').click();
    await page.locator('[aria-label="Max tokens"]').fill('500');
    await page.locator('[aria-label="Time window"]').fill('1h');

    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await page.waitForURL(/\/policies\/tokenratelimit/, { timeout: 15_000 });
  });

  test('appears in policy list', async ({ page }) => {
    await navigateToPolicyTab(page, 'tokenratelimit');
    await waitForPermissionsLoaded(page);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeVisible({ timeout: 15_000 });
  });

  test('edit form loads with values', async ({ page }) => {
    await navigateToEdit(page, 'tokenratelimitpolicy', policyName);

    await expect(page.locator('#policy-name')).toHaveValue(policyName, { timeout: 15_000 });
    await expect(page.locator('#gateway-select')).toHaveValue(`${TEST_NAMESPACE}/test-gateway`);
    await expect(page.locator('[aria-label="Max tokens"]')).toHaveValue('500');
    await expect(page.locator('[aria-label="Time window"]')).toHaveValue('1h');
  });

  test('delete via kebab', async ({ page }) => {
    await navigateToPolicyTab(page, 'tokenratelimit');
    await waitForPermissionsLoaded(page);
    await deleteViaKebab(page, policyName);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeHidden({ timeout: 15_000 });
  });

  test.afterAll(async () => {
    await cleanupTestResources('tokenratelimitpolicy', policyName);
  });
});

// --- AuthPolicy ---

test.describe('AuthPolicy form CRUD', () => {
  test.describe.configure({ mode: 'serial' });
  const policyName = generateTestName('e2e-auth');

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
  });
  test.afterEach(async ({ page }) => {
    await stopImpersonation(page);
  });

  test('create via form with anonymous auth', async ({ page }) => {
    await navigateToCreate(page, 'kuadrant.io', 'v1', 'AuthPolicy');
    await page.locator('#policy-name').fill(policyName);

    // select target gateway
    await selectTestGateway(page);

    // expand Authentication section and add anonymous auth
    await page.locator('.pf-v6-c-expandable-section__toggle:has-text("Authentication") button').click();
    await page.locator('button:has-text("Add authentication")').click();

    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await page.waitForURL(/\/policies\/auth/, { timeout: 15_000 });
  });

  test('appears in policy list', async ({ page }) => {
    await navigateToPolicyTab(page, 'auth');
    await waitForPermissionsLoaded(page);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeVisible({ timeout: 15_000 });
  });

  test('edit form loads with values', async ({ page }) => {
    await navigateToEdit(page, 'authpolicy', policyName);

    await expect(page.locator('#policy-name')).toHaveValue(policyName, { timeout: 15_000 });
    await expect(page.locator('#gateway-select')).toHaveValue(`${TEST_NAMESPACE}/test-gateway`);

    // expand Authentication section to verify the entry
    await page.locator('.pf-v6-c-expandable-section__toggle:has-text("Authentication") button').click();
    const authType = page.locator('[aria-label="Authentication type"]');
    await expect(authType).toBeVisible({ timeout: 5_000 });
    await expect(authType).toHaveValue('anonymous');
  });

  test('delete via kebab', async ({ page }) => {
    await navigateToPolicyTab(page, 'auth');
    await waitForPermissionsLoaded(page);
    await deleteViaKebab(page, policyName);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeHidden({ timeout: 15_000 });
  });

  test.afterAll(async () => {
    await cleanupTestResources('authpolicy', policyName);
  });
});

// --- DNSPolicy ---

test.describe('DNSPolicy form CRUD', () => {
  test.describe.configure({ mode: 'serial' });
  const policyName = generateTestName('e2e-dns');

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
  });
  test.afterEach(async ({ page }) => {
    await stopImpersonation(page);
  });

  test('create via form', async ({ page }) => {
    await navigateToCreate(page, 'kuadrant.io', 'v1', 'DNSPolicy');
    await page.locator('#policy-name').fill(policyName);
    await selectTestGateway(page);

    // fill provider ref
    await page.locator('#provider-ref').fill('test-provider');

    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await page.waitForURL(/\/policies\/dns/, { timeout: 15_000 });
  });

  test('appears in policy list', async ({ page }) => {
    await navigateToPolicyTab(page, 'dns');
    await waitForPermissionsLoaded(page);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeVisible({ timeout: 15_000 });
  });

  test('edit form loads with values', async ({ page }) => {
    await navigateToEdit(page, 'dnspolicy', policyName);

    await expect(page.locator('#policy-name')).toHaveValue(policyName, { timeout: 15_000 });
    await expect(page.locator('#gateway-select')).toHaveValue(`${TEST_NAMESPACE}/test-gateway`);
    await expect(page.locator('#provider-ref')).toHaveValue('test-provider');
  });

  test('create with load balancing and health check', async ({ page }) => {
    const fullName = `${policyName}-full`;
    await navigateToCreate(page, 'kuadrant.io', 'v1', 'DNSPolicy');
    await page.locator('#policy-name').fill(fullName);
    await selectTestGateway(page);
    await page.locator('#provider-ref').fill('test-provider');

    // expand and fill load balancing
    await page.locator('button:has-text("LoadBalancing")').click();
    await page.locator('#weight').fill('100');
    await page.locator('#geo').fill('eu');
    await page.locator('#default-geo-enabled').click();

    // expand and fill health check
    await page.locator('button:has-text("Health Check")').click();
    await page.locator('#health-check-endpoint').fill('/healthz');
    await page.locator('#health-check-failure-threshold').fill('3');
    await page.locator('#health-check-port').fill('8080');
    await page.locator('#health-check-protocol').selectOption('HTTPS');

    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await page.waitForURL(/\/policies\/dns/, { timeout: 15_000 });
  });

  test('delete via kebab', async ({ page }) => {
    await navigateToPolicyTab(page, 'dns');
    await waitForPermissionsLoaded(page);
    // delete -full first so the base name only matches one row
    await deleteViaKebab(page, `${policyName}-full`);
    await expect(page.locator('table').locator(`text=${policyName}-full`)).toBeHidden({ timeout: 15_000 });
    await deleteViaKebab(page, policyName);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeHidden({ timeout: 15_000 });
  });

  test.afterAll(async () => {
    await cleanupTestResources('dnspolicy', policyName, `${policyName}-full`);
  });
});

// --- TLSPolicy ---

test.describe('TLSPolicy form CRUD', () => {
  test.describe.configure({ mode: 'serial' });
  const policyName = generateTestName('e2e-tls');

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
  });
  test.afterEach(async ({ page }) => {
    await stopImpersonation(page);
  });

  test('create via form', async ({ page }) => {
    await navigateToCreate(page, 'kuadrant.io', 'v1', 'TLSPolicy');

    // TLS form uses a different ID for policy name
    await page.locator('#simple-form-policy-name-01').fill(policyName);
    await selectTestGateway(page);

    // ClusterIssuer is the default issuer type
    // wait for and select the test ClusterIssuer
    await waitForSelectOptions(page, 'clusterissuer-select');
    await page.locator('#clusterissuer-select').selectOption('test-selfsigned');

    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await page.waitForURL(/\/policies\/tls/, { timeout: 15_000 });
  });

  test('appears in policy list', async ({ page }) => {
    await navigateToPolicyTab(page, 'tls');
    await waitForPermissionsLoaded(page);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeVisible({ timeout: 15_000 });
  });

  test('edit form loads with values', async ({ page }) => {
    await navigateToEdit(page, 'tlspolicy', policyName);

    await expect(page.locator('#simple-form-policy-name-01')).toHaveValue(policyName, {
      timeout: 15_000,
    });
    await expect(page.locator('#gateway-select')).toHaveValue(`${TEST_NAMESPACE}/test-gateway`);
    await expect(page.locator('#clusterissuer-select')).toHaveValue('test-selfsigned');
  });

  test('delete via kebab', async ({ page }) => {
    await navigateToPolicyTab(page, 'tls');
    await waitForPermissionsLoaded(page);
    await deleteViaKebab(page, policyName);
    await expect(page.locator('table').locator(`text=${policyName}`)).toBeHidden({ timeout: 15_000 });
  });

  test.afterAll(async () => {
    await cleanupTestResources('tlspolicy', policyName);
  });
});

// --- Form validation ---

test.describe('Form validation prevents submission', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
  });
  test.afterEach(async ({ page }) => {
    await stopImpersonation(page);
  });

  test('RateLimitPolicy Create disabled without required fields', async ({ page }) => {
    await navigateToCreate(page, 'kuadrant.io', 'v1', 'RateLimitPolicy');

    // Create should be disabled with empty form
    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeDisabled();

    // fill name only - still disabled (no target, no limit)
    await page.locator('#policy-name').fill('validation-test');
    await expect(createButton).toBeDisabled();

    // select gateway - still disabled (no limit)
    await selectTestGateway(page);
    await expect(createButton).toBeDisabled();

    // add limit but no rate values - still disabled
    await page.locator('button:has-text("Add limit")').click();
    await expect(createButton).toBeDisabled();

    // fill rate - now should be enabled
    await page.locator('[aria-label="Max requests"]').fill('5');
    await page.locator('[aria-label="Time window"]').fill('10s');
    await expect(createButton).toBeEnabled();
  });

  test('DNSPolicy Create disabled without provider ref', async ({ page }) => {
    await navigateToCreate(page, 'kuadrant.io', 'v1', 'DNSPolicy');

    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeDisabled();

    await page.locator('#policy-name').fill('validation-test');
    await selectTestGateway(page);
    // still disabled without provider ref
    await expect(createButton).toBeDisabled();

    await page.locator('#provider-ref').fill('some-provider');
    await expect(createButton).toBeEnabled();
  });

  test('TLSPolicy Create disabled without issuer', async ({ page }) => {
    await navigateToCreate(page, 'kuadrant.io', 'v1', 'TLSPolicy');

    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeDisabled();

    await page.locator('#simple-form-policy-name-01').fill('validation-test');
    await selectTestGateway(page);
    // still disabled without issuer
    await expect(createButton).toBeDisabled();

    await waitForSelectOptions(page, 'clusterissuer-select');
    await page.locator('#clusterissuer-select').selectOption('test-selfsigned');
    await expect(createButton).toBeEnabled();
  });
});
