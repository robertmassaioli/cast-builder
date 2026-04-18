import { render } from 'preact';
import { App } from './App.js';
import './global.css.js';

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
