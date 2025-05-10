import { css, cx } from '@emotion/css';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PanelProps, GrafanaTheme2 } from '@grafana/data';
import { OrganizationPanelOptions, Organization } from 'types';
import { ToolbarButtonRow, ToolbarButton, Button, Combobox, useTheme2, Select } from '@grafana/ui';
import { getBackendSrv, config } from '@grafana/runtime';

interface Props extends PanelProps<OrganizationPanelOptions> {}

export const SimplePanel: React.FC<Props> = ({ options }) => {
  const [organizationsList, setOrganizationsList] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<number | null>(null);
  const theme = useTheme2();
  const styles = getStyles(theme);

  function getGrafanaRuntimeVersion(): { major: number; minor: number; patch: number } {
    const versionStr = config.buildInfo.version; // e.g., '10.3.2'
    const [major, minor, patch] = versionStr.split('.').map(Number);
    return { major, minor, patch };
  }

  const version = getGrafanaRuntimeVersion();
  const isComboSupported = version.major >= 11 && version.minor >= 5;

  const baseURL = useMemo(() => {
    const url = window.location.href;
    if (url.includes('/d/')) {
      return url.split('/d/')[0];
    }
    return url.split('?')[0];
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      const result = await getBackendSrv().get('api/user/orgs');
      setOrganizationsList(
        result.map((item: any) => ({
          label: item.name,
          value: item.orgId,
        }))
      );
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  }, []);

  const fetchCurrentOrg = useCallback(async () => {
    try {
      const user = await getBackendSrv().get('api/user');
      setCurrentOrg(user.orgId);
    } catch (error) {
      console.error('Error fetching user organization:', error);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
    fetchCurrentOrg();
  }, [fetchOrganizations, fetchCurrentOrg]);

  switch (options.displayMode) {
    case 'select':
      if(!isComboSupported) {
        return (
          <Select
            data-testid="org-select"
            options={organizationsList}
            value={currentOrg}
            onChange={(selected) => {
              if (selected?.value) {
                window.open(`${baseURL}/?orgId=${selected.value}`, '_self');
              }
            }}
          />
        );
      }
      return (
        <Combobox
          data-testid="org-select"
          options={organizationsList}
          value={currentOrg}
          onChange={(selected) => {
            if (selected?.value) {
              window.open(`${baseURL}/?orgId=${selected.value}`, '_self');
            }
          }}
        />
      );
    case 'button':
      return (
        <div className={cx(styles.container)}>
          {organizationsList.map((organization) => (
            <Button
              key={`org-${organization.value}`}
              data-testid={`org-${organization.value}`}
              variant="secondary"
              fill="solid"
              className={cx(styles.button, organization.value === currentOrg && styles.active, {
                active: organization.value === currentOrg,
              })}
              onClick={() => {
                window.open(`${baseURL}/?orgId=${organization.value}`, '_self');
              }}
            >
              {organization.label}
            </Button>
          ))}
        </div>
      );
    case 'collapsible-button':
      return (
        <ToolbarButtonRow>
          {organizationsList.map((organization) => (
            <ToolbarButton
              key={`org-${organization.value}`}
              variant={organization.value === currentOrg ? 'active' : 'canvas'}
            >
              <a href={`${baseURL}/?orgId=${organization.value}`} target="_self">
                {organization.label}
              </a>
            </ToolbarButton>
          ))}
        </ToolbarButtonRow>
      );
    default:
      return null;
  }
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css`
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    `,
    button: css`
      padding: 0 8px;
      position: relative;
    `,
    active: css`
      &::before {
        display: block;
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        bottom: 0;
        border-radius: ${theme.shape.radius.default};
        background-image: ${theme.colors.gradients.brandHorizontal};
      }
    `,
  };
};
