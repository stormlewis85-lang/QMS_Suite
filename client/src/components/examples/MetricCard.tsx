import { MetricCard } from '../MetricCard';
import { Package, FileText, AlertTriangle } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
      <MetricCard
        title="Active Parts"
        value={24}
        icon={Package}
        trend={{ value: "+3 this month", isPositive: true }}
      />
      <MetricCard
        title="PFMEAs Generated"
        value={47}
        icon={FileText}
        trend={{ value: "+12 this week", isPositive: true }}
      />
      <MetricCard
        title="High Priority Items"
        value={8}
        icon={AlertTriangle}
        trend={{ value: "-2 resolved", isPositive: true }}
      />
    </div>
  );
}
