import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2Cache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import d1TagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';

const config = defineCloudflareConfig({
  incrementalCache: r2Cache as any,
  tagCache: d1TagCache as any,
  queue: 'direct',
});

export default config;
