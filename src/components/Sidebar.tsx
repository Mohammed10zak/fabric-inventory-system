'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Products', href: '/products', icon: '👗' },
  { name: 'Orders', href: '/orders', icon: '📦' },
  { name: 'Inventory', href: '/inventory', icon: '🏭' },
  { name: 'Fabrics', href: '/fabrics', icon: '🧵' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold gradient-text">Fabric Manager</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Ruehaya Factory</p>
      </div>

      {/* Navigation */}
      <nav className="py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--color-border)]">
        <div className="text-xs text-[var(--color-text-muted)]">
          <p>Currency: EGP 🇪🇬</p>
          <p className="mt-1">Print Cost: 25 EGP/m</p>
        </div>
      </div>
    </aside>
  );
}
