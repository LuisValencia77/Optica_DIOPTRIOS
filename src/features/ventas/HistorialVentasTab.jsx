import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, getPendingSales } from '../../utils/metrics';
import { Search, Filter, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HistorialVentas = () => {
  const { 
    ventas = [], pacientes = [], cambiarEstadoVenta, simularEventoMercadoPago
  } = useDatabase();
  const navigate = useNavigate();
  
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  const [ventaExpandida, setVentaExpandida] = useState(null);

  const ventasFiltradas = useMemo(() => {
    return (ventas || []).filter((venta) => {
      const pacienteMatches = pacientes.find(p => String(p.id) === String(venta.pacienteId));
      const clienteNombre = pacienteMatches ? `${pacienteMatches.nombre} ${pacienteMatches.apellidos || ''}`.toLowerCase() : 'venta de mostrador';
      
      const searchStr = busqueda.toLowerCase().trim();
      const matchesSearch = !searchStr || String(venta.id).includes(searchStr) || clienteNombre.includes(searchStr);
      if (!matchesSearch) return false;

      const matchesEstado = filtroEstado === 'Todos' || String(venta.estadoPago || '').toLowerCase() === filtroEstado.toLowerCase();
      if (!matchesEstado) return false;

      if (!fechaInicio && !fechaFin) return true;
      
      const ventaDate = new Date(venta.fecha);
      const start = fechaInicio ? new Date(fechaInicio) : new Date(0);
      const end = fechaFin ? new Date(fechaFin) : new Date();
      end.setHours(23, 59, 59, 999);
      
      return ventaDate >= start && ventaDate <= end;
    });
  }, [ventas, busqueda, fechaInicio, fechaFin, filtroEstado, pacientes]);

  const ventasPendientes = useMemo(() => getPendingSales(ventas), [ventas]);
  const totalPendiente = useMemo(() => ventasPendientes.reduce((sum, venta) => sum + Number(venta.saldoPendiente || 0), 0), [ventasPendientes]);
  const totalIngresos = useMemo(() => ventas.reduce((sum, venta) => sum + Number(venta.total || 0), 0), [ventas]);

  const handleReembolsarVenta = async (venta) => {
    if (!window.confirm(`¿Estás seguro de solicitar el reembolso completo para la venta #${venta.id} en Mercado Pago?`)) {
      return;
    }
    const orderIdMp = venta.detallesLentes?.mercadoPago?.id;
    if (orderIdMp) {
      try {
        await simularEventoMercadoPago({ order_id: orderIdMp, status: 'refunded' });
      } catch (e) {
        console.warn('Simulación reembolso MP:', e.message);
      }
    }
    await cambiarEstadoVenta(venta.id, 'Reembolsado');
    alert(` Venta #${venta.id} marcada como Reembolsada correctamente.`);
  };

  const handleAbonarPuntoVenta = (venta) => {
    navigate('/ventas/nueva', { state: { ventaAbonoId: venta.id, pacienteId: venta.pacienteId } });
  };

  return (
    <div>
      <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>Historial de Ventas y Recibos</h2>

      <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#eff6ff', borderRadius: '10px', padding: '1rem', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '0.85rem', color: '#1d4ed8' }}>Ventas registradas</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e3a8a' }}>{ventas.length}</div>
        </div>
        <div style={{ backgroundColor: '#ecfdf5', borderRadius: '10px', padding: '1rem', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '0.85rem', color: '#047857' }}>Ingresos totales</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#065f46' }}>{formatCurrency(totalIngresos)}</div>
        </div>
        <div style={{ backgroundColor: '#fff7ed', borderRadius: '10px', padding: '1rem', border: '1px solid #fdba74' }}>
          <div style={{ fontSize: '0.85rem', color: '#c2410c' }}>Saldo pendiente</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#9a2c00' }}>{formatCurrency(totalPendiente)}</div>
        </div>
      </div>
      
      {/* Search and Filters Section */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre de cliente o folio..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
          />
        </div>
        <button 
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          style={{ padding: '0.75rem 1.25rem', backgroundColor: mostrarFiltros ? '#e2e8f0' : 'white', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}
        >
          <Filter size={18} /> Filtros {mostrarFiltros ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {mostrarFiltros && (
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Fecha Inicio</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Fecha Fin</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Estado</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <option value="Todos">Todos</option>
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={() => { setFechaInicio(''); setFechaFin(''); setFiltroEstado('Todos'); }} style={{ padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Limpiar Filtros</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '1rem' }}>Folio</th>
              <th style={{ padding: '1rem' }}>Fecha</th>
              <th style={{ padding: '1rem' }}>Cliente</th>
              <th style={{ padding: '1rem' }}>Saldo Pagado</th>
              <th style={{ padding: '1rem' }}>Saldo Pendiente</th>
              <th style={{ padding: '1rem' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas.map(venta => {
              const pacienteMatches = pacientes.find(p => String(p.id) === String(venta.pacienteId));
              const cliente = venta?.pacienteId ? (pacienteMatches ? `${pacienteMatches.nombre} ${pacienteMatches.apellidos || ''}`.trim() : 'Cliente sin registro') : 'Venta de Mostrador';
              const isExpanded = ventaExpandida === venta.id;
              
              let rowColor = 'white';
              if (venta.estadoPago === 'Pagado') rowColor = '#dcfce7'; // Verde tenue
              else if (venta.estadoPago === 'Pendiente') rowColor = '#fef08a'; // Amarillo tenue
              
              return (
                <React.Fragment key={venta.id}>
                  <tr 
                    onClick={() => setVentaExpandida(isExpanded ? null : venta.id)}
                    style={{ 
                      borderBottom: isExpanded ? 'none' : '1px solid #e2e8f0', 
                      backgroundColor: isExpanded ? '#f8fafc' : rowColor,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    className="hover-row"
                  >
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b' }}>#{venta.id}</td>
                    <td style={{ padding: '1rem' }}>{venta?.fecha ? new Date(venta.fecha).toLocaleString() : 'Sin fecha'}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{cliente}</td>
                    <td style={{ padding: '1rem', color: '#166534' }}>${Number(venta.adelanto ?? venta.total ?? 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem', color: '#ef4444' }}>${Number(venta.saldoPendiente ?? 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#0f172a' }}>${Number(venta.total || 0).toFixed(2)}</td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                      <td colSpan="6" style={{ padding: '1.5rem', paddingTop: '0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                          {(() => {
                            const prodsArr = typeof venta.productos === 'string' ? JSON.parse(venta.productos) : (venta.productos || []);
                            const tieneMicas = prodsArr.some(p => p.isMica);
                            
                            return (
                              <>
                                {/* Superior Izquierda: Detalle de Artículos */}
                                <div>
                                  <h4 style={{ marginTop: 0, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Detalle de Artículos</h4>
                                  {prodsArr.length > 0 ? (
                                    prodsArr.map((p, idx) => (
                                      <div key={p.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                        <span>{(p.cantidadVenta || p.cantidad || 1)}x {p.isMica ? `Micas ${p.nombre || ''}` : (p.nombre || p.marca || 'Producto')} {p.modelo || ''}</span>
                                        <span>${((Number(p.precio_unitario || p.precioBase || p.precio || 0)) * (Number(p.cantidadVenta || p.cantidad || 1))).toFixed(2)}</span>
                                      </div>
                                    ))
                                  ) : <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Sin artículos de inventario</div>}
                                </div>

                                {/* Superior Derecha: Detalles Extras (Lentes) */}
                                <div>
                                  {tieneMicas && (
                                    <>
                                      <h4 style={{ marginTop: 0, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Detalles Extras (Lentes)</h4>
                                      
                                      {prodsArr.filter(p => p.isMica).map((p, idx) => (
                                        <div key={`mica-info-${idx}`} style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px dashed #e2e8f0' }}>
                                          {p.nombre && <div style={{ fontSize: '0.9rem', color: '#475569' }}><strong>Material:</strong> {p.nombre}</div>}
                                          {p.tratamiento?.nombre && <div style={{ fontSize: '0.9rem', color: '#475569' }}><strong>Protección:</strong> {p.tratamiento.nombre}</div>}
                                        </div>
                                      ))}

                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                        <span>Costos Extras de Tratamiento:</span>
                                        <span>${Number(venta.detallesLentes?.tratamiento || 0).toFixed(2)}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                        <span>Costos Extras de Materiales:</span>
                                        <span>${Number(venta.detallesLentes?.materiales || 0).toFixed(2)}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                        <span>Costos de Armazón Extra:</span>
                                        <span>${Number(venta.detallesLentes?.armazonExtra || 0).toFixed(2)}</span>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Inferior Izquierda: Observaciones y Estatus */}
                                <div>
                                  <h4 style={{ marginTop: 0, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Observaciones y Estatus</h4>
                                  
                                  <div style={{ fontSize: '0.9rem', color: venta.consulta ? '#475569' : '#94a3b8', whiteSpace: 'pre-wrap', marginBottom: '1.5rem', fontStyle: venta.consulta ? 'normal' : 'italic' }}>
                                    {venta.consulta || 'Sin observaciones de pedido.'}
                                  </div>

                                  {(() => {
                                    const ESTADOS_PEDIDO = ['Ordenado', 'Enviado', 'En laboratorio', 'Listo', 'Entregado'];
                                    const COLORS = ['#ef4444', '#f97316', '#eab308', '#0ea5e9', '#22c55e'];
                                    const estadoActual = venta.estado_pedido || 'Ordenado';
                                    const currentIndex = ESTADOS_PEDIDO.indexOf(estadoActual);

                                    return (
                                      <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Estatus: <span style={{ fontWeight: 'normal' }}>{estadoActual}</span></div>
                                        <div style={{ display: 'flex', width: '100%', height: '12px' }}>
                                          {ESTADOS_PEDIDO.map((est, idx) => {
                                            const isPassed = idx <= Math.max(0, currentIndex);
                                            return (
                                              <div 
                                                key={est} 
                                                style={{ 
                                                  flex: 1, 
                                                  backgroundColor: isPassed ? COLORS[idx] : '#e2e8f0',
                                                  borderRight: idx < ESTADOS_PEDIDO.length - 1 ? '2px solid white' : 'none'
                                                }} 
                                                title={est}
                                              />
                                            );
                                          })}
                                        </div>
                                        <div style={{ display: 'flex', width: '100%', marginTop: '0.5rem' }}>
                                          {ESTADOS_PEDIDO.map((est, idx) => (
                                            <div key={est} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: idx <= currentIndex ? '#334155' : '#94a3b8', fontWeight: idx === currentIndex ? 'bold' : 'normal', textTransform: 'capitalize' }}>
                                              {est}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Inferior Derecha: Acciones y Resumen */}
                                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', alignSelf: 'start' }}>
                                  <h4 style={{ marginTop: 0, color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>Acciones y Resumen</h4>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginBottom: '1rem' }}>
                                    <strong>Estado de Pago:</strong>
                                    <span style={{ color: venta.estadoPago === 'Pagado' ? '#166534' : '#b45309', fontWeight: 'bold' }}>{venta.estadoPago}</span>
                                  </div>

                                  {venta.estadoPago === 'Pendiente' && (
                                    <button
                                      onClick={() => handleAbonarPuntoVenta(venta)}
                                      style={{ width: '100%', padding: '0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}
                                    >
                                      <CreditCard size={16} /> Abonar
                                    </button>
                                  )}

                                  {venta.estadoPago !== 'Reembolsado' && (
                                    <button
                                      onClick={() => handleReembolsarVenta(venta)}
                                      style={{ width: '100%', padding: '0.4rem', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                                    >
                                      Solicitar Reembolso
                                    </button>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {ventasFiltradas.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No se encontraron ventas con los filtros actuales.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistorialVentas;
