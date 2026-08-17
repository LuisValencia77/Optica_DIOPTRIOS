import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, getPendingSales } from '../../utils/metrics';
import { CreditCard, CheckCircle, X } from 'lucide-react';

const HistorialVentas = () => {
  const { 
    ventas = [], pacientes = [], actualizarPagoVenta, cambiarEstadoVenta,
    crearOrdenMercadoPago, simularEventoMercadoPago, obtenerOrdenMercadoPago
  } = useDatabase();
  
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  const [ventaExpandida, setVentaExpandida] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  // --- Estados Modal Mercado Pago Abono ---
  const [modalMpAbono, setModalMpAbono] = useState(false);
  const [ventaAbonoActual, setVentaAbonoActual] = useState(null);
  const [montoAbonoMp, setMontoAbonoMp] = useState(0);
  const [mpOrdenActual, setMpOrdenActual] = useState(null);
  const [mpCargando, setMpCargando] = useState(false);
  const [mpStatusInfo, setMpStatusInfo] = useState('');
  const [mpLogs, setMpLogs] = useState([]);

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

  // --- Handlers Mercado Pago para Abonos ---
  const handleIniciarAbonoMP = (venta) => {
    const abono = parseFloat(montoAbono);
    if (!abono || abono <= 0) return alert('Ingresa un monto de abono válido.');
    if (abono > Number(venta.saldoPendiente || 0)) {
      return alert('El abono no puede superar el saldo pendiente.');
    }
    setVentaAbonoActual(venta);
    setMontoAbonoMp(abono);
    setModalMpAbono(true);
    setMpOrdenActual(null);
    setMpLogs([]);
    setMpStatusInfo('Terminal Virtual Lista para cobrar el abono.');
  };

  const handleCrearOrdenAbonoMP = async () => {
    try {
      setMpCargando(true);
      setMpStatusInfo(`Creando orden de abono en Mercado Pago por $${montoAbonoMp}...`);
      const extRef = `ABONO-${ventaAbonoActual.id}-${Date.now()}`;
      const data = await crearOrdenMercadoPago({
        external_reference: extRef,
        description: `Abono Venta #${ventaAbonoActual.id} ($${montoAbonoMp} MXN)`,
        total_amount: montoAbonoMp
      });
      setMpOrdenActual(data);
      setMpStatusInfo(`Orden de abono creada por $${montoAbonoMp} MXN. ID: ${data.id || extRef}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ✅ Orden Abono Creada: ${JSON.stringify(data, null, 2)}`, ...prev]);
    } catch (err) {
      setMpStatusInfo(`❌ Error creando orden de abono: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error: ${err.message}`, ...prev]);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularEventoAbonoMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden de abono primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando cobro de abono en Terminal Virtual...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'processed',
        payment_method_type: 'credit_card',
        installments: 1,
        payment_method_id: 'visa',
        status_detail: 'accredited'
      });
      setMpStatusInfo('✅ Abono Acreditado exitosamente en Mercado Pago');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 💳 Abono Simulado: ${JSON.stringify(data, null, 2)}`, ...prev]);
      
      await handleObtenerOrdenAbonoMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando abono: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error: ${err.message}`, ...prev]);
    } finally {
      setMpCargando(false);
    }
  };

  const handleObtenerOrdenAbonoMP = async (targetId) => {
    const idOrder = targetId || mpOrdenActual?.id;
    if (!idOrder) return;
    try {
      setMpCargando(true);
      const data = await obtenerOrdenMercadoPago(idOrder);
      setMpOrdenActual(data);
      const est = data.status || data.data?.status || 'PROCESSED';
      setMpStatusInfo(`Estatus de la orden: ${est.toUpperCase()}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 🔍 Estatus Orden Abono: ${JSON.stringify(data, null, 2)}`, ...prev]);
    } catch (err) {
      setMpStatusInfo(`❌ Error consultando orden: ${err.message}`);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularFallaAbonoMP = async (detail = 'insufficient_amount') => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden de abono primero');
    try {
      setMpCargando(true);
      setMpStatusInfo(`Simulando FALLA DE PAGO DE ABONO (${detail})...`);
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'failed',
        payment_method_type: 'credit_card',
        installments: 1,
        payment_method_id: 'visa',
        status_detail: detail
      });
      setMpStatusInfo(`❌ RECHAZO DE ABONO: Estado ${data.status || 'failed'} (${detail})`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Falla Abono Simulada (${detail}): ${JSON.stringify(data, null, 2)}`, ...prev]);
      
      await handleObtenerOrdenAbonoMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando falla: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error Falla: ${err.message}`, ...prev]);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularReembolsoAbonoMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden de abono primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando REEMBOLSO DE ABONO en Mercado Pago...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'refunded'
      });
      setMpStatusInfo('🔄 SIMULACIÓN DE REEMBOLSO DE ABONO: Estado REFUNDED');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 🔄 Reembolso Simulado: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenAbonoMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando reembolso: ${err.message}`);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularCancelacionAbonoMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden de abono primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando CANCELACIÓN DE ABONO en Mercado Pago...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'canceled'
      });
      setMpStatusInfo('🚫 SIMULACIÓN DE CANCELACIÓN DE ABONO: Estado CANCELED');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 🚫 Cancelación Simulada: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenAbonoMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando cancelación: ${err.message}`);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularExpiracionAbonoMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden de abono primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando EXPIRACIÓN DE ABONO en Mercado Pago...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'expired'
      });
      setMpStatusInfo('⏳ SIMULACIÓN DE EXPIRACIÓN: Estado EXPIRED');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ⏳ Expiración Simulada: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenAbonoMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando expiración: ${err.message}`);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularAccionRequeridaAbonoMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden de abono primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando ACCIÓN REQUERIDA EN ABONO...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'action_required'
      });
      setMpStatusInfo('📱 SIMULACIÓN DE ACCIÓN REQUERIDA: Estado ACTION_REQUIRED');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 📱 Acción Requerida Simulada: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenAbonoMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando acción requerida: ${err.message}`);
    } finally {
      setMpCargando(false);
    }
  };

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
    alert(`✅ Venta #${venta.id} marcada como Reembolsada correctamente.`);
  };

  const handleConfirmarAbonoEnSistema = async () => {
    const est = (mpOrdenActual?.status || mpOrdenActual?.data?.status || '').toLowerCase();
    if (est === 'failed' || est === 'rejected') {
      return alert('❌ No se puede aplicar el abono porque el cobro con Mercado Pago fue RECHAZADO / FALLIDO.');
    }
    if (est === 'canceled' || est === 'refunded') {
      return alert(`❌ No se puede aplicar el abono porque la orden está ${est.toUpperCase()} (Cancelada/Reembolsada).`);
    }
    if (est === 'expired') {
      return alert('⏳ No se puede aplicar el abono porque la orden EXPIRÓ.');
    }
    if (est === 'action_required') {
      return alert('📱 No se puede aplicar el abono aún. Se requiere acción en la terminal.');
    }
    if (!mpOrdenActual?.id) {
      if (!window.confirm('⚠️ Aún no has creado la orden de abono en Mercado Pago. ¿Deseas aplicar el abono de todas formas?')) {
        return;
      }
    }
    if (ventaAbonoActual && montoAbonoMp > 0) {
      await actualizarPagoVenta(ventaAbonoActual.id, montoAbonoMp);
      alert(`✅ Abono de $${montoAbonoMp} MXN registrado correctamente en la venta #${ventaAbonoActual.id}.`);
      setModalMpAbono(false);
      setMontoAbono('');
      setVentaAbonoActual(null);
    }
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
              const pacienteMatches = pacientes.find(p => String(p.id) === String(venta.pacienteId));
              const cliente = venta?.pacienteId ? (pacienteMatches ? `${pacienteMatches.nombre} ${pacienteMatches.apellidos || ''}`.trim() : 'Cliente sin registro') : 'Venta de Mostrador';
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
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Registrar Nuevo Abono</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    max={Number(venta.saldoPendiente || 0)}
                                    value={montoAbono} 
                                    onChange={e => setMontoAbono(e.target.value)} 
                                    placeholder={`Max: $${Number(venta.saldoPendiente || 0).toFixed(2)}`}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                      onClick={() => handleAbonar(venta)} 
                                      style={{ flex: 1, padding: '0.5rem 0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem' }}
                                    >
                                      Abonar (Efectivo)
                                    </button>
                                    <button 
                                      onClick={() => handleIniciarAbonoMP(venta)} 
                                      style={{ flex: 1, padding: '0.5rem 0.75rem', backgroundColor: '#009ee3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                                    >
                                      <CreditCard size={15} /> Mercado Pago
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {venta.estadoPago !== 'Reembolsado' && (
                              <div style={{ marginTop: '1.25rem', borderTop: '1px solid #cbd5e1', paddingTop: '0.75rem' }}>
                                <button
                                  onClick={() => handleReembolsarVenta(venta)}
                                  style={{ width: '100%', padding: '0.5rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                                >
                                  <CreditCard size={15} /> Solicitar Reembolso (Mercado Pago)
                                </button>
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
      {modalMpAbono && ventaAbonoActual && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Header Modal MP Abono */}
            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#009ee3', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'white', padding: '0.4rem 0.6rem', borderRadius: '8px', fontWeight: 'bold', color: '#009ee3', fontSize: '0.9rem' }}>
                  Mercado Pago
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'white' }}>Cobro de Abono a Venta #{ventaAbonoActual.id}</h3>
                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>Terminal Virtual & Simulación de Pago Presencial</p>
                </div>
              </div>
              <button onClick={() => setModalMpAbono(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}><X size={24} /></button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Desglose de Abono y Saldo */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  <span>Total Venta Original:</span>
                  <span>$ {Number(ventaAbonoActual.total || 0).toLocaleString()} MXN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#166534', marginBottom: '0.25rem' }}>
                  <span>Abonos Previos Registrados:</span>
                  <span>$ {Number(ventaAbonoActual.adelanto || 0).toLocaleString()} MXN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  <span>Saldo Pendiente Actual:</span>
                  <span>$ {Number(ventaAbonoActual.saldoPendiente || 0).toLocaleString()} MXN</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#0369a1' }}>Monto de Abono a cobrar con Mercado Pago:</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#009ee3' }}>$ {Number(montoAbonoMp).toLocaleString()} MXN</span>
                </div>

                <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#334155' }}>
                  <strong>ID Orden MP:</strong> {mpOrdenActual?.id || mpOrdenActual?.external_reference || 'Pendiente de crear'}<br/>
                  <strong>Estatus actual:</strong> <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: (mpOrdenActual?.status === 'processed' || mpOrdenActual?.data?.status === 'processed') ? '#dcfce7' : '#fef3c7', color: (mpOrdenActual?.status === 'processed' || mpOrdenActual?.data?.status === 'processed') ? '#166534' : '#92400e', fontWeight: 'bold', fontSize: '0.8rem' }}>{(mpOrdenActual?.status || mpOrdenActual?.data?.status || 'SIN_ORDEN').toUpperCase()}</span>
                </div>

                {mpStatusInfo && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#1e293b', fontWeight: 'bold', backgroundColor: '#e0f2fe', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '4px solid #0284c7' }}>
                    {mpStatusInfo}
                  </div>
                )}
              </div>

              {/* Botones de Acción Mercado Pago */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                <button
                  onClick={handleCrearOrdenAbonoMP} disabled={mpCargando}
                  style={{ backgroundColor: '#009ee3', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: mpCargando ? 'not-allowed' : 'pointer', opacity: mpCargando ? 0.7 : 1 }}
                >
                  1. Crear Orden
                </button>
                <button
                  onClick={handleSimularEventoAbonoMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#10b981' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2a. Éxito
                </button>
                <button
                  onClick={() => handleSimularFallaAbonoMP('insufficient_amount')} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#ef4444' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2b. Falla
                </button>
                <button
                  onClick={handleSimularReembolsoAbonoMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#f59e0b' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2c. Reembolso
                </button>
                <button
                  onClick={handleSimularCancelacionAbonoMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#64748b' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2d. Cancelar
                </button>
                <button
                  onClick={handleSimularExpiracionAbonoMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#ea580c' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2e. Expirar
                </button>
                <button
                  onClick={handleSimularAccionRequeridaAbonoMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#0284c7' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2f. Acción Req.
                </button>
                <button
                  onClick={() => handleObtenerOrdenAbonoMP()} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  3. Consultar Estado
                </button>
              </div>

              {/* Terminal Logs */}
              <div>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', color: '#64748b' }}>Log de Peticiones API Mercado Pago:</h4>
                <div style={{ backgroundColor: '#0f172a', color: '#38bdf8', padding: '0.75rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.78rem', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                  {mpLogs.length === 0 ? '// Presiona "Crear Orden Abono" para iniciar el cobro' : mpLogs.join('\n\n')}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setModalMpAbono(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={handleConfirmarAbonoEnSistema}
                style={{ backgroundColor: '#16a34a', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <CheckCircle size={18} /> Confirmar y Aplicar Abono en Óptica
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HistorialVentas;
