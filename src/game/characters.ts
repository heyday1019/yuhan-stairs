export interface Character {
  id: string;
  label: string;
  idle: string;
  jump: string;
}

function pair(num: string, name: string): Pick<Character, 'idle' | 'jump'> {
  return {
    idle: `/characters/bunny-${num}-${name}-idle.png`,
    jump: `/characters/bunny-${num}-${name}-jump.png`,
  };
}

export const CHARACTERS: Character[] = [
  { id: 'pink-beanie',    label: '핑크 비니', ...pair('01', 'pink-beanie') },
  { id: 'red-strawberry', label: '딸기',      ...pair('02', 'red-strawberry') },
  { id: 'orange-carrot',  label: '당근',      ...pair('03', 'orange-carrot') },
  { id: 'yellow-star',    label: '별 비니',   ...pair('04', 'yellow-star') },
  { id: 'green-frog',     label: '개구리',    ...pair('05', 'green-frog') },
  { id: 'cyan-beanie',    label: '민트 비니', ...pair('06', 'cyan-beanie') },
  { id: 'blue-night',     label: '잠옷',      ...pair('07', 'blue-night') },
  { id: 'purple-witch',   label: '마녀',      ...pair('08', 'purple-witch') },
  { id: 'magenta-bow',    label: '리본',      ...pair('09', 'magenta-bow') },
  { id: 'white-bunny',    label: '하얀 토끼', ...pair('10', 'white-bunny') },
  { id: 'black-skull',    label: '해골',      ...pair('11', 'black-skull') },
  { id: 'crystal-tophat', label: '실크햇',    ...pair('12', 'crystal-tophat') },
];

export const DEFAULT_CHARACTER_ID = 'pink-beanie';
export const OPPONENT_FALLBACK_ID = 'crystal-tophat';
export const CHARACTER_STORAGE_KEY = 'stair_race.character_id';

export function getCharacter(id: string | null | undefined): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
