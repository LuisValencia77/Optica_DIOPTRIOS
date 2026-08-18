import React, { useState } from 'react';
import { X, CreditCard } from 'lucide-react';

/**
 * Modal reutilizable de Mercado Pago Terminal Virtual.
 * Props:
 *  - monto: number (monto a cobrar)
 *  - onSuccess: (ordenData) => void (cuando el pago es exitoso)
 *  - onCancel: () => void
 *  - crearOrdenMercadoPago: fn
 *  - simularEventoMercadoPago: fn
 *  - obtenerOrdenMercadoPago: fn
 *  - descripcion: string (opcional)
 */
const ModalMercadoPago = ({ monto, onSuccess, onCancel, crearOrdenMercadoPago, simularEventoMercadoPago, obtenerOrdenMercadoPago, descripcion }) => {
  const [ordenActual, setOrdenActual] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [statusInfo, setStatusInfo] = useState('Terminal Virtual lista. Haz clic en "Crear Orden" para iniciar.');
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const handleCrearOrden = async () => {
    try {
      setCargando(true);
      setStatusInfo(`Creando orden por $${monto}...`);
      const extRef = `OPTICA-${Date.now()}`;
      const data = await crearOrdenMercadoPago({ external_reference: extRef, description: descripcion || `Pago Óptica ($${monto} MXN)`, total_amount: monto });
      setOrdenActual(data);
      setStatusInfo(`Orden creada. ID: ${data.id || data.external_reference}`);
      addLog(` Orden Creada ($${monto} MXN): ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setStatusInfo(` Error: ${err.message}`);
      addLog(` Error Orden: ${err.message}`);
    } finally { setCargando(false); }
  };

  const handleSimularEvento = async (status, statusDetail) => {
    if (!ordenActual?.id) return alert('Crea la orden primero');
    try {
      setCargando(true);
      const payload = status === 'processed' 
        ? { order_id: ordenActual.id, status: 'processed', payment_method_type: 'credit_card', installments: 1, payment_method_id: 'visa', status_detail: 'accredited' }
        : { order_id: ordenActual.id, status, status_detail: statusDetail || status };
      const data = await simularEventoMercadoPago(payload);
      
      const labels = { processed: ' Pago Acreditado', failed: ' Pago Rechazado', refunded: ' Reembolsado', canceled: ' Cancelado', expired: ' Expirado', action_required: ' Acción Requerida' };
      setStatusInfo(labels[status] || status);
      addLog(`${labels[status] || status}: ${JSON.stringify(data, null, 2)}`);

      // Auto-consultar estado
      try {
        const orderData = await obtenerOrdenMercadoPago(ordenActual.id);
        setOrdenActual(prev => ({ ...prev, ...orderData }));
      } catch (_) {}
      
      if (status === 'processed') {
        setStatusInfo(' Pago exitoso — puedes confirmar la venta');
      }
    } catch (err) {
      setStatusInfo(` Error: ${err.message}`);
      addLog(` Error: ${err.message}`);
    } finally { setCargando(false); }
  };

  const handleConfirmar = () => {
    const est = (ordenActual?.status || ordenActual?.data?.status || '').toLowerCase();
    if (['canceled', 'refunded'].includes(est)) return alert(` La orden está ${est.toUpperCase()}.`);
    if (est === 'expired') return alert(' La orden expiró. Crea una nueva.');
    if (est === 'action_required') return alert(' Esperando acción del cliente.');
    if (!ordenActual?.id && !window.confirm('️ No hay orden MP creada. ¿Confirmar de todas formas?')) return;
    onSuccess(ordenActual);
  };

  const estatus = (ordenActual?.status || ordenActual?.data?.status || 'SIN_ORDEN').toUpperCase();
  const esProcesado = estatus === 'PROCESSED';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#009ee3', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'white', padding: '0.4rem 0.6rem', borderRadius: '8px', fontWeight: 'bold', color: '#009ee3', fontSize: '0.9rem' }}>Mercado Pago</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Terminal Virtual</h3>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>Integración Presencial (v1/orders)</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}><X size={24} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Estado de la Orden */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
              <span>Monto a cobrar:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#009ee3' }}>$ {Number(monto).toLocaleString()} MXN</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              <strong>ID Orden:</strong> {ordenActual?.id || 'Pendiente'} &nbsp;
              <strong>Estatus:</strong>{' '}
              <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: esProcesado ? '#dcfce7' : '#fef3c7', color: esProcesado ? '#166534' : '#92400e', fontWeight: 'bold', fontSize: '0.8rem' }}>{estatus}</span>
            </div>
            {statusInfo && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#1e293b', fontWeight: 'bold', backgroundColor: '#e0f2fe', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '4px solid #0284c7' }}>{statusInfo}</div>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
            <button onClick={handleCrearOrden} disabled={cargando} style={{ backgroundColor: '#009ee3', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1 }}>1. Crear Orden</button>
            <button onClick={() => handleSimularEvento('processed')} disabled={cargando || !ordenActual?.id} style={{ backgroundColor: ordenActual?.id ? '#10b981' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!ordenActual?.id || cargando) ? 'not-allowed' : 'pointer' }}>2a. Éxito</button>
            <button onClick={() => handleSimularEvento('failed', 'insufficient_amount')} disabled={cargando || !ordenActual?.id} style={{ backgroundColor: ordenActual?.id ? '#ef4444' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!ordenActual?.id || cargando) ? 'not-allowed' : 'pointer' }}>2b. Falla</button>
            <button onClick={() => handleSimularEvento('refunded')} disabled={cargando || !ordenActual?.id} style={{ backgroundColor: ordenActual?.id ? '#f59e0b' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!ordenActual?.id || cargando) ? 'not-allowed' : 'pointer' }}>2c. Reembolso</button>
            <button onClick={() => handleSimularEvento('canceled')} disabled={cargando || !ordenActual?.id} style={{ backgroundColor: ordenActual?.id ? '#64748b' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!ordenActual?.id || cargando) ? 'not-allowed' : 'pointer' }}>2d. Cancelar</button>
            <button onClick={() => handleSimularEvento('expired')} disabled={cargando || !ordenActual?.id} style={{ backgroundColor: ordenActual?.id ? '#ea580c' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!ordenActual?.id || cargando) ? 'not-allowed' : 'pointer' }}>2e. Expirar</button>
            <button onClick={() => handleSimularEvento('action_required')} disabled={cargando || !ordenActual?.id} style={{ backgroundColor: ordenActual?.id ? '#0284c7' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!ordenActual?.id || cargando) ? 'not-allowed' : 'pointer' }}>2f. Acción Req.</button>
            <button onClick={async () => { if (!ordenActual?.id) return; try { const d = await obtenerOrdenMercadoPago(ordenActual.id); setOrdenActual(prev => ({...prev, ...d})); addLog(` Estado: ${JSON.stringify(d, null, 2)}`); } catch(e) { addLog(` ${e.message}`); } }} disabled={cargando || !ordenActual?.id} style={{ backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!ordenActual?.id || cargando) ? 'not-allowed' : 'pointer' }}>3. Consultar</button>
          </div>

          {/* Logs */}
          <div>
            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', color: '#64748b' }}>Log API:</h4>
            <div style={{ backgroundColor: '#0f172a', color: '#38bdf8', padding: '0.75rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: '140px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {logs.length === 0 ? '// Presiona "Crear Orden" para iniciar' : logs.join('\n\n')}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onCancel} style={{ backgroundColor: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleConfirmar} style={{ backgroundColor: '#16a34a', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} /> Confirmar Venta y Generar Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMercadoPago;
