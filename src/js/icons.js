const PATHS = {
  home: 'M3 12 L12 4 L21 12 M5 10 V20 H10 V14 H14 V20 H19 V10',
  brain: 'M9 4 C7 4 5 5.5 5 8 C3.5 8.5 3 10 3 11.5 C3 13 4 14 5 14.5 C4.5 15.5 5 17 6 17.5 C6.5 19 8 20 9.5 20 C11 20 12 19 12 17 V5 C12 4.5 10.5 4 9 4 M15 4 C16.5 4 18 4.5 18 5 V17 C18 19 16.5 20 15 20 C13.5 20 12 19 11.5 17.5 C12.5 17 13 15.5 12.5 14.5 C13.5 14 14.5 13 14.5 11.5 C14.5 10 14 8.5 12.5 8 C12.5 5.5 14.5 4 16.5 4 Z',
  cards: 'M4 7 H16 V19 H4 Z M8 3 H20 V15',
  book: 'M4 4 H11 C12.5 4 14 5 14 6.5 V20 C14 18.5 12.5 18 11 18 H4 Z M20 4 H13 C11.5 4 10 5 10 6.5 V20 C10 18.5 11.5 18 13 18 H20 Z',
  chart: 'M4 20 V4 M4 20 H20 M8 16 V12 M12 16 V8 M16 16 V10',
  settings: 'M12 8 A4 4 0 0 1 12 16 A4 4 0 0 1 12 8 Z M12 2 V5 M12 19 V22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M2 12 H5 M19 12 H22 M4.9 19.1 L7 17 M17 7 L19.1 4.9',
  play: 'M7 4 V20 L20 12 Z',
  check: 'M5 12 L10 17 L20 6',
  x: 'M6 6 L18 18 M18 6 L6 18',
  chevron_right: 'M9 6 L15 12 L9 18',
  chevron_left: 'M15 6 L9 12 L15 18',
  back: 'M19 12 H5 M12 5 L5 12 L12 19',
  target: 'M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 Z M12 7 A5 5 0 1 0 12 17 A5 5 0 1 0 12 7 Z M12 10 A2 2 0 1 0 12 14 A2 2 0 1 0 12 10 Z',
  flag: 'M4 21 V4 M4 4 H16 L13 8 L16 12 H4',
  calculator: 'M6 3 H18 V21 H6 Z M8 7 H16 M8 11 H10 M12 11 H14 M16 11 V15 M8 15 H10 M12 15 H14 M8 18 H14',
  grid: 'M4 4 H10 V10 H4 Z M14 4 H20 V10 H14 Z M4 14 H10 V20 H4 Z M14 14 H20 V20 H14 Z',
  clipboard: 'M9 4 H15 V7 H9 Z M7 4 H17 V20 H7 Z',
  baby: 'M12 3 A3 3 0 1 0 12 9 A3 3 0 1 0 12 3 Z M8 12 C9 14 10.5 15 12 15 C13.5 15 15 14 16 12 M5 21 V17 A4 4 0 0 1 9 13 H15 A4 4 0 0 1 19 17 V21',
  flame: 'M12 3 C13 6 16 8 16 12 C16 16 14 19 12 19 C10 19 8 16 8 13 C8 11 10 10 10 8 C11 9 12 10 12 11 C13 10 12 7 12 3 Z',
  trophy: 'M8 4 H16 V11 A4 4 0 0 1 12 15 A4 4 0 0 1 8 11 Z M5 5 V8 A3 3 0 0 0 8 11 M19 5 V8 A3 3 0 0 1 16 11 M12 15 V19 M8 21 H16',
  clock: 'M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 Z M12 7 V12 L15 14',
  refresh: 'M4 12 A8 8 0 0 1 18 7 L20 5 M20 5 V10 M20 5 H15 M20 12 A8 8 0 0 1 6 17 L4 19 M4 19 V14 M4 19 H9',
  trash: 'M4 7 H20 M9 7 V4 H15 V7 M6 7 L7 20 H17 L18 7 M10 11 V17 M14 11 V17',
  zap: 'M13 3 L5 14 H11 L10 21 L19 10 H13 Z'
};

export function icon(name, className = 'w-5 h-5') {
  const d = PATHS[name];
  if (!d) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="${className}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}" /></svg>`;
}
