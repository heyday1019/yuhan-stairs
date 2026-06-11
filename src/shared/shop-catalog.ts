export const BOOSTS = [
  { id: 'beanstalk_up', label: '🌱 콩 부스트',  price: 50,  games: 3, targetItem: 'beanstalk' as const },
  { id: 'lightning_up', label: '⚡ 번개 부스트', price: 60,  games: 3, targetItem: 'lightning' as const },
  { id: 'lucky_box',    label: '🎁 럭키 박스',   price: 40,  games: 1, targetItem: null },
] as const;

export type BoostId = typeof BOOSTS[number]['id'];

export const COSMETICS = [
  { characterId: 'pink-beanie',    label: '핑크 비니',  price: 0   },
  { characterId: 'red-strawberry', label: '딸기',       price: 200 },
  { characterId: 'orange-carrot',  label: '당근',       price: 200 },
  { characterId: 'yellow-star',    label: '별 비니',    price: 200 },
  { characterId: 'green-frog',     label: '개구리',     price: 300 },
  { characterId: 'cyan-beanie',    label: '민트 비니',  price: 300 },
  { characterId: 'blue-night',     label: '잠옷',       price: 300 },
  { characterId: 'purple-witch',   label: '마녀',       price: 300 },
  { characterId: 'magenta-bow',    label: '리본',       price: 400 },
  { characterId: 'white-bunny',    label: '하얀 토끼',  price: 400 },
  { characterId: 'black-skull',    label: '해골',       price: 400 },
  { characterId: 'crystal-tophat', label: '실크햇',     price: 400 },
] as const;

export type CosmeticEntry = typeof COSMETICS[number];
