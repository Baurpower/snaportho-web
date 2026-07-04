import * as assert from 'node:assert/strict';

import { getConfiguredAppOrigin } from './runtime.js';

function withHostPermissions(hostPermissions: string[]) {
  (globalThis as { chrome?: unknown }).chrome = {
    runtime: {
      getManifest() {
        return {
          host_permissions: hostPermissions,
        };
      },
    },
  };
}

withHostPermissions([
  'https://www.orthobullets.com/*',
  'https://orthobullets.com/*',
  'https://rock.aaos.org/*',
  'https://www.rock.aaos.org/*',
  'https://*.rock.aaos.org/*',
  'http://localhost:3000/*',
  'https://snaportho.com/*',
  'https://www.snaportho.com/*',
]);

assert.equal(getConfiguredAppOrigin(), 'http://localhost:3000');

withHostPermissions([
  'https://www.orthobullets.com/*',
  'https://*.rock.aaos.org/*',
  'https://app.snaportho.com/*',
  'https://snaportho.com/*',
  'https://www.snaportho.com/*',
]);

assert.equal(getConfiguredAppOrigin(), 'https://app.snaportho.com');

console.log('Extension runtime origin tests passed.');
