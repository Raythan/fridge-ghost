import { registerSW } from 'virtual:pwa-register';
import './styles.css';
import { initTheme } from './theme/theme';
import { mount } from './ui/mount';

initTheme();
registerSW({ immediate: true });

const app = document.querySelector<HTMLElement>('#app');
if (app) mount(app);
