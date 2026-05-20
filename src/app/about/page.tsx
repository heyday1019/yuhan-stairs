interface Track {
  slot: string;
  name: string;
  author: string;
  license: string;
  url: string;
}

const TRACKS: Track[] = [
  // CC-BY 트랙 사용 시 여기에 추가:
  // { slot: 'main_theme', name: '...', author: '...', license: 'CC-BY 4.0', url: 'https://...' },
];

const CHARACTERS = [
  { author: 'gamefromscratch (ca3 sprite sheet)', license: 'OGA-BY 3.0 / CC-BY 3.0', url: 'https://opengameart.org/' },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-md p-4 text-white">
      <h1 className="mb-4 text-xl font-bold">유한의 계단 레이스</h1>
      <p className="mb-2 text-sm text-slate-300">app-in-toss 1:1 계단 오르기 미니앱.</p>

      <h2 className="mt-6 mb-2 text-base font-bold">BGM 출처</h2>
      {TRACKS.length === 0 ? (
        <p className="text-sm text-slate-400">현재 사용 중인 BGM은 모두 Pixabay/FreePD (출처 표기 불필요) 라이선스로 제공됩니다.</p>
      ) : (
        <ul className="space-y-1 text-xs text-slate-300">
          {TRACKS.map((t) => (
            <li key={t.slot}>
              <strong>{t.slot}</strong>: {t.name} by {t.author} ({t.license}) — <a href={t.url} className="underline">{t.url}</a>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 mb-2 text-base font-bold">캐릭터 아트워크</h2>
      <ul className="space-y-1 text-xs text-slate-300">
        {CHARACTERS.map((c) => (
          <li key={c.author}>
            {c.author} ({c.license}) — <a href={c.url} className="underline">{c.url}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
