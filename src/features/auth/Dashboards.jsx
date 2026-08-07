import React, { useState } from 'react';
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

const ResumenActividadWidget = ({ ventas, pedidos, pacientes }) => {
  const [filtroTiempo, setFiltroTiempo] = useState('Todas');
  const [ventaModal, setVentaModal] = useState(null);

  const ventasFiltradas = ventas.filter(v => {
    if (filtroTiempo === 'Todas') return true;
    const dateV = new Date(v.fecha);
    const today = new Date();
    if (filtroTiempo === 'Día') {
      return dateV.toDateString() === today.toDateString();
    } else if (filtroTiempo === 'Semana') {
      const msInWeek = 7 * 24 * 60 * 60 * 1000;
      return (today - dateV) <= msInWeek;
    } else if (filtroTiempo === 'Mes') {
      return dateV.getMonth() === today.getMonth() && dateV.getFullYear() === today.getFullYear();
    }
    return true;
  });

  const ultimasVentas = ventasFiltradas.slice(0, 5);
  const pedidosPendientes = pedidos.filter(p => p.estado !== 'Entregado').slice(0, 5);

  const getNombrePaciente = (id) => {
    const pac = pacientes.find(p => String(p.id) === String(id));
    return pac ? `${pac.nombre} ${pac.apellidos || ''}`.trim() : 'Mostrador';
  };

  const formatearProductos = (productosStr) => {
    try {
      const arr = typeof productosStr === 'string' ? JSON.parse(productosStr) : productosStr;
      return arr.map(p => `${p.cantidad}x ${p.marca} ${p.modelo}`).join(', ');
    } catch(e) { return 'Productos varios'; }
  };

  return (
    <div className="responsive-grid" style={{ marginTop: '1.5rem', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      {/* Modal Detalles de Venta */}
      {ventaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1rem 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b' }}>Detalles de Venta #{ventaModal.id}</h3>
            <div style={{ marginBottom: '0.75rem' }}><strong>Cliente:</strong> {getNombrePaciente(ventaModal.pacienteId)}</div>
            <div style={{ marginBottom: '0.75rem' }}><strong>Fecha:</strong> {new Date(ventaModal.fecha).toLocaleString()}</div>
            <div style={{ marginBottom: '0.75rem' }}><strong>Estado Pago:</strong> <span style={{ color: ventaModal.estadoPago === 'Pagado' ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>{ventaModal.estadoPago}</span></div>
            <div style={{ marginBottom: '0.75rem' }}><strong>Productos:</strong> {formatearProductos(ventaModal.productos)}</div>
            <div style={{ marginBottom: '0.75rem' }}><strong>Subtotal:</strong> {formatCurrency(ventaModal.subtotalCarrito)}</div>
            <div style={{ marginBottom: '0.75rem' }}><strong>Total:</strong> {formatCurrency(ventaModal.total)}</div>
            <div style={{ marginBottom: '1.5rem' }}><strong>Saldo Pendiente:</strong> {formatCurrency(ventaModal.saldoPendiente)}</div>
            <button onClick={() => setVentaModal(null)} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Columna Izquierda: Últimas Ventas */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign color="#16a34a" size={20} /> Últimas Ventas
          </h3>
          <select value={filtroTiempo} onChange={e => setFiltroTiempo(e.target.value)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
            <option value="Todas">Todas</option>
            <option value="Día">Hoy</option>
            <option value="Semana">Última Semana</option>
            <option value="Mes">Este Mes</option>
          </select>
        </div>
        
        {ultimasVentas.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No hay ventas en este periodo.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ultimasVentas.map(venta => (
              <div key={venta.id} onClick={() => setVentaModal(venta)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
                <div>
                  <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>Venta #{venta.id}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{getNombrePaciente(venta.pacienteId)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '0.95rem' }}>{formatCurrency(venta.total)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(venta.fecha).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Columna Derecha: Pedidos Pendientes */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle color="#d97706" size={20} /> Pedidos Pendientes de Entrega
        </h3>

        {pedidosPendientes.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No hay pedidos pendientes.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pedidosPendientes.map(pedido => (
              <div key={pedido.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>Pedido #{pedido.id}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{getNombrePaciente(pedido.pacienteId)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 'bold', color: pedido.estado === 'Listo para Recoger' ? '#059669' : '#b45309', fontSize: '0.85rem', backgroundColor: pedido.estado === 'Listo para Recoger' ? '#d1fae5' : '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                    {pedido.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const DashboardSuperUser = () => {
  const { user } = useAuth();
  const { ventas, inventario, pacientes, examenes, pedidos } = useDatabase();
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

      <ResumenActividadWidget ventas={ventas} pedidos={pedidos} pacientes={pacientes} />
    </div>
  );
};

export const DashboardAdmin = () => {
  const { user } = useAuth();
  const { ventas, inventario, pacientes, examenes, pedidos } = useDatabase();
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

      <ResumenActividadWidget ventas={ventas} pedidos={pedidos} pacientes={pacientes} />
    </div>
  );
};

export const DashboardEmployee = () => {
  const { user } = useAuth();
  const { ventas, inventario, pacientes, examenes, pedidos } = useDatabase();
  const summary = getDashboardSummary(ventas, inventario, pacientes, examenes);

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0 }}>Bienvenido {user.role}</h1>
      <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.95rem' }}>Punto de atención, ventas y pacientes.</p>
      
      <div className="responsive-grid" style={{ marginTop: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard title="Ventas Realizadas" value={summary.totalVentas} accent="#2563eb" icon={Glasses} />
        <StatCard title="Pacientes Registrados" value={summary.pacientesRegistrados} accent="#0f766e" icon={TrendingUp} />
      </div>

      <ResumenActividadWidget ventas={ventas} pedidos={pedidos} pacientes={pacientes} />
    </div>
  );
};

