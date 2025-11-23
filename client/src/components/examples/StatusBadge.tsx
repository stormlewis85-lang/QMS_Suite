import { StatusBadge, APBadge } from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      <StatusBadge status="draft" />
      <StatusBadge status="review" />
      <StatusBadge status="effective" />
      <StatusBadge status="obsolete" />
      <StatusBadge status="superseded" />
      <APBadge level="high" value={125} />
      <APBadge level="medium" value={75} />
      <APBadge level="low" value={32} />
    </div>
  );
}
