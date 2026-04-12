import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = defineCloudflareConfig({
  incrementalCache: 'cf-r2-incremental-cache',
  tagCache: 'd1-next-mode-tag-cache',
  queue: 'direct',
});

export default config;
