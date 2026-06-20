import { Component, computed, input } from '@angular/core';

/**
 * Decorative deterministic QR-style grid. Not a real scannable code — it renders
 * a stable pattern from a seed so the same menu always looks the same. Swap for a
 * real QR generator (or a backend-rendered PNG) when wiring share endpoints.
 */
@Component({
  selector: 'app-qr-code',
  imports: [],
  templateUrl: './qr-code.html',
  styleUrl: './qr-code.css',
})
export class QrCodeComponent {
  /** Overall pixel size of the grid. */
  size = input(140);
  /** Seed string (e.g. the menu slug) — determines the pattern. */
  seed = input('nexmenus');

  private readonly modules = 21;

  readonly cells = computed<boolean[]>(() => {
    const seed = this.seed();
    const n = this.modules;
    const out: boolean[] = [];
    for (let i = 0; i < n * n; i++) {
      // Cheap deterministic hash per cell.
      let h = i * 2654435761;
      for (let k = 0; k < seed.length; k++) {
        h = (h ^ seed.charCodeAt(k)) * 16777619;
      }
      out.push(((h >>> 9) & 1) === 1);
    }
    return applyFinderPatterns(out, n);
  });

  readonly gridStyle = computed(() => ({
    width: `${this.size()}px`,
    height: `${this.size()}px`,
    gridTemplateColumns: `repeat(${this.modules}, 1fr)`,
    gridTemplateRows: `repeat(${this.modules}, 1fr)`,
  }));
}

/** Stamp the three corner finder squares so it reads as a QR code. */
function applyFinderPatterns(cells: boolean[], n: number): boolean[] {
  const set = (r: number, c: number, v: boolean) => {
    if (r >= 0 && r < n && c >= 0 && c < n) cells[r * n + c] = v;
  };
  const finder = (top: number, left: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        set(top + r, left + c, border || core);
      }
    }
    // quiet ring
    for (let i = -1; i <= 7; i++) {
      set(top - 1, left + i, false);
      set(top + 7, left + i, false);
      set(top + i, left - 1, false);
      set(top + i, left + 7, false);
    }
  };
  finder(0, 0);
  finder(0, n - 7);
  finder(n - 7, 0);
  return cells;
}
