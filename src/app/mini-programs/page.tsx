import { getPublishedMiniPrograms } from '@/lib/db';

export const metadata = {
  title: '造物 - 手札',
  description: '微信小程序作品集',
};

export default async function MiniProgramsPage() {
  const programs = await getPublishedMiniPrograms();

  return (
    <div className="min-h-screen pt-14">
      <div className="text-center py-16 pb-12">
        <h1 className="font-serif text-3xl font-bold text-text mb-3">造物</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          一些小玩具，记录折腾的过程
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-20">
        {programs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl block mb-4">🔧</span>
            <p>作品整理中，敬请期待</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map(program => (
              <a
                key={program.id}
                href={program.openLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-paper border border-border rounded-xl overflow-hidden hover:border-amber-600 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-40 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center overflow-hidden">
                  {program.coverImage ? (
                    <img src={program.coverImage} alt={program.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">📱</span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-serif text-base font-semibold mb-2 group-hover:text-amber-600 transition-colors">
                    {program.title}
                  </h2>
                  {program.description && (
                    <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
                      {program.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-amber-600 transition-colors">
                    <span>打开小程序</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
