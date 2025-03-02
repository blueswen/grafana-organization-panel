import { PanelPlugin } from '@grafana/data';
import { OrganizationPanelOptions } from './types';
import { SimplePanel } from './components/OrganizationPanelPanel';

export const plugin = new PanelPlugin<OrganizationPanelOptions>(SimplePanel).setPanelOptions((builder) => {
  builder.addRadio({
    path: 'displayMode',
    name: 'Display mode',
    settings: {
      options: [
        { value: 'select', label: 'Select', description: 'A searchable dropdown menu' },
        { value: 'button', label: 'Button', description: 'Individual buttons' },
        {
          value: 'collapsible-button',
          label: 'Collapsible Button',
          description: 'Buttons that collapse into an overflow menu when they no longer fit in the container',
        },
      ],
    },
    defaultValue: 'select',
  });

  return builder;
});
