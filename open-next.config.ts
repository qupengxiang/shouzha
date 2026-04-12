import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = defineCloudflareConfig({
  incrementalCache: 'dynamo-d1',
  tagCache: 'dynamo-d1',
  queue: 'direct',
});

export default config;
