import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, getPendingSales } from '../../utils/metrics';

const HistorialVentas = () => {
  const { ventas = [], pacientes = [], actualizarPagoVenta } = useDatabase();
  
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  const [ventaExpandida, setVentaExpandida] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  const ventasFiltradas = useMemo(() => {
    return (ventas || []).filter((venta) => {
      const matchesEstado = filtroEstado === 'Todos' || String(venta.estadoPago || '').toLowerCase() === filtroEstado.toLowerCase();
      if (!matchesEstado) return false;

      if (!fechaInicio && !fechaFin) return true;
      
      const ventaDate = new Date(venta.fecha);
      const start = fechaInicio ? new Date(fechaInicio) : new Date(0);
      const end = fechaFin ? new Date(fechaFin) : new Date();
      end.setHours(23, 59, 59, 999);
      
      return ventaDate >= start && ventaDate <= end;
    });
  }, [ventas, fechaInicio, fechaFin, filtroEstado]);

  const ventasPendientes = useMemo(() => getPendingSales(ventas), [ventas]);
  const totalPendiente = useMemo(() => ventasPendientes.reduce((sum, venta) => sum + Number(venta.saldoPendiente || 0), 0), [ventasPendientes]);
  const totalIngresos = useMemo(() => ventas.reduce((sum, venta) => sum + Number(venta.total || 0), 0), [ventas]);

  const handleAbonar = (venta) => {
    const abono = parseFloat(montoAbono);
    if (!abono || abono <= 0) return;
    if (abono > venta.saldoPendiente) {
      alert('El abono no puede ser mayor al saldo pendiente.');
      return;
    }
    actualizarPagoVenta(venta.id, abono);
    setMontoAbono('');
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
      
      <div className="filter-container">
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
        <button onClick={() => { setFechaInicio(''); setFechaFin(''); setFiltroEstado('Todos'); }} style={{ padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Limpiar Filtros</button>
      </div>

      <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '1rem' }}>Folio</th>
              <th style={{ padding: '1rem' }}>Fecha</th>
              <th style={{ padding: '1rem' }}>Cliente</th>
              <th style={{ padding: '1rem' }}>Estado</th>
              <th style={{ padding: '1rem' }}>Total</th>
              <th style={{ padding: '1rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas.map(venta => {
              const cliente = venta?.pacienteId ? (pacientes.find(p => p.id === venta.pacienteId)?.nombre || 'Cliente sin registro') : 'Venta de Mostrador';
              const isExpanded = ventaExpandida === venta.id;
              
              return (
                <React.Fragment key={venta.id}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid #e2e8f0', backgroundColor: isExpanded ? '#f8fafc' : 'white' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b' }}>#{venta.id}</td>
                    <td style={{ padding: '1rem' }}>{venta?.fecha ? new Date(venta.fecha).toLocaleString() : 'Sin fecha'}</td>
                    <td style={{ padding: '1rem' }}>{cliente}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.85rem', 
                        fontWeight: 'bold',
                        backgroundColor: venta.estadoPago === 'Pagado' ? '#dcfce7' : '#fef08a',
                        color: venta.estadoPago === 'Pagado' ? '#166534' : '#854d0e'
                      }}>
                        {venta.estadoPago || 'Pagado'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#16a34a' }}>${Number(venta.total || 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      <button onClick={() => setVentaExpandida(isExpanded ? null : venta.id)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        {isExpanded ? 'Ocultar Recibo' : 'Ver Recibo'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                      <td colSpan="6" style={{ padding: '1.5rem', paddingTop: '0' }}>
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                          <div style={{ flex: 1, minWidth: '250px' }}>
                            <h4 style={{ marginTop: 0, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Detalle de Artículos</h4>
                            {(() => {
                              const prodsArr = typeof venta.productos === 'string' ? JSON.parse(venta.productos) : (venta.productos || []);
                              return prodsArr.length > 0 ? (
                                prodsArr.map((p, idx) => (
                                  <div key={p.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                    <span>{(p.cantidadVenta || p.cantidad || 1)}x {p.marca || 'Producto'} {p.modelo || ''}</span>
                                    <span>${((Number(p.precio) || 0) * (Number(p.cantidadVenta || p.cantidad || 1))).toFixed(2)}</span>
                                  </div>
                                ))
                              ) : <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Sin artículos de inventario</div>;
                            })()}
                            
                            <h4 style={{ color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '1rem' }}>Detalles Extras (Lentes)</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                              <span>Tratamiento de Lentes:</span>
                              <span>${Number(venta.detallesLentes?.tratamiento || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                              <span>Materiales:</span>
                              <span>${Number(venta.detallesLentes?.materiales || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                              <span>Armazón Extra:</span>
                              <span>${Number(venta.detallesLentes?.armazonExtra || 0).toFixed(2)}</span>
                            </div>

                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                              <h4 style={{ color: '#334155', marginBottom: '0.5rem' }}>Datos de Consulta</h4>
                              <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.75rem' }}>
                                {venta.consulta ? venta.consulta : 'No se registró información de consulta.'}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                <span>Lentes Terminados:</span>
                                <span>{venta.lentesTerminados ? 'Sí' : 'No'}</span>
                              </div>
                              {!venta.lentesTerminados && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#b91c1c' }}>
                                  <span>Motivo No Terminados:</span>
                                  <span>{venta.motivoNoTerminado || 'No especificado'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ flex: 1, minWidth: '250px', backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px' }}>
                            <h4 style={{ marginTop: 0, color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>Resumen de Pago</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginBottom: '0.5rem' }}>
                              <strong>Total Venta:</strong>
                              <strong>${Number(venta.total || 0).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#166534', marginBottom: '0.5rem' }}>
                              <span>Total Abonado (Adelantos):</span>
                              <span>${Number(venta.adelanto ?? venta.total ?? 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', color: '#ef4444', fontWeight: 'bold' }}>
                              <span>Saldo Pendiente:</span>
                              <span>${Number(venta.saldoPendiente ?? 0).toFixed(2)}</span>
                            </div>

                            {venta.estadoPago === 'Pendiente' && (
                              <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Registrar Nuevo Abono</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    max={Number(venta.saldoPendiente || 0)}
                                    value={montoAbono} 
                                    onChange={e => setMontoAbono(e.target.value)} 
                                    placeholder={`Max: $${Number(venta.saldoPendiente || 0).toFixed(2)}`}
                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                  />
                                  <button onClick={() => handleAbonar(venta)} style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Abonar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {ventasFiltradas.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No se encontraron ventas en este periodo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistorialVentas;
