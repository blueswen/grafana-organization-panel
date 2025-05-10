import type { BootData } from '@grafana/data';

export async function getGrafanaBootData(page): Promise<BootData> {
  const rawBootData = await page.evaluate(() => window.grafanaBootData || null);
  if (rawBootData === null) {
    throw new Error('Failed to get grafanaBootData');
  }
  return rawBootData as unknown as BootData;
}

export async function switchOrg(page, orgId: string | number): Promise<void> {
  await page.evaluate(async (orgId) => {
    try {
      const response = await fetch(`/api/user/using/${orgId}`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Failed to switch to org ${orgId}: ${response.statusText}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, orgId);
}

export async function getOrgList(page): Promise<any[]> {
  return await page.evaluate(async () => {
    const res = await fetch('/api/orgs');
    return res.json();
  });
}

export async function getGrafanaVersion(page): Promise<{major: number; minor: number; patch: number}> {
  const bootData = await getGrafanaBootData(page);

  const versionString = bootData?.settings?.buildInfo?.version;
  if (!versionString || typeof versionString !== 'string') {
    throw new Error('Failed to retrieve Grafana version');
  }

  const [major, minor, patch] = versionString.split('.').map(Number);
    return { major, minor, patch };
}

export async function isComboBoxSupported(page: Page): Promise<boolean> {
  const version = await getGrafanaVersion(page);
  return version.major >= 11 && version.minor >= 5;
}

export function getPanelContentSelector(page: Page) {
  const panel = page.getByTestId('data-testid panel content');
  return {
    panel,
    input: panel.locator('input'),
  };
}

export async function getSelectOptions(page: Page, menuId: string) {
  if (await isComboBoxSupported(page)) {
    return page.locator(`#${menuId} [role="option"] span`);
  }
  else {
    return page.locator(`#${menuId} [role="option"] div div`);
  }
}

export async function openOrgSelect(page: Page) {
  const { input } = getPanelContentSelector(page);
  await input.click();
  const menuId = await input.getAttribute('aria-controls');
  const options = page.locator(`#${menuId} [role="option"] span`);
  return { menuId, options };
}
