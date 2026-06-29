import { mountSidePanelApp } from './App.js';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Side panel root element was not found.');
}

mountSidePanelApp(root);
