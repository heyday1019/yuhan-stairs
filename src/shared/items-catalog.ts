import { ITEM_IDS, type ItemId } from './constants';

export interface ItemMeta {
  id: ItemId;
  name: string;
  desc: string;
  price: number;
  emoji: string;       // placeholder, later replace with icon: '/sprites/items/bomb.png'
}

export const ITEMS_CATALOG: readonly ItemMeta[] = [
  { id: 'beanstalk', name: '사다리 잭콩', desc: '본인 즉시 +5층 점프, 콤보 유지', price: 50, emoji: '🌱' },
  { id: 'mine',      name: '지뢰',       desc: '상대의 다음 5칸 중 1칸에 지뢰, 밟으면 1초 정지', price: 30, emoji: '💥' },
  { id: 'bomb',      name: '시한폭탄',   desc: '3초 후 상대 화면 1.5초 가림 (게임 진행 영향 없음)', price: 80, emoji: '💣' },
] as const;

const META = new Map(ITEMS_CATALOG.map((m) => [m.id, m]));

export function getItemMeta(id: ItemId): ItemMeta {
  const m = META.get(id);
  if (!m) throw new Error(`unknown itemId: ${id}`);
  return m;
}

export function isValidItemId(s: string): s is ItemId {
  return (ITEM_IDS as readonly string[]).includes(s);
}
