const statusColors: Record<string, string> = {
  // Work Order
  quote: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  dispatched: 'bg-indigo-100 text-indigo-800',
  en_route: 'bg-purple-100 text-purple-800',
  on_site: 'bg-orange-100 text-orange-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  invoiced: 'bg-teal-100 text-teal-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  on_hold: 'bg-gray-100 text-gray-800',
  // Pod
  available: 'bg-green-100 text-green-800',
  returning: 'bg-cyan-100 text-cyan-800',
  off_duty: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-red-100 text-red-800',
  break: 'bg-yellow-100 text-yellow-800',
  // Inventory
  in_stock: 'bg-green-100 text-green-800',
  low_stock: 'bg-yellow-100 text-yellow-800',
  out_of_stock: 'bg-red-100 text-red-800',
  on_order: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  backordered: 'bg-orange-100 text-orange-800',
  // Claim
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-indigo-100 text-indigo-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  pending_info: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
  // Invoice
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-indigo-100 text-indigo-800',
  partially_paid: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  void: 'bg-gray-100 text-gray-800',
  write_off: 'bg-gray-100 text-gray-800',
  // Payment
  authorized: 'bg-blue-100 text-blue-800',
  captured: 'bg-green-100 text-green-800',
  settled: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-orange-100 text-orange-800',
  voided: 'bg-gray-100 text-gray-800',
  declined: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  // Transfer/PO
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  received: 'bg-green-100 text-green-800',
};

export default function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || 'bg-gray-100 text-gray-800';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
