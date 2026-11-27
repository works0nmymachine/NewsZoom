import type { CapacitorConfig } from '@capacitor/cli';

// De app laadt de live site: na een deploy is de app direct bijgewerkt.
// capacitor-web/ is alleen de foutpagina als de site niet bereikbaar is.
const config: CapacitorConfig = {
  appId: 'work.craftstudio.newszoom',
  appName: 'NewsZoom',
  webDir: 'capacitor-web',
  server: {
    url: 'https://newszoom.craftstudio.work',
    errorPath: 'index.html',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
