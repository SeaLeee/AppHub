import Store from 'electron-store';
import type { AppHubConfig } from '../shared/types';

const defaults: AppHubConfig = {
  rootDirs: [],
  apps: {},
  schedules: [],
};

export const store = new Store<AppHubConfig>({
  name: 'apphub-config',
  defaults,
});

export function getConfig(): AppHubConfig {
  return {
    rootDirs: store.get('rootDirs', []) as AppHubConfig['rootDirs'],
    apps: store.get('apps', {}) as AppHubConfig['apps'],
    schedules: store.get('schedules', []) as AppHubConfig['schedules'],
  };
}
