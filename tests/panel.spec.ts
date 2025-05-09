import { test, expect } from '@grafana/plugin-e2e';
import { getGrafanaBootData, switchOrg, getOrgList, getPanelContentSelector, getSelectOptions, isComboBoxSupported, getGrafanaVersion } from './utils';

test.describe('Organization Panel - Button Mode', () => {
  test.beforeEach(async ({ page, gotoPanelEditPage, readProvisionedDashboard }) => {
    // Switch to the Main Org.
    await switchOrg(page, 1);

    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await gotoPanelEditPage({ dashboard, id: '2' });

    // Wait for the organization panel to be visible
    const version = await getGrafanaVersion(page);
    if (version.major === 11 && version.minor === 0) {
      await page.waitForSelector('div[data-testid="data-testid Panel header Organization panel with button"]');
    } else {
      await page.waitForSelector('div[data-testid="data-testid panel content"]');
    }
  });

  test.afterEach(async ({ page }) => {
    // Switch back to the Main Org.
    await switchOrg(page, 1);
  });

  test('should generate buttons for all organizations', async ({ page }) => {
    // Get the list of organizations
    const orgList = await getOrgList(page);

    // Check if the buttons are generated
    const buttons = await page.locator('button[data-testid^="org-"]');
    await expect(buttons).toHaveCount(orgList.length);

    // Check if the buttons have the correct text and data-testid
    for (const org of orgList) {
      const button = page.locator(`button[data-testid="org-${org.id}"]`);
      await expect(button).toHaveText(org.name);
    }
  });

  test('should highlight the current user organization', async ({ page }) => {
    // Get the current organization ID
    const grafanaBootData = await getGrafanaBootData(page);
    expect(grafanaBootData.user).toHaveProperty('orgId');
    const currentOrgId = grafanaBootData.user.orgId;

    // Check if the button is active
    const button = page.locator(`button[data-testid="org-${currentOrgId}"]`);
    await expect(button).toHaveClass(/active/);
  });

  test('should switch organization when clicking a button', async ({ page }) => {
    const grafanaBootData = await getGrafanaBootData(page);
    const currentOrgId = grafanaBootData.user.orgId;

    // Switch to a different organization
    const orgButtons = await page.locator('button[data-testid^="org-"]').all();
    let newOrgId = '';
    for (const button of orgButtons) {
      const orgId = await button.getAttribute('data-testid');
      if (orgId != null && orgId !== `org-${currentOrgId}`) {
        newOrgId = orgId.replace('org-', '');
        console.log(`Redirect to org: ${newOrgId}`);
        await button.click();
        await page.waitForURL((url) => url.searchParams.get('orgId') === orgId.replace('org-', ''));
        break;
      }
    }

    if (newOrgId === '') {
      throw new Error('Failed to find a different organization');
    }

    // Check if the organization has been switched
    const newGrafanaBootData = await getGrafanaBootData(page);
    expect(newGrafanaBootData.user.orgId.toString()).toBe(newOrgId);
  });
});

test.describe('Organization Panel - Select Mode', () => {
  test.beforeEach(async ({ page, gotoPanelEditPage, readProvisionedDashboard }) => {
    // Switch to the Main Org.
    await switchOrg(page, 1);

    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await gotoPanelEditPage({ dashboard, id: '1' });

    // Wait for the organization panel to be visible
    const version = await getGrafanaVersion(page);
    if (version.major === 11 && version.minor === 0) {
      await page.waitForSelector('div[data-testid="data-testid Panel header Organization panel with select"]');
    } else {
      await page.waitForSelector('div[data-testid="data-testid panel content"]');
    }
  });

  test.afterEach(async ({ page }) => {
    // Switch back to the Main Org.
    await switchOrg(page, 1);
  });

  test('should generate options for all organizations', async ({ page, selectors }) => {
    // Get the list of organizations
    const orgList = await getOrgList(page);

    let options = [];
    if (await isComboBoxSupported(page)) {
      const { panel, input } = getPanelContentSelector(page);
      await expect(panel).toBeVisible();
      await input.click();
      const menuId = await input.getAttribute('aria-controls');
      options = await getSelectOptions(page, menuId);
      await expect(options).toHaveCount(orgList.length);
    } else {
      const select = page.getByTestId('org-select');
      await expect(select).toBeVisible();
      await select.click();
      options = await page.locator('[id^="react-select"][id*="-option-"]');
      await expect(options).toHaveCount(orgList.length);
    }

    // Check if the options have the correct text
    for (let i = 0; i < orgList.length; i++) {
      const option = options.nth(i);
      const optionText = await option.textContent();
      expect(optionText).toBe(orgList[i].name);
    }
  });

  test('should select the current user organization', async ({ page }) => {
    // Get the current organization ID
    const grafanaBootData = await getGrafanaBootData(page);
    expect(grafanaBootData.user).toHaveProperty('orgId');
    const currentOrgName = grafanaBootData.user.orgName;

    let selectedValue = '';
    if (await isComboBoxSupported(page)) {
      const { panel, input } = getPanelContentSelector(page);
      await expect(panel).toBeVisible();
      selectedValue = await input.getAttribute('value');
    } else {
      const select = page.getByTestId('org-select');
      await expect(select).toBeVisible();
      selectedValue = await select.first().textContent();
    }
    expect(selectedValue).toBe(currentOrgName);
  });

  test('should switch organization when selecting an option', async ({ page, gotoPanelEditPage }) => {
    const grafanaBootData = await getGrafanaBootData(page);
    const currentOrgId = grafanaBootData.user.orgId;

    // Get the list of organizations
    const orgList = await getOrgList(page);

    let options = [];
    if (await isComboBoxSupported(page)) {
      const { panel, input } = getPanelContentSelector(page);
      await expect(panel).toBeVisible();
      await input.click();
      const menuId = await input.getAttribute('aria-controls');
      options = await getSelectOptions(page, menuId);
      await expect(options).toHaveCount(orgList.length);
    } else {
      const select = page.getByTestId('org-select');
      await expect(select).toBeVisible();
      await select.click();
      options = await page.locator('[id^="react-select"][id*="-option-"]');
      await expect(options).toHaveCount(orgList.length);
    }

    // Switch to a different organization
    let newOrgId = '';
    let newOrgName = '';
    for (const org of orgList) {
      if (org.id !== Number(currentOrgId)) {
        newOrgId = org.id.toString();
        newOrgName = org.name;
        console.log(`Redirect to org: ${newOrgId}`);
        let option = null;
        option = options.filter({ hasText: org.name });

        await expect(option).toBeVisible();
        await option.click();
        await page.waitForURL((url) => url.searchParams.get('orgId') === newOrgId);
        break;
      }
    }

    if (newOrgId === '') {
      throw new Error('Failed to find a different organization');
    }

    // Check if the organization has been switched
    const newGrafanaBootData = await getGrafanaBootData(page);
    expect(newGrafanaBootData.user.orgId.toString()).toBe(newOrgId);
  });
});
