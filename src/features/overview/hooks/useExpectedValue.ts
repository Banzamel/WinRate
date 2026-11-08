import { useEffect, useState } from 'react';
import { useServices } from '../../../app/hooks';
import type { EvReport } from '../../analysis';
import type { GameInfo } from '../../game';

export interface EvInputs { jackpot: number; sold: number; prizes: Record<string, number> }

// The expected value of a ticket, recomputed whenever the inputs change.
export function useExpectedValue(game: GameInfo) {
  const { analysis } = useServices();
  const [inputs, setInputs] = useState<EvInputs>({ jackpot: game.typicalJackpot, sold: game.typicalSales, prizes: { ...game.typicalPrizes } });
  const [result, setResult] = useState<EvReport | null>(null);
  useEffect(() => {
    let live = true;
    analysis.expectedValue(game.id, inputs).then((r) => { if (live) setResult(r); }).catch(() => { /* superseded */ });
    return () => { live = false; };
  }, [analysis, game.id, inputs]);
  return { inputs, setInputs, result };
}
