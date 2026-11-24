const KEY = 'sakura-kyushoku';
export interface Save { high: number; stars: number[] }
export function load(): Save {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (data && typeof data.high === 'number' && Array.isArray(data.stars)) return data;
  } catch { /* 保存できなくても遊べる */ }
  return { high: 0, stars: [0, 0, 0] };
}
export function save(data: Save): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 保存は任意 */ }
}
export function loadMuted(): boolean {
  try { return localStorage.getItem(KEY + '-muted') === '1'; } catch { return false; }
}
export function saveMuted(muted: boolean): void {
  try { localStorage.setItem(KEY + '-muted', muted ? '1' : '0'); } catch { /* 保存は任意 */ }
}
