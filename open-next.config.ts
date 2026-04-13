// 注意：d1TagCache 用 as any 绕过 OpenNext 1.19.1 的 ensure-cf-config Bug
// Bug: dftMaybeUseTagCache 检查用了 incrementalCache 而不是 tagCache
const config = {
  default: {
    override: {
      wrapper: 'cloudflare-node' as const,
      converter: 'edge' as const,
      proxyExternalRequest: 'fetch' as const,
      incrementalCache: 'dummy' as const,
      tagCache: 'dummy' as const,
      queue: 'direct' as const,
    },
  },
  edgeExternals: ['node:crypto'],
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge' as const,
      converter: 'edge' as const,
      proxyExternalRequest: 'fetch' as const,
      incrementalCache: 'dummy' as const,
      tagCache: 'dummy' as const,
      queue: 'direct' as const,
    },
  },
};

export default config;
