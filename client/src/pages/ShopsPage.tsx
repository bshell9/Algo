import { useEffect, useState } from 'react';
import { shopAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedShopId, setSelectedShop } = useAuthStore();

  useEffect(() => {
    shopAPI.list().then(({ data }) => { setShops(data.data); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shop Locations</h1>
      <p className="text-sm text-gray-500">Select a shop to filter dashboard and data by location. Current: {selectedShopId ? shops.find((s) => s.id === selectedShopId)?.name || selectedShopId : 'All Shops'}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shops.map((shop) => (
          <div
            key={shop.id}
            className={`card cursor-pointer transition-all ${selectedShopId === shop.id ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-md'}`}
            onClick={() => setSelectedShop(shop.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{shop.name}</h3>
                <p className="text-sm text-gray-500">{shop.code}</p>
              </div>
              {selectedShopId === shop.id && (
                <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded">Active</span>
              )}
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p>{shop.address}, {shop.city}, {shop.state} {shop.zip}</p>
              <p>{shop.phone} | {shop.email}</p>
              {shop.nagsId && <p className="text-xs">NAGS ID: {shop.nagsId}</p>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">Staff</p><p className="font-bold">{shop._count?.users || 0}</p></div>
              <div className="p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">Pods</p><p className="font-bold">{shop._count?.pods || 0}</p></div>
              <div className="p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">Orders</p><p className="font-bold">{shop._count?.workOrders || 0}</p></div>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Tax: {(shop.taxRate * 100).toFixed(1)}% | Labor: ${shop.laborRate}/hr | TZ: {shop.timezone}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setSelectedShop('')} className="btn-secondary">Clear Shop Filter (View All)</button>
    </div>
  );
}
