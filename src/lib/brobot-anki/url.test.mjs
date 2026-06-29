import assert from "node:assert/strict";

import { resolveBrowserAccessibleBaseUrl } from "./url.ts";

function withEnv(overrides, run) {
  const previous = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

withEnv(
  {
    NEXT_PUBLIC_SITE_URL: "https://snap-ortho.com",
    APP_URL: "https://snap-ortho.com",
    NEXT_PUBLIC_APP_URL: "https://snap-ortho.com",
  },
  () => {
    const request = new Request("http://localhost:3000/api/brobot/extension/auth/start-link", {
      headers: {
        "x-snaportho-addon-base-url": "http://localhost:3000",
      },
    });

    assert.equal(
      resolveBrowserAccessibleBaseUrl(request),
      "http://localhost:3000",
      "explicit extension origin should override production env URLs for local QA"
    );
  }
);

withEnv(
  {
    NEXT_PUBLIC_SITE_URL: "https://snap-ortho.com",
    APP_URL: "https://snap-ortho.com",
    NEXT_PUBLIC_APP_URL: "https://snap-ortho.com",
  },
  () => {
    const request = new Request("http://localhost:3000/api/brobot/extension/auth/start-link");

    assert.equal(
      resolveBrowserAccessibleBaseUrl(request),
      "https://snap-ortho.com",
      "site env URL should remain the default when no explicit extension origin is supplied"
    );
  }
);

console.log("BroBot extension auth URL tests passed.");
