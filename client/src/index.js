// @flow
import React from 'react';
import { createRoot } from 'react-dom/client';

import type { AppConfig, DispatchCommand } from './entities';
import { type Analytics, RealAnalytics } from './analytics';
import { getDesignConfig, setStorageFlags } from './utils/stateUtils';
import App from './App';

// $FlowIgnore
import './index.scss';

const pgContainer = document.createElement('div');
pgContainer.classList.add('gamalon-app');
let root = null;

let analytics: ?Analytics;
let savedConfig: ?AppConfig;

// Renders the root App component (or re-renders it with updated config).
function renderApp() {
  if (!analytics || !savedConfig || !root) {
    return;
  }
  const designConfig = getDesignConfig(savedConfig);
  setStorageFlags(designConfig);
  if (analytics && savedConfig && root) {
    root.render(
      <App
        organizationId={savedConfig.organizationId}
        socketURL={savedConfig.socketURL}
        design={designConfig}
        analytics={analytics}
        serverBehavior={savedConfig.serverBehavior}
      />,
    );
  }
}

if (!window.GAMALON) {
  window.GAMALON = {
    destroy: () => {},
    init: (config: AppConfig) => { console.log(config); },
    dispatch: (command: DispatchCommand) => { console.log(command); },
    pgInitialized: false,
  };
}

window.GAMALON.init = async (config: AppConfig): any => {
  if (!config.organizationId) {
    console.error('Configuration missing organization ID');
    return;
  }
  if (window.GAMALON.pgInitialized) {
    console.log('pg already init');
    return;
  }
  window.GAMALON.pgInitialized = true;

  savedConfig = config;
  analytics = new RealAnalytics(config);
  await analytics.init();

  let targetNode: ?HTMLBodyElement | HTMLElement = document.body;
  if (config.container) {
    targetNode = null;
    if (typeof config.container === 'string') {
      const containerNode = document.querySelector(config.container);
      if (containerNode) {
        targetNode = containerNode;
      }
    } else if (Array.isArray(config.container)) {
      for (let i = 0; i < config.container.length; i += 1) {
        const containerNode = document.querySelector(config.container[i]);
        if (containerNode) {
          targetNode = containerNode;
          break;
        }
      }
    } else {
      targetNode = config.container;
    }
  }
  if (!root) {
    root = createRoot(pgContainer);
  }
  if (targetNode) {
    targetNode.appendChild(pgContainer);
    renderApp();
  }
};

window.GAMALON.destroy = () => {
  if (root) {
    root.unmount();
    analytics = undefined;
    savedConfig = undefined;
    const container = pgContainer.parentNode;
    if (container) {
      container.removeChild(pgContainer);
    }
    root = null;
    window.GAMALON.pgInitialized = false;
  }
};
