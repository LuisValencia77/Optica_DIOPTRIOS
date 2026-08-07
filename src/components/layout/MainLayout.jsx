import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, UserRoundCog, Package, Glasses, ListOrdered, FileClock, LogOut, Settings, Menu, X, PackageCheck } from 'lucide-react';


const MainLayout = ({ children }) => {
  const { user, isManager, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="layout-container">
      {/* Overlay para móviles */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={closeSidebar}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
              <Glasses size={20} color="white" />
            </div>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>DIOPTRIOS</span>
          </div>
          {/* Botón cerrar solo visible en móvil */}
          <button className="menu-toggle-btn" onClick={closeSidebar} style={{ padding: 0 }}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
             <li>
              <NavLink to="/" onClick={closeSidebar} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: '#334155', backgroundColor: isActive ? '#f1f5f9' : 'transparent', fontWeight: isActive ? 'bold' : 'normal' })}>
                <LayoutDashboard size={20} />
                <span>Inicio</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/inventario" onClick={closeSidebar} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: '#334155', backgroundColor: isActive ? '#f1f5f9' : 'transparent', fontWeight: isActive ? 'bold' : 'normal' })}>
                <Package size={20} />
                <span>Inventario</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/pacientes" onClick={closeSidebar} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: '#334155', backgroundColor: isActive ? '#f1f5f9' : 'transparent', fontWeight: isActive ? 'bold' : 'normal' })}>
                <Users size={20} />
                <span>Pacientes</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/examenes" onClick={closeSidebar} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: '#334155', backgroundColor: isActive ? '#f1f5f9' : 'transparent', fontWeight: isActive ? 'bold' : 'normal' })}>
                <ListOrdered size={20} />
                <span>Exámenes Visuales</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/ventas/nueva" onClick={closeSidebar} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: '#334155', backgroundColor: isActive ? '#f1f5f9' : 'transparent', fontWeight: isActive ? 'bold' : 'normal' })}>
                <LayoutDashboard size={20} />
                <span>Punto de Venta</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/pedidos" onClick={closeSidebar} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: '#334155', backgroundColor: isActive ? '#f1f5f9' : 'transparent', fontWeight: isActive ? 'bold' : 'normal' })}>
                <PackageCheck size={20} />
                <span>Pedidos Realizados</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/ventas/historial" onClick={closeSidebar} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: '#334155', backgroundColor: isActive ? '#f1f5f9' : 'transparent', fontWeight: isActive ? 'bold' : 'normal' })}>
                <FileClock size={20} />
                <span>Historial de Ventas</span>
              </NavLink>
            </li>
            {isManager && (
              <li>
                <NavLink to="/usuarios" onClick={closeSidebar} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: '#334155', backgroundColor: isActive ? '#f1f5f9' : 'transparent', fontWeight: isActive ? 'bold' : 'normal', marginTop: '1rem', borderTop: '1px solid #cbd5e1' })}>
                  <Settings size={20} />
                  <span>Gestión Usuarios</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Header */}
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="header-sucursal" style={{ color: '#64748b' }}>
              Sucursal: <strong>Centro</strong>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <UserRoundCog size={20} color="#64748b" />
               <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{user?.name} <span className="header-sucursal">({user?.role})</span></span>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', cursor: 'pointer', padding: 0 }}>
              <LogOut size={18} />
              <span className="header-sucursal">Salir</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="mobile-p-1" style={{ flex: 1, padding: '2rem', backgroundColor: '#ffffff', overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
