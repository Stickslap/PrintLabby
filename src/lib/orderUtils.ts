export const getOrderStatusStyle = (status: string): string => {
  const s = status?.toLowerCase() || '';
  
  if (s.includes('awaiting fulfillment')) return 'bg-blue-100 text-blue-700';
  if (s.includes('awaiting shipment') || s.includes('packing')) return 'bg-orange-100 text-orange-700';
  if (s.includes('awaiting pickup')) return 'bg-yellow-100 text-yellow-700';
  if (s.includes('partially shipped')) return 'bg-indigo-100 text-indigo-700';
  if (s.includes('completed')) return 'bg-green-100 text-green-700';
  if (s.includes('shipped')) return 'bg-emerald-100 text-emerald-700';
  if (s.includes('cancelled')) return 'bg-red-100 text-red-700';
  if (s.includes('declined')) return 'bg-rose-100 text-rose-700';
  if (s.includes('refunded') || s.includes('partially refunded')) return 'bg-purple-100 text-purple-700';
  if (s.includes('manual verification')) return 'bg-amber-100 text-amber-700';
  if (s.includes('disputed')) return 'bg-red-200 text-red-900 border border-red-300';
  if (s.includes('awaiting payment')) return 'bg-slate-100 text-slate-700';
  if (s.includes('submitted')) return 'bg-primary/10 text-primary';
  
  return 'bg-gray-100 text-gray-500';
};
