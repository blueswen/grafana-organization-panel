import { FullConfig } from '@playwright/test';
import { readFile } from 'fs/promises';

export default async function globalSetup(config: FullConfig) {
  const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3000';
  const GRAFANA_TOKEN = 'admin:admin';

  const provisioningDashboard = JSON.parse(await readFile('./provisioning/dashboards/dashboard.json', 'utf-8'));
  provisioningDashboard.title = 'Imported organization panel dashboard';
  delete provisioningDashboard.id;
  delete provisioningDashboard.uid;

  const orgList = [
    'Alpha Org.',
    'Beta Org.',
    'Gamma Org.',
    'Delta Org.',
    'Epsilon Org.',
    'Zeta Org.',
    'Eta Org.',
    'Theta Org.',
    'Iota Org.',
  ];
  console.log('🔄 Setting up Grafana test environment...');

  try {
    const orgsResponse = await fetch(`${GRAFANA_URL}/api/user/orgs`, {
      headers: { Authorization: `Basic ${Buffer.from(GRAFANA_TOKEN).toString('base64')}` },
    });

    if (!orgsResponse.ok) {
      throw new Error(`Failed to fetch organizations: ${orgsResponse.statusText}`);
    }

    const existingOrgs = await orgsResponse.json();

    for (const org of orgList) {
      if (!existingOrgs.find((item: any) => item.name === org)) {
        console.log(`🚀 Creating organization: ${org}`);
        const createOrgResponse = await fetch(`${GRAFANA_URL}/api/orgs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(GRAFANA_TOKEN).toString('base64')}`,
          },
          body: JSON.stringify({ name: org }),
        });
        const createOrgResponseJson = await createOrgResponse.json();

        if (!createOrgResponse.ok) {
          throw new Error(`Failed to create org ${org}: ${createOrgResponse.statusText}`);
        } else {
          // Switch to the new organization
          console.log(createOrgResponseJson);
          const switchResponse = await fetch(`${GRAFANA_URL}/api/user/using/${createOrgResponseJson['orgId']}`, {
            method: 'POST',
            headers: { Authorization: `Basic ${Buffer.from(GRAFANA_TOKEN).toString('base64')}` },
          });
          if (!switchResponse.ok) {
            throw new Error(`Failed to switch to org ${org}: ${switchResponse.statusText}`);
          } else {
            // Import the default dashboard
            const importResponse = await fetch(`${GRAFANA_URL}/api/dashboards/db`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(GRAFANA_TOKEN).toString('base64')}`,
              },
              body: JSON.stringify({ dashboard: provisioningDashboard, overwrite: false }),
            });
            if (!importResponse.ok) {
              throw new Error(`Failed to import dashboard: ${importResponse.statusText}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error setting up Grafana organizations:', error);
  }

  console.log('✅ Grafana test environment is ready!');
}
