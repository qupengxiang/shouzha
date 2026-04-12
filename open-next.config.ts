import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'edge',
      converter: 'edge',
      incrementalCache: 'dynamo-d1',
      tagCache: 'dynamo-d1',
      queue: 'dynamo-d1',
    },
  },
};

export default config;
