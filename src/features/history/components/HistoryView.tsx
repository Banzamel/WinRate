// History: download, import, export, manual entry and the list of all draws.
import { useAppState } from '../../../app/hooks';
import { DrawListCard } from './DrawListCard';
import { ManualEntryCard } from './ManualEntryCard';
import { SourcesCard } from './SourcesCard';

export function HistoryView({ id }: { id: string }) {
  const game = useAppState((s) => s.games[id]);
  return (
    <>
      <div className="grid-2">
        <SourcesCard game={game} />
        <ManualEntryCard game={game} />
      </div>
      <DrawListCard id={id} />
    </>
  );
}
