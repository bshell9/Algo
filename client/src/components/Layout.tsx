import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const mainNav = [
  { name: 'Dashboard', href: '/' },
  { name: 'Work Orders', href: '/work-orders' },
  { name: 'Customers', href: '/customers' },
  { name: 'Vehicles', href: '/vehicles' },
  { name: 'Schedule', href: '/schedule' },
  { name: 'Pods', href: '/pods' },
  { name: 'Inventory', href: '/inventory' },
  { name: 'NAGS', href: '/nags-catalog' },
  { name: 'Claims', href: '/claims' },
  { name: 'Invoices', href: '/invoices' },
  { name: 'POS', href: '/pos' },
  { name: 'Quotes', href: '/quotes' },
  { name: 'Reports', href: '/reports' },
  { name: 'Referrals', href: '/referrals' },
];

const pageTitle: Record<string, string> = {
  '/': 'Dashboard',
  '/work-orders': 'Work Orders',
  '/work-orders/new': 'New Work Order',
  '/customers': 'Customers',
  '/vehicles': 'Vehicles',
  '/schedule': 'Schedule',
  '/pods': 'Pods',
  '/inventory': 'Inventory',
  '/nags-catalog': 'NAGS Catalog',
  '/claims': 'Claims',
  '/invoices': 'Invoices',
  '/pos': 'Point of Sale',
  '/quotes': 'Quotes',
  '/reports': 'Reports',
  '/shops': 'Shops',
  '/referrals': 'Agent Referrals',
};

export default function Layout() {
  const { user, logout, selectedShopId, setSelectedShop } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const title = pageTitle[location.pathname] || 'AutoGlass Pod';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ─── Top Header Bar (like GlasAve logo bar) ─── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-white border-b" style={{ borderColor: '#c0c0c0' }}>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded font-bold text-white text-lg" style={{ background: '#1a7a1a', border: '2px solid #0d5e0d' }}>
            AutoGlass Pod
          </div>
          <span className="text-lg text-gray-500">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/work-orders/new')} className="btn-ga-green px-4 py-1">New</button>
          <button className="btn-ga-cancel">Cancel</button>
          <button className="btn-ga-action">Save</button>
          <div className="ml-4 flex items-center gap-2 text-xs text-gray-500">
            <span>{user?.firstName} {user?.lastName}</span>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 ml-1" title="Sign Out">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Green Navigation Bar ─── */}
      <nav className="ga-topnav">
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            {item.name}
          </NavLink>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select
            className="text-xs bg-white/20 text-white border border-white/30 rounded px-2 py-0.5"
            value={selectedShopId || ''}
            onChange={(e) => setSelectedShop(e.target.value)}
          >
            <option value="">All Stores</option>
            <option value="shop1">SHOP1 - Downtown</option>
            <option value="shop2">SHOP2 - North</option>
            <option value="shop3">SHOP3 - East</option>
            <option value="shop4">SHOP4 - South</option>
          </select>
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-between px-4 py-1 bg-white border-t text-xs text-gray-400" style={{ borderColor: '#c0c0c0' }}>
        <span>AutoGlass Pod System</span>
        <span>{user?.firstName} {user?.lastName} | {user?.role?.toUpperCase()}</span>
      </div>
    </div>
  );
}
