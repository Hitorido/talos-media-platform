import type { NovelChapter, NovelDetails } from '@/types/novel';

function cover(seed: string) {
  return `https://picsum.photos/seed/${seed}/400/600`;
}

function banner(seed: string) {
  return `https://picsum.photos/seed/${seed}-banner/1200/675`;
}

const chapterStoryContent: Record<number, string[]> = {
  1: [
    'The night air was thick with the scent of ozone and pine. Atop the obsidian spire of Solitary Peak, Caelen watched the sky split open like old parchment.',
    'For three hundred years, the Barrier of the Seven Spheres had held back the Tides. But as the third moon turned crimson, crackling violet lightning rippled across the northern horizon, shattering the ancient runes etched into the mountainside.',
    '"It has begun," whispered Master Vane, clutching his brass astrolabe. His fingers trembled against the worn metal casing. "The prophecies were not metaphorical. The Astral Gates are opening."',
    'Caelen tightened his grip on his shattered silver rapier. The blade had broken during the Siege of Oakhaven, yet its faint light still hummed whenever demonic mana neared.',
    'Far below in the valley, the lanterns of the Vanguard Fortress flickered once, twice, and then went dark. A low rumble echoed through the cavernous roots of the earth, shaking dust from the towering ancient pines.',
  ],
  2: [
    'The breach at Oakhaven Valley had widened into a swirling vortex of purple shadow. Caelen stood amidst the smoldering ruins of the lower courtyard, his coat scorched from hellfire.',
    'Before him stood three Greater Fiends, their eyes burning like dying stars. Each possessed mana equivalent to a Peak Archmage of the Royal Citadel.',
    '"A mere mortal with a broken mana core?" hissed the lead demon, flexing talons wrought of abyssal iron. "Do you truly intend to block the passage of the Vanguard?"',
    'Caelen closed his eyes, inhaling the crisp mountain wind. Deep within his chest, the gold spark he had ignited atop Solitary Peak flared into a roaring inferno.',
    'With a single fluid step, he drew his silver rapier. The broken blade flared with solar brilliance, casting long shadows across the ash-covered stone.',
  ],
  3: [
    'Dawn broke over the Eastern Ridges, casting golden light across a battlefield silenced by sheer miracle. The three fiends lay dissolved into glittering mana dust.',
    'Master Vane stumbled down the winding stone stairs, his face pale with disbelief. "That technique... that was not human swordcraft. You resonated directly with the astral leyline!"',
    'Caelen leaned heavily against his sword, wiped a bead of sweat from his brow, and looked toward the capital city of Aethelgard.',
    '"The Vanguard was merely a distraction," Caelen said quietly. "The true target of the Astral Cult is the Emperor’s Sun Core in Aethelgard."',
    '"Then we must move immediately," Master Vane urged, pulling two silver flight scrolls from his robes. "If the Sun Core falls, the entire continent will shatter into the abyss."',
  ],
  4: [
    'The imperial highway to Aethelgard was abandoned, lined with empty merchant wagons and abandoned guard posts. News of the barrier breakdown had spread like wildfire.',
    'Riding aboard an ether-powered skiff, Caelen examined the golden rune glowing on the palm of his right hand. It had evolved into a three-ringed solar glyph.',
    '"According to the ancient records," Vane noted as he adjusted the skiff’s rudder, "the Solar Glyph only manifests in those who carry the bloodline of the First Sovereign."',
    'Caelen smirked slightly. "My father was a disgraced third prince who died in exile. If I am a sovereign, then the empire is in far worse shape than I thought."',
    'Ahead in the distance, the gilded domes of Aethelgard rose into the clouds—surrounding by a dense dome of black mana clouds.',
  ],
};

function getParagraphsForChapter(chapterNum: number): string[] {
  const index = ((chapterNum - 1) % 4) + 1;
  return chapterStoryContent[index] || chapterStoryContent[1];
}

function buildNovelChapters(novelId: string, count: number, titlePrefix: string): NovelChapter[] {
  const chapterTitles = [
    'The Awakening',
    'The Abyssal Breach',
    'Echoes of the Solar Flame',
    'March to Aethelgard',
    'The Guild of Alchemists',
    'Trial of the Sun Core',
    'Shadows in the Citadel',
    'The Unbroken Sword',
  ];

  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const subTitle = chapterTitles[index % chapterTitles.length];
    return {
      id: `${novelId}-ch-${number}`,
      number,
      title: `${titlePrefix} ${number}: ${subTitle}`,
      releaseDate: `2026-0${Math.min(number, 9)}-10`,
      wordCount: 2100 + number * 140,
      paragraphs: getParagraphsForChapter(number),
    };
  });
}

export const novelCatalog: NovelDetails[] = [
  {
    id: 'novel-t-1',
    title: 'The Seventh Librarian',
    altTitles: ['The Astral Archivist', 'Seong-Jwa-ui Gun-ju'],
    description:
      'Reborn as the disgraced archivist of the forbidden royal library, Caelen uses forgotten quantum alchemy to forge an unbeatable astral fleet.',
    coverUrl: cover('seventh-librarian'),
    bannerUrl: banner('seventh-librarian'),
    author: 'V. K. Thorne',
    translator: 'Radiant Translations',
    genres: ['Sci-Fi', 'Progression', 'Reincarnation', 'Kingdom Building'],
    rating: 9.3,
    status: 'ongoing',
    chapters: buildNovelChapters('novel-t-1', 25, 'Chapter'),
  },
  {
    id: 'novel-t-2',
    title: 'Ash and Starlight',
    altTitles: ['The Herbalist of the Void', 'Yeon-dan-sa'],
    description:
      'A modern chemistry professor wakes up in a cultivation realm as an outer disciple with a broken dantian, discovering modern science unlocks godly pills.',
    coverUrl: cover('ash-starlight'),
    bannerUrl: banner('ash-starlight'),
    author: 'Lin Wei',
    translator: 'WuxiaWorld',
    genres: ['Cultivation', 'Alchemy', 'Comedy', 'Xianxia'],
    rating: 9.1,
    status: 'ongoing',
    chapters: buildNovelChapters('novel-t-2', 30, 'Chapter'),
  },
  {
    id: 'novel-t-3',
    title: 'Whisper Protocol',
    altTitles: ['Steam & Sorcery', 'The Mechanical Crown'],
    description:
      'In a steampunk metropolis powered by dragon ether, a clockwork mechanic uncovers a conspiracy that threatens to plunge the empire into darkness.',
    coverUrl: cover('whisper-protocol'),
    bannerUrl: banner('whisper-protocol'),
    author: 'Eleanor Vance',
    translator: 'Author Original',
    genres: ['Steampunk', 'Fantasy', 'Mystery'],
    rating: 8.8,
    status: 'completed',
    chapters: buildNovelChapters('novel-t-3', 15, 'Chapter'),
  },
  {
    id: 'novel-t-4',
    title: 'City of Glass Tides',
    altTitles: ['Tides of Glass', 'Yuri Ba-da'],
    description:
      'Navigating subterranean oceans built beneath crystal reefs, a young cartographer unearths a sunken imperial palace.',
    coverUrl: cover('glass-tides'),
    bannerUrl: banner('glass-tides'),
    author: 'Marcus Vance',
    translator: 'Radiant Translations',
    genres: ['Fantasy', 'Adventure', 'Mystery'],
    rating: 8.5,
    status: 'ongoing',
    chapters: buildNovelChapters('novel-t-4', 20, 'Chapter'),
  },
  {
    id: 'novel-t-5',
    title: 'Ember Cartography',
    altTitles: ['Mapmaker of the Ash Wastes'],
    description:
      'A lone mapmaker survives inside a volcanic wasteland inhabited by ancient elemental dragons.',
    coverUrl: cover('ember-cartography'),
    bannerUrl: banner('ember-cartography'),
    author: 'Sora Takahashi',
    translator: 'WuxiaWorld',
    genres: ['Fantasy', 'Survival', 'Dragon'],
    rating: 8.3,
    status: 'ongoing',
    chapters: buildNovelChapters('novel-t-5', 18, 'Chapter'),
  },
];

const novelMap = new Map(novelCatalog.map((novel) => [novel.id, novel]));

export function getNovelById(id: string): NovelDetails | undefined {
  const direct = novelMap.get(id);
  if (direct) return direct;

  const separator = '__';
  const index = id.indexOf(separator);
  if (index > 0) {
    const providerId = id.slice(0, index);
    const sourceId = id.slice(index + separator.length);
    if (providerId === 'builtin-mock') {
      return novelMap.get(sourceId);
    }
  }

  return undefined;
}

export function getNovelChapter(novelId: string, chapterId: string): NovelChapter | undefined {
  const novel = getNovelById(novelId);
  return novel?.chapters.find((chapter) => chapter.id === chapterId);
}

export function getNextNovelChapter(novelId: string, chapterId: string): NovelChapter | undefined {
  const novel = getNovelById(novelId);
  if (!novel) return undefined;
  const index = novel.chapters.findIndex((chapter) => chapter.id === chapterId);
  if (index >= 0 && index < novel.chapters.length - 1) {
    return novel.chapters[index + 1];
  }
  return undefined;
}

export function getPreviousNovelChapter(
  novelId: string,
  chapterId: string,
): NovelChapter | undefined {
  const novel = getNovelById(novelId);
  if (!novel) return undefined;
  const index = novel.chapters.findIndex((chapter) => chapter.id === chapterId);
  if (index > 0) {
    return novel.chapters[index - 1];
  }
  return undefined;
}
