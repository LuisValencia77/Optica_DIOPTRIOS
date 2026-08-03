import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, getDashboardSummary } from '../../utils/metrics';
import { TrendingUp, Glasses, DollarSign, AlertCircle } from 'lucide-react';

const StatCard = ({ title, value, accent, icon: Icon }) => (
  <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div>
      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.35rem', fontWeight: '500' }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: accent }}>{value}</div>
    </div>
    {Icon && (
      <div style={{ backgroundColor: `${accent}15`, padding: '0.75rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={24} color={accent} />
      </div>
    )}
  </div>
);

const TopVendidosWidget = ({ ventas }) => {
  // Contabilizar productos/armazones vendidos
  const conteoMap = {};
  ventas.forEach(v => {
    const productos = typeof v.productos === 'string' ? JSON.parse(v.productos) : (v.productos || []);
    productos.forEach(p => {
      const key = `${p.marca || ''} ${p.modelo || ''} (${p.tipo || 'Producto'})`.trim();
      const cant = p.cantidadVenta || p.cantidad || 1;
      conteoMap[key] = (conteoMap[key] || 0) + cant;
    });
  });

  const topItems = Object.entries(conteoMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginTop: '1.5rem', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <TrendingUp color="#2563eb" size={20} /> Top Armazones y Productos Más Vendidos
      </h3>

      {topItems.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No hay suficientes datos de ventas registradas.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {topItems.map(([nombre, cantidad], index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ backgroundColor: index === 0 ? '#fef3c7' : '#e2e8f0', color: index === 0 ? '#d97706' : '#475569', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                  {index + 1}
                </span>
                <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>{nombre}</span>
              </div>
              <span style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '0.9rem', backgroundColor: '#eff6ff', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                {cantidad} vendidos
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DashboardSuperUser = () => {
  const { user } = useAuth();
  const { ventas, inventario, pacientes, examenes } = useDatabase();
  const summary = getDashboardSummary(ventas, inventario, pacientes, examenes);

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0 }}>Bienvenido {user.role}</h1>
      <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.95rem' }}>Panel Ejecutivo Financiero y Control del Sistema.</p>
      
      <div className="responsive-grid" style={{ marginTop: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard title="Ventas Totales" value={summary.totalVentas} accent="#2563eb" icon={Glasses} />
        <StatCard title="Ingresos Totales" value={formatCurrency(summary.ingresosTotales)} accent="#16a34a" icon={DollarSign} />
        <StatCard title="Saldos Pendientes por Cobrar" value={formatCurrency(summary.saldoPendiente)} accent="#d97706" icon={TrendingUp} />
        <StatCard title="Armazones con Stock Bajo" value={summary.productosBajoStock} accent="#dc2626" icon={AlertCircle} />
      </div>

      <TopVendidosWidget ventas={ventas} />
    </div>
  );
};

export const DashboardAdmin = () => {
  const { user } = useAuth();
  const { ventas, inventario, pacientes, examenes } = useDatabase();
  const summary = getDashboardSummary(ventas, inventario, pacientes, examenes);

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0 }}>Bienvenido {user.role}</h1>
      <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.95rem' }}>Control general de sucursal, inventario y expedientes.</p>
      
      <div className="responsive-grid" style={{ marginTop: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard title="Pacientes Registrados" value={summary.pacientesRegistrados} accent="#0f766e" icon={Glasses} />
        <StatCard title="Exámenes Capturados" value={summary.examenesRegistrados} accent="#7c3aed" icon={TrendingUp} />
        <StatCard title="Saldo Pendiente" value={formatCurrency(summary.saldoPendiente)} accent="#b45309" icon={DollarSign} />
        <StatCard title="Productos Bajo Stock" value={summary.productosBajoStock} accent="#dc2626" icon={AlertCircle} />
      </div>

      <TopVendidosWidget ventas={ventas} />
    </div>
  );
};

export const DashboardEmployee = () => {
  const { user } = useAuth();
  const { ventas, inventario, pacientes, examenes } = useDatabase();
  const summary = getDashboardSummary(ventas, inventario, pacientes, examenes);

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0 }}>Bienvenido {user.role}</h1>
      <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.95rem' }}>Punto de atención, ventas y pacientes.</p>
      
      <div className="responsive-grid" style={{ marginTop: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard title="Ventas Realizadas" value={summary.totalVentas} accent="#2563eb" icon={Glasses} />
        <StatCard title="Pacientes Registrados" value={summary.pacientesRegistrados} accent="#0f766e" icon={TrendingUp} />
      </div>

      <TopVendidosWidget ventas={ventas} />
    </div>
  );
};

