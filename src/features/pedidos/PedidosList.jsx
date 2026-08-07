import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Mail, PackageCheck, User, Calendar, DollarSign } from 'lucide-react';

const PedidosList = () => {
  const { pedidos, pacientes, notificarPedidoListo, actualizarEstadoPedido } = useDatabase();
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [loadingMail, setLoadingMail] = useState({});

  const handleNotificar = async (pedidoId) => {
    setLoadingMail(prev => ({ ...prev, [pedidoId]: true }));
    await notificarPedidoListo(pedidoId);
    setLoadingMail(prev => ({ ...prev, [pedidoId]: false }));
  };

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    await actualizarEstadoPedido(pedidoId, nuevoEstado);
  };

  const pedidosFiltrados = pedidos.filter(ped => {
    const paciente = pacientes.find(p => p.id.toString() === (ped.pacienteId || '').toString());
    const nombrePaciente = paciente ? `${paciente.nombre} ${paciente.apellidos || ''}`.trim().toLowerCase() : 'mostrador';
    const idPedidoStr = (ped.id || '').toString();

    const coincideBusqueda = nombrePaciente.includes(busqueda.toLowerCase()) || idPedidoStr.includes(busqueda);
    const coincideEstado = filtroEstado === 'Todos' || ped.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  return (
    <div style={{ padding: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: '#1e293b', margin: 0 }}>Pedidos Realizados</h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Gestiona pedidos de clientes y notifica cuando los productos están listos para ser recogidos.
          </p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Buscar por Cliente o Pedido ID</label>
          <input
            type="text"
            placeholder="Ej. Juan Pérez o 1712..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Filtrar por Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Listo para Recoger">Listo para Recoger</option>
            <option value="Entregado">Entregado</option>
          </select>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {pedidosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <PackageCheck size={48} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '1.1rem', margin: 0 }}>No se encontraron pedidos registrados.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>

          {pedidosFiltrados.map((pedido) => {
            const paciente = pacientes.find((p) => p.id.toString() === (pedido.pacienteId || '').toString());
            const productos = typeof pedido.productos === 'string' ? JSON.parse(pedido.productos) : (pedido.productos || []);

            let badgeBg = '#fef3c7';
            let badgeColor = '#b45309';
            if (pedido.estado === 'Listo para Recoger') {
              badgeBg = '#dcfce7';
              badgeColor = '#15803d';
            } else if (pedido.estado === 'Entregado') {
              badgeBg = '#e0f2fe';
              badgeColor = '#0369a1';
            }

            return (
              <div
                key={pedido.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>PEDIDO #{pedido.id}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                        <User size={16} color="#475569" />
                        <strong style={{ color: '#1e293b', fontSize: '1rem' }}>{paciente ? `${paciente.nombre} ${paciente.apellidos || ''}`.trim() : 'Venta General / Mostrador'}</strong>
                      </div>
                      {paciente?.correo && (
                        <span style={{ fontSize: '0.8rem', color: '#2563eb', display: 'block', marginTop: '0.1rem' }}>
                          📧 {paciente.correo}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pedido.estado || 'Pendiente'}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '0.75rem 0', margin: '0.75rem 0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.4rem' }}>Artículos / Lentes:</div>
                    {productos.length === 0 ? (
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sin detalle de productos</span>
                    ) : (
                      productos.map((prod, idx) => (
                        <div key={idx} style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span>• {prod.marca || ''} {prod.modelo || ''} ({prod.tipo || 'Producto'})</span>
                          <span style={{ fontWeight: 'bold' }}>x{prod.cantidadVenta || prod.cantidad || 1}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} />
                      <span>{new Date(pedido.fecha).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', fontWeight: 'bold', fontSize: '1.05rem' }}>
                      <DollarSign size={16} />
                      <span>${(Number(pedido.total) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Acciones del Pedido */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => handleNotificar(pedido.id)}
                    disabled={loadingMail[pedido.id] || !paciente?.correo}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      backgroundColor: paciente?.correo ? '#2563eb' : '#cbd5e1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: paciente?.correo ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '0.5rem',
                    }}
                    title={!paciente?.correo ? 'El paciente no tiene un correo registrado' : 'Mandar correo para recoger'}
                  >
                    <Mail size={16} />
                    {loadingMail[pedido.id] ? 'Enviando Correo...' : 'Mandar Correo: Listo para Recojer'}
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={pedido.estado || 'Pendiente'}
                      onChange={(e) => handleCambiarEstado(pedido.id, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Listo para Recoger">Listo para Recoger</option>
                      <option value="Entregado">Entregado</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PedidosList;
