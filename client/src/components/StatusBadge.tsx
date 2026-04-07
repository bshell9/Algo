const statusColors: Record<string, string> = {
  quote: 'bg-gray-200 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  dispatched: 'bg-indigo-100 text-indigo-800',
  en_route: 'bg-purple-100 text-purple-800',
  on_site: 'bg-orange-100 text-orange-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'text-white',
  invoiced: 'text-white',
  paid: 'text-white',
  cancelled: 'bg-red-100 text-red-800',
  on_hold: 'bg-gray-200 text-gray-700',
  available: 'text-white',
  returning: 'bg-cyan-100 text-cyan-800',
  off_duty: 'bg-gray-200 text-gray-700',
  maintenance: 'bg-red-100 text-red-800',
  in_stock: 'text-white',
  low_stock: 'bg-yellow-100 text-yellow-800',
  out_of_stock: 'bg-red-100 text-red-800',
  on_order: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  draft: 'bg-gray-200 text-gray-700',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'text-white',
  denied: 'bg-red-100 text-red-800',
  sent: 'bg-blue-100 text-blue-800',
  partially_paid: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  void: 'bg-gray-200 text-gray-700',
  captured: 'text-white',
  voided: 'bg-gray-200 text-gray-700',
  received: 'text-white',
};

const greenStatuses = ['completed', 'invoiced', 'paid', 'available', 'in_stock', 'approved', 'captured', 'received'];

export default function StatusBadge({ status }: { status: string }) {
  const isGreen = greenStatuses.includes(status);
  const color = statusColors[status] || 'bg-gray-200 text-gray-700';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}
      style={isGreen ? { background: '#1a7a1a' } : undefined}
    >
      {label}
    </span>
  );
}
