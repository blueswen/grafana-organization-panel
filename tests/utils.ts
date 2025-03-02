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

export async function getGrafanaVersion(page): Promise<number> {
  const bootData = await getGrafanaBootData(page);

  const versionString = bootData?.settings?.buildInfo?.version;
  if (!versionString || typeof versionString !== 'string') {
    throw new Error('Failed to retrieve Grafana version');
  }

  const majorVersion = Number(versionString.split('.')[0]);

  if (isNaN(majorVersion)) {
    throw new Error(`Invalid Grafana version format: ${versionString}`);
  }

  return majorVersion;
}
