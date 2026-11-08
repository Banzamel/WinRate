import { useEffect, useRef } from 'react';
import type { PairStats } from '../../../core/stats';
import { useI18n } from '../../../shared/i18n';

// Heat map of every pair's deviation from the expectation (z-score): gold above, blue below.
export function PairHeatMap({ pairs, size }: { pairs: PairStats; size: number }) {
  const { t } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const w = size + 1;
    const sd = Math.sqrt(pairs.expected) || 1;
    ctx.clearRect(0, 0, size * 10, size * 10);
    for (let x = 1; x <= size; x++) {
      for (let y = 1; y <= size; y++) {
        if (x === y) continue;
        const z = Math.max(-3, Math.min(3, (pairs.matrix[Math.min(x, y) * w + Math.max(x, y)] - pairs.expected) / sd));
        ctx.fillStyle = z >= 0 ? `rgba(240, 180, 60, ${z / 3})` : `rgba(80, 150, 255, ${-z / 3})`;
        ctx.fillRect((x - 1) * 10, (y - 1) * 10, 10, 10);
      }
    }
  }, [pairs, size]);
  return <canvas ref={ref} width={size * 10} height={size * 10} className="heat" title={t('stats.heatTitle')} />;
}
