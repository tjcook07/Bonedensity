import { initRouter } from './router.js';
import { registerSW } from 'virtual:pwa-register';

registerSW({
  onNeedRefresh() {},
  onOfflineReady() {}
});

initRouter();
