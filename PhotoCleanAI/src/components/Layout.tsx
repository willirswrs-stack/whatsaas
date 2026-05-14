import React from 'react';
import { Home, Image as ImageIcon, Search, Trash2, Settings, Shield } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass-effect px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800">PhotoClean <span className="text-primary">AI</span></h1>
        </div>
        <Link to="/privacy" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
          <Settings className="w-5 h-5" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-effect px-4 py-3 rounded-full flex items-center gap-2 shadow-2xl z-50 border-white/40">
        <NavButton to="/" icon={<Home className="w-6 h-6" />} label="Início" />
        <NavButton to="/gallery" icon={<ImageIcon className="w-6 h-6" />} label="Fotos" />
        <NavButton to="/search" icon={<Search className="w-6 h-6" />} label="Busca" />
        <NavButton to="/trash" icon={<Trash2 className="w-6 h-6" />} label="Lixeira" />
      </nav>
    </div>
  );
};

const NavButton = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `
        flex flex-col items-center justify-center px-5 py-2 rounded-full transition-all duration-300
        ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'text-slate-500 hover:text-primary hover:bg-primary/5'}
      `}
    >
      {icon}
      <span className="text-[10px] font-medium mt-1 uppercase tracking-wider">{label}</span>
    </NavLink>
  );
};

export default Layout;
