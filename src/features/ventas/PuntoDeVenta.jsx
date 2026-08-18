import React, { useState, useEffect, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { generarTicketVenta } from '../../utils/ticketGenerator';
import ModalMercadoPago from '../../components/shared/ModalMercadoPago';
import FormularioPaciente from '../../components/shared/FormularioPaciente';
import FormularioExamen from '../../components/shared/FormularioExamen';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, User, ClipboardList, ShoppingCart, X, CheckCircle, Image as ImageIcon, Plus, ScanFace, Banknote, CreditCard, Smartphone, Eye, Tag, FileText, ArrowLeft, ArrowRight } from 'lucide-react';

const PuntoDeVenta = () => {
  const { 
    productos, pacientes, examenes, ventas, registrarVenta, actualizarPagoVenta, enviarCorreoConfirmacionPedido, 
    tratamientos, agregarPaciente, agregarExamen, materiales,
    crearOrdenMercadoPago, simularEventoMercadoPago, obtenerOrdenMercadoPago 
  } = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();

  // --- Estados de Carrito y Venta ---
  const [carrito, setCarrito] = useState([]);
  const [pacienteId, setPacienteId] = useState('');
  const [examenSeleccionado, setExamenSeleccionado] = useState('');
  
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [precioExamen, setPrecioExamen] = useState(150);
  const [checkoutActivo, setCheckoutActivo] = useState(false);
  
  const [consulta, setConsulta] = useState('');
  const [lentesTerminados, setLentesTerminados] = useState(true);
  const [motivoNoTerminado, setMotivoNoTerminado] = useState('');

  // --- Estados Modales ---
  const [modalListaPacientes, setModalListaPacientes] = useState(false);
  const [modalRegistroPaciente, setModalRegistroPaciente] = useState(false);
  const [modalRegistroExamen, setModalRegistroExamen] = useState(false);

  // --- Estados Mercado Pago Terminal Virtual ---
  const [modalMercadoPago, setModalMercadoPago] = useState(false);
  const [mpOrdenActual, setMpOrdenActual] = useState(null);

  // --- Estado Modo Abono ---
  const [ventaAbonoOriginal, setVentaAbonoOriginal] = useState(null);
  const isModoAbono = !!ventaAbonoOriginal;
  
  const [busquedaLista, setBusquedaLista] = useState('');

  // --- Estados nuevos: búsqueda, descuento, observaciones ---
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [descuentoTipo, setDescuentoTipo] = useState('none'); // 'none', 'percent', 'fixed'
  const [descuentoValor, setDescuentoValor] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Formularios
  const [formPaciente, setFormPaciente] = useState({ nombre: '', apellidos: '', telefono: '', correo: '', direccion: '', fechaNacimiento: '' });
  
  const examInicial = { od: { esfera: '0.00', cilindro: '0.00', eje: '0' }, oi: { esfera: '0.00', cilindro: '0.00', eje: '0' }, adicion: '0.00', dp: '0.00', ap: '0.00' };
  const [formExamen, setFormExamen] = useState({...examInicial});

  // --- Estados Receta Adicional (Removidos) ---

  // --- NUEVA ESTRUCTURA CATÁLOGO ---
  const [categoriaTop, setCategoriaTop] = useState('Armazones');
  const [productoConstructor, setProductoConstructor] = useState(null);
  
  const [materialSeleccionado, setMaterialSeleccionado] = useState('');
  const [tratamientoSeleccionado, setTratamientoSeleccionado] = useState('');

  // Efectos y Memorizaciones
  useEffect(() => {
    if (location.state?.newPacienteId) {
      setPacienteId(location.state.newPacienteId.toString());
      window.history.replaceState({}, document.title);
    }
    if (location.state?.ventaAbonoId && ventas) {
      const venta = ventas.find(v => String(v.id) === String(location.state.ventaAbonoId));
      if (venta) {
        setVentaAbonoOriginal(venta);
        setPacienteId(String(venta.pacienteId || ''));
        const prods = typeof venta.productos === 'string' ? JSON.parse(venta.productos) : (venta.productos || []);
        setCarrito(prods);
        setCheckoutActivo(true);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location, ventas]);

  // Si cambia el paciente, limpiamos el examen seleccionado
  useEffect(() => {
    setExamenSeleccionado('');
  }, [pacienteId]);

  const examenesPaciente = useMemo(() => {
    if (!pacienteId) return [];
    return examenes
      .filter(ex => String(ex.pacienteId) === String(pacienteId))
      .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  }, [examenes, pacienteId]);

  const productosTop = useMemo(() => {
    let filtered = productos.filter(prod => {
      if (categoriaTop === 'Armazones' && prod.tipo_articulo === 'armazon') return true;
      if (categoriaTop === 'Lentes de Contacto' && prod.tipo_articulo === 'lente_contacto') return true;
      if (categoriaTop === 'Accesorios' && prod.tipo_articulo === 'accesorio') return true;
      return false;
    });
    if (busquedaProducto.trim()) {
      const term = busquedaProducto.toLowerCase();
      filtered = filtered.filter(p => 
        `${p.marca} ${p.modelo}`.toLowerCase().includes(term) ||
        String(p.precio_unitario).includes(term)
      );
    }
    if (categoriaTop === 'Armazones') {
      const armazonPropio = {
        id_producto: 'armazon_propio_cliente',
        marca: 'Cliente',
        modelo: 'Armazón Propio',
        precio_unitario: 0,
        tipo_articulo: 'armazon',
        ruta_imagen: null
      };
      
      if (!busquedaProducto.trim() || 'armazón propio cliente armazon'.includes(busquedaProducto.toLowerCase())) {
        filtered.unshift(armazonPropio);
      }
    }

    return filtered;
  }, [productos, categoriaTop, busquedaProducto]);

  const subtotalCarrito = carrito.reduce((sum, item) => sum + ((Number(item.precio) || 0) * (item.cantidadVenta || 1)), 0);
  const tienePaquete = carrito.some(i => i.isPaquete);
  const seCobraExamen = examenSeleccionado && !tienePaquete && !pacienteId;
  const costoExamenFinal = seCobraExamen ? (parseFloat(precioExamen) || 0) : 0;
  const subtotalGeneral = subtotalCarrito + costoExamenFinal;

  // Cálculo de descuento
  const descuentoMonto = useMemo(() => {
    const val = parseFloat(descuentoValor) || 0;
    if (descuentoTipo === 'percent') return Math.min(subtotalGeneral, (subtotalGeneral * val) / 100);
    if (descuentoTipo === 'fixed') return Math.min(subtotalGeneral, val);
    return 0;
  }, [descuentoTipo, descuentoValor, subtotalGeneral]);

  // --- Funciones Carrito ---
  const calcularPrecioConfig = () => {
    let total = 0;
    if (productoConstructor) total += Number(productoConstructor.precio_unitario) || 0;
    if (tratamientoSeleccionado) {
      const trat = tratamientos.find(t => String(t.id_tratamiento) === String(tratamientoSeleccionado));
      if (trat) total += Number(trat.costo_adicional) || 0;
    }
    return total;
  };

  const agregarLenteAlCarrito = () => {
    if (!productoConstructor) return;

    const tratamientoSel = tratamientoSeleccionado 
      ? tratamientos.find(t => String(t.id_tratamiento) === String(tratamientoSeleccionado))
      : null;

    const paquete = {
      id: Date.now(),
      isPaquete: true,
      principal: productoConstructor,
      material: materialSeleccionado ? materiales.find(m => String(m.id_material) === String(materialSeleccionado)) : null,
      tratamiento: tratamientoSel,
      cantidadVenta: 1,
      precio: calcularPrecioConfig()
    };
    
    setCarrito([...carrito, paquete]);
    setProductoConstructor(null);
    setMaterialSeleccionado('');
    setTratamientoSeleccionado('');
  };

  const quitarDelCarrito = (id) => setCarrito(prev => prev.filter(item => item.id !== id));

  const total = Math.max(0, subtotalGeneral - descuentoMonto);

  // --- Handlers Formularios ---
  const handleGuardarPaciente = async (nuevoPacienteData) => {
    if (!nuevoPacienteData.nombre || !nuevoPacienteData.apellidos) return alert('Nombre y apellidos requeridos');
    const newId = await agregarPaciente(nuevoPacienteData);
    if (newId) {
      setPacienteId(newId.toString());
      setModalRegistroPaciente(false);
      setFormPaciente({ nombre: '', apellidos: '', telefono: '', correo: '', direccion: '', fechaNacimiento: '' });
    }
  };

  const handleGuardarExamen = async (examenData) => {
    if (!pacienteId) return alert('Seleccione un paciente primero');
    
    const exObj = {
      ...examenData,
      pacienteId,
      fecha: new Date().toISOString().split('T')[0]
    };
    const newEx = await agregarExamen(exObj);
    if (newEx) {
      setExamenSeleccionado(newEx.id || '');
      setModalRegistroExamen(false);
      setFormExamen({ od: {...examInicial}, oi: {...examInicial}, dp: '' });
    }
  };

  // --- Handlers Mercado Pago ---
  const handleCrearOrdenMP = async () => {
    try {
      setMpCargando(true);
      const valAdelanto = parseFloat(efectivoRecibido) || total;
      setMpStatusInfo(`Creando orden en Mercado Pago por $${valAdelanto}...`);
      const extRef = `OPTICA-${Date.now()}`;
      const data = await crearOrdenMercadoPago({
        external_reference: extRef,
        description: `Pago Óptica Dioptrios ($${valAdelanto} MXN)`,
        total_amount: valAdelanto
      });
      setMpOrdenActual(data);
      setMpStatusInfo(`Orden creada por $${valAdelanto} MXN con ID: ${data.id || data.external_reference || 'OK'}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Orden Creada ($${valAdelanto} MXN): ${JSON.stringify(data, null, 2)}`, ...prev]);
    } catch (err) {
      setMpStatusInfo(` Error creando orden: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Error Orden: ${err.message}`, ...prev]);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularEventoMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden en Mercado Pago primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando cobro con tarjeta en Terminal Virtual (POST /v1/orders/events)...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'processed',
        payment_method_type: 'credit_card',
        installments: 1,
        payment_method_id: 'visa',
        status_detail: 'accredited'
      });
      setMpStatusInfo(' Evento enviado: Pago simulado y Acreditado');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Evento Simulado: ${JSON.stringify(data, null, 2)}`, ...prev]);
      
      // Auto obtener orden actualizada
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(` Error simulando evento: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Error Evento: ${err.message}`, ...prev]);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularFallaMP = async (detail = 'insufficient_amount') => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden en Mercado Pago primero');
    try {
      setMpCargando(true);
      setMpStatusInfo(`Simulando FALLA DE PAGO (${detail}) en Terminal Virtual...`);
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'failed',
        payment_method_type: 'credit_card',
        installments: 1,
        payment_method_id: 'visa',
        status_detail: detail
      });
      setMpStatusInfo(` SIMULACIÓN DE RECHAZO: Estado ${data.status || 'failed'} (${detail})`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Falla Simulada (${detail}): ${JSON.stringify(data, null, 2)}`, ...prev]);
      
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(` Error simulando falla: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Error Falla: ${err.message}`, ...prev]);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularReembolsoMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden en Mercado Pago primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando REEMBOLSO DE ORDEN (POST /v1/orders/events)...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'refunded'
      });
      setMpStatusInfo(' SIMULACIÓN DE REEMBOLSO: Estado REFUNDED');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Reembolso Simulado: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(` Error simulando reembolso: ${err.message}`);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularCancelacionMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden en Mercado Pago primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando CANCELACIÓN DE ORDEN (POST /v1/orders/events)...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'canceled'
      });
      setMpStatusInfo(' SIMULACIÓN DE CANCELACIÓN: Estado CANCELED');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Cancelación Simulada: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(` Error simulando cancelación: ${err.message}`);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularExpiracionMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden en Mercado Pago primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando EXPIRACIÓN DE ORDEN (POST /v1/orders/events)...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'expired'
      });
      setMpStatusInfo(' SIMULACIÓN DE EXPIRACIÓN: Estado EXPIRED (Timeout presencial)');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Expiración Simulada: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(` Error simulando expiración: ${err.message}`);
    } finally {
      setMpCargando(false);
    }
  };

  const handleSimularAccionRequeridaMP = async () => {
    if (!mpOrdenActual?.id) return alert('Debes crear la orden en Mercado Pago primero');
    try {
      setMpCargando(true);
      setMpStatusInfo('Simulando ACCIÓN REQUERIDA EN TERMINAL (POST /v1/orders/events)...');
      const data = await simularEventoMercadoPago({
        order_id: mpOrdenActual.id,
        status: 'action_required'
      });
      setMpStatusInfo(' SIMULACIÓN DE ACCIÓN REQUERIDA: Estado ACTION_REQUIRED (Revisar Terminal/NIP)');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Acción Requerida Simulada: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(` Error simulando acción requerida: ${err.message}`);
    } finally {
      setMpCargando(false);
    }
  };

  const handleObtenerOrdenMP = async (orderIdTarget) => {
    const targetId = orderIdTarget || mpOrdenActual?.id;
    if (!targetId) return alert('Debes tener una orden activa');
    try {
      setMpCargando(true);
      setMpStatusInfo('Consultando estado de orden (GET /v1/orders)...');
      const data = await obtenerOrdenMercadoPago(targetId);
      setMpOrdenActual(data);
      const est = data.status || data.data?.status || 'desconocido';
      const det = data.status_detail || data.data?.status_detail || '';
      setMpStatusInfo(`Estado de la orden: ${est.toUpperCase()} ${det ? `(${det})` : ''}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Estatus Orden: ${JSON.stringify(data, null, 2)}`, ...prev]);
    } catch (err) {
      setMpStatusInfo(` Error consultando orden: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}]  Error Consulta: ${err.message}`, ...prev]);
    } finally {
      setMpCargando(false);
    }
  };

  const handleFinalizarVentaBd = async () => {
    const est = (mpOrdenActual?.status || mpOrdenActual?.data?.status || '').toLowerCase();
    if (est === 'failed' || est === 'rejected') {
      return alert(' No se puede registrar la venta porque el cobro con Mercado Pago fue RECHAZADO / FALLIDO.');
    }
    if (est === 'canceled' || est === 'refunded') {
      return alert(` No se puede registrar la venta porque la orden está ${est.toUpperCase()} (Cancelada/Reembolsada).`);
    }
    if (est === 'expired') {
      return alert(' No se puede registrar la venta porque la orden EXPIRÓ. Por favor crea una nueva orden.');
    }
    if (est === 'action_required') {
      return alert(' No se puede registrar la venta aún. La terminal requiere una acción del cliente (NIP / Deslizar tarjeta).');
    }
    if (!mpOrdenActual?.id) {
      if (!window.confirm('️ Aún no has creado la orden en Mercado Pago. ¿Deseas confirmar la venta de todas formas?')) {
        return;
      }
    }
    await registrarVentaEnSistema();
    setModalMercadoPago(false);
    setMpOrdenActual(null);
  };

  const registrarVentaEnSistema = async (mpData) => {
    const pacienteObj = pacientes.find((p) => String(p.id) === String(pacienteId));
    const pacienteNombre = pacienteObj ? `${pacienteObj.nombre} ${pacienteObj.apellidos || ''}`.trim() : 'Mostrador';
    const ventaId = Date.now();
    const valAdelanto = parseFloat(efectivoRecibido) || total;

    const productosPlanos = [];
    carrito.forEach(item => {
      if (item.isPaquete) {
        productosPlanos.push({ ...item.principal, cantidadVenta: item.cantidadVenta, precioBase: item.principal.precio_unitario });
        if (item.material) productosPlanos.push({ ...item.material, cantidadVenta: item.cantidadVenta });
        if (item.tratamiento) productosPlanos.push({ ...item.tratamiento, cantidadVenta: item.cantidadVenta });
      } else {
        productosPlanos.push(item);
      }
    });

      const tienePaquete = carrito.some(i => i.isPaquete);
      const isTerminado = !tienePaquete;

      const venta = {
      id: ventaId,
      pacienteId: pacienteId ? pacienteId.toString() : null,
      examenId: examenSeleccionado ? examenSeleccionado.toString().replace('ex-', '') : null,
      productos: productosPlanos,
      detallesLentes: { config: carrito.filter(i => i.isPaquete), mercadoPago: mpData || mpOrdenActual },
      consulta: observaciones,
      lentesTerminados: isTerminado,
      motivoNoTerminado: isTerminado ? '' : 'Pendiente pedido de laboratorio',
      subtotalCarrito: subtotalGeneral,
      descuento: descuentoMonto,
      total,
      adelanto: valAdelanto,
      saldoPendiente: Math.max(0, total - valAdelanto),
      estadoPago: valAdelanto >= total ? 'Pagado' : 'Pendiente',
      graduacion: '',
      metodoPago
    };

    await registrarVenta(venta);
    if (pacienteObj?.correo) {
      enviarCorreoConfirmacionPedido({
        correoDestino: pacienteObj.correo, nombreCliente: pacienteNombre,
        productos: carrito,
        subtotal: subtotalCarrito, total: total,
        adelanto: valAdelanto, saldoPendiente: venta.saldoPendiente, pedidoId: ventaId
      });
    }

    generarTicketVenta({ ...venta, productos: carrito, fecha: new Date().toISOString() }, pacienteNombre, carrito);
    
    setCarrito([]); setPacienteId(''); setExamenSeleccionado(''); setMetodoPago('Efectivo'); setEfectivoRecibido('');
    setDescuentoTipo('none'); setDescuentoValor(''); setObservaciones(''); setMpOrdenActual(null);
  };

  // --- Handler Procesar Venta ---
  const handleProcesar = async () => {
    if (carrito.length === 0 && subtotalGeneral === 0) return alert('No hay nada para cobrar.');
    
    if (metodoPago === 'Crédito' || metodoPago === 'Débito') {
      setModalMercadoPago(true);
      return;
    }

    await registrarVentaEnSistema();
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-1.5rem', height: 'calc(100vh - 64px)', position: 'relative' }}>
      <div style={{ display: 'flex', height: '100%' }}>
        
        {/* COLUMNA IZQUIERDA: CONSTRUCTOR */}
        <div style={{ flex: '7', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', padding: '1.5rem', backgroundColor: '#f8fafc' }}>
          
          {/* MITAD SUPERIOR: Selección de Producto Base */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
              {['Armazones', 'Lentes de Contacto', 'Accesorios'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaTop(cat)}
                  style={{
                    flex: 1, padding: '0.75rem', border: 'none', backgroundColor: categoriaTop === cat ? '#eff6ff' : 'white',
                    color: categoriaTop === cat ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer',
                    borderBottom: categoriaTop === cat ? '3px solid #2563eb' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Barra de búsqueda de productos */}
            <div style={{ padding: '0.75rem 1.25rem 0 1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text" placeholder="Buscar por marca o modelo..."
                  value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', backgroundColor: '#f8fafc' }}
                />
              </div>
            </div>
            <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                {productosTop.map(prod => (
                  <div 
                    key={prod.id_producto} onClick={() => setProductoConstructor(prod)}
                    style={{ border: '2px solid', borderColor: productoConstructor?.id_producto === prod.id_producto ? '#3b82f6' : '#e2e8f0', borderRadius: '12px', padding: '1rem', cursor: 'pointer', backgroundColor: productoConstructor?.id_producto === prod.id_producto ? '#eff6ff' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: '160px' }}
                  >
                    <div style={{ marginBottom: '1rem', flex: 1, display: 'flex', alignItems: 'center' }}>
                      {prod.ruta_imagen ? (
                        <img src={prod.ruta_imagen} alt="Img" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{width: '60px', height: '60px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          {prod.id_producto === 'armazon_propio_cliente' ? <User size={32} color="#94a3b8" /> : <ImageIcon size={32} color="#94a3b8" />}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{prod.marca}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b', lineHeight: 1.2, margin: '0.2rem 0' }}>{prod.modelo || prod.marca}</div>
                    <div style={{ marginTop: 'auto', fontSize: '1.1rem', fontWeight: '900', color: '#1e293b' }}>$ {(Number(prod.precio_unitario) || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MITAD INFERIOR: Configuración */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={18} /> Configurar Producto</h3>
            </div>
            
            <div style={{ padding: '1.25rem', display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: '0.75rem', textTransform: 'uppercase' }}>1. Material del Lente</h4>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem', minHeight: 0 }}>
                  {materiales.map(mat => (
                    <label key={mat.id_material} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid', borderColor: materialSeleccionado === mat.id_material.toString() ? '#3b82f6' : '#e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: materialSeleccionado === mat.id_material.toString() ? '#eff6ff' : 'white' }}>
                      <input type="radio" name="material" value={mat.id_material} checked={materialSeleccionado === mat.id_material.toString()} onChange={(e) => setMaterialSeleccionado(e.target.value)} style={{ margin: 0 }} />
                      <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 'bold' }}>{mat.nombre}</div>
                    </label>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid', borderColor: materialSeleccionado === '' ? '#3b82f6' : '#e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: materialSeleccionado === '' ? '#eff6ff' : 'white' }}>
                    <input type="radio" name="material" value="" checked={materialSeleccionado === ''} onChange={() => setMaterialSeleccionado('')} style={{ margin: 0 }} />
                    <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 'bold' }}>Ninguno</div>
                  </label>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: '0.75rem', textTransform: 'uppercase' }}>2. Tratamiento</h4>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem', minHeight: 0 }}>
                  {tratamientos.map(trat => (
                    <label key={trat.id_tratamiento} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid', borderColor: tratamientoSeleccionado === trat.id_tratamiento.toString() ? '#10b981' : '#e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: tratamientoSeleccionado === trat.id_tratamiento.toString() ? '#ecfdf5' : 'white' }}>
                      <input type="radio" name="tratamiento" value={trat.id_tratamiento} checked={tratamientoSeleccionado === trat.id_tratamiento.toString()} onChange={(e) => setTratamientoSeleccionado(e.target.value)} style={{ margin: 0 }} />
                      <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 'bold' }}>{trat.nombre}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#10b981' }}>+${(Number(trat.costo_adicional)||0)}</div>
                    </label>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid', borderColor: tratamientoSeleccionado === '' ? '#10b981' : '#e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: tratamientoSeleccionado === '' ? '#ecfdf5' : 'white' }}>
                    <input type="radio" name="tratamiento" value="" checked={tratamientoSeleccionado === ''} onChange={() => setTratamientoSeleccionado('')} style={{ margin: 0 }} />
                    <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 'bold' }}>Ninguno</div>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Configuración:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e293b' }}>$ {calcularPrecioConfig().toLocaleString()}</div>
              </div>
              <button disabled={!productoConstructor} onClick={agregarLenteAlCarrito} style={{ backgroundColor: productoConstructor ? '#10b981' : '#94a3b8', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: productoConstructor ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.5rem' }} >
                <ShoppingCart size={18} /> Agregar al Carrito
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: TICKET DE COMPRA Y PAGO */}
        <div style={{ flex: '3', minWidth: '400px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%', position: 'sticky', top: 0 }}>
          
          {!checkoutActivo ? (
            <>
              {/* --- VISTA 1: RESUMEN DE VENTA --- */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                
                {/* Sección Cliente */}
                <div style={{ borderBottom: '1px solid #e2e8f0', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                      <User size={18} /> Cliente
                    </div>
                    {pacienteId ? <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14}/> Vinculado</div> : null}
                  </div>

                  {!pacienteId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ backgroundColor: '#e2e8f0', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={18} color="#64748b" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>Venta de Mostrador</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Sin paciente registrado</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setModalListaPacientes(true)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1', backgroundColor: '#ffffff', color: '#3b82f6', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        <Search size={16} /> Cambiar a paciente registrado
                      </button>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ backgroundColor: '#e2e8f0', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={18} color="#64748b" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>{pacientes.find(p => String(p.id) === String(pacienteId))?.nombre} {pacientes.find(p => String(p.id) === String(pacienteId))?.apellidos}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>CC {pacientes.find(p => String(p.id) === String(pacienteId))?.id} · {pacientes.find(p => String(p.id) === String(pacienteId))?.telefono}</div>
                        </div>
                      </div>
                      <button onClick={() => setPacienteId('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}><X size={16} /></button>
                    </div>
                  )}
                </div>

                {/* Sección Examen */}
                <div style={{ borderBottom: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                      <ScanFace size={18} /> Examen de la vista
                    </div>
                    {examenSeleccionado ? (
                      <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={14}/> Seleccionado
                        {!seCobraExamen ? (
                          <span style={{ marginLeft: '0.5rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>GRATIS</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  
                  {!pacienteId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Para asociar un examen ya existente, selecciona un paciente arriba.
                      </div>
                      {/* Costo del examen si es venta mostrador y no lleva lentes */}
                      {seCobraExamen && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fef3c7', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                          <span style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 'bold' }}>Costo Examen de Mostrador:</span>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#92400e', fontSize: '0.9rem' }}>$</span>
                            <input
                              type="number"
                              value={precioExamen}
                              onChange={(e) => setPrecioExamen(e.target.value)}
                              style={{ padding: '0.3rem 0.3rem 0.3rem 1.2rem', width: '80px', border: '1px solid #fcd34d', borderRadius: '4px', textAlign: 'right', outline: 'none' }}
                            />
                          </div>
                        </div>
                      )}
                      {/* Botón Realizar Examen Siempre Visible */}
                      <button 
                        onClick={() => setModalRegistroExamen(true)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3b82f6', backgroundColor: 'white', color: '#3b82f6', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.25rem' }}
                      >
                        <Plus size={16} /> Realizar Examen
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {examenesPaciente.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Este paciente no tiene exámenes registrados.</div>
                      ) : (
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                          {examenesPaciente
                            .filter(ex => !examenSeleccionado || String(ex.id) === String(examenSeleccionado))
                            .map(ex => {
                            const isSel = String(ex.id) === String(examenSeleccionado);
                            return (
                              <div 
                                key={ex.id} 
                                onClick={() => setExamenSeleccionado(isSel ? null : ex.id)}
                                style={{ backgroundColor: isSel ? '#eff6ff' : '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${isSel ? '#bfdbfe' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                              >
                                {isSel && (
                                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: '#60a5fa' }}>
                                    <X size={16} />
                                  </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', color: isSel ? '#1d4ed8' : '#475569', marginBottom: '0.5rem' }}>
                                  <ScanFace size={14} /> {ex.fecha} • {ex.doctor || 'Sin Doctor'}
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: isSel ? '#2563eb' : '#64748b' }}>
                                  <div><div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>OD</div><div>{ex.od?.esfera || '-'} / {ex.od?.cilindro || '-'} / {ex.od?.eje || '-'}°</div></div>
                                  <div><div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>OS</div><div>{ex.oi?.esfera || '-'} / {ex.oi?.cilindro || '-'} / {ex.oi?.eje || '-'}°</div></div>
                                  <div><div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>Adición / DP / AP</div><div>{ex.adicion || '-'} / {ex.dp ? `${ex.dp} mm` : '-'} / {ex.ap || '-'}</div></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Botón Realizar Examen Siempre Visible */}
                      <button 
                        onClick={() => setModalRegistroExamen(true)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3b82f6', backgroundColor: 'white', color: '#3b82f6', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.25rem' }}
                      >
                        <Plus size={16} /> Realizar Examen Nuevo
                      </button>
                    </div>
                  )}
                </div>

                {/* Venta actual */}
                <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', marginBottom: '1rem' }}>
                    <ShoppingCart size={18} /> Venta actual
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
                    {carrito.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center' }}>
                        <ShoppingCart size={48} color="#e2e8f0" style={{ marginBottom: '1rem' }} />
                        <div style={{ maxWidth: '200px', fontSize: '0.9rem' }}>Toca un producto del catálogo para agregarlo aquí</div>
                      </div>
                    ) : (
                      carrito.map((item) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>{item.principal.marca}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.principal.modelo}</div>
                            {item.isPaquete && (
                              <div style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                                  {item.material && <li>+ Mat: {item.material.nombre}</li>}
                                  {item.tratamiento && <li>+ Trat: {item.tratamiento.nombre}</li>}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 'bold', color: '#0f172a' }}>${Number(item.precio).toLocaleString()}</div>
                            <button onClick={() => quitarDelCarrito(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Quitar</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom Fixed Totals - VISTA RESUMEN */}
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '1.25rem', backgroundColor: 'white' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', marginBottom: '0.35rem' }}>
                    <span>Subtotal (Productos)</span><span>$ {subtotalCarrito.toLocaleString()}</span>
                  </div>
                  {costoExamenFinal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', marginBottom: '0.35rem' }}>
                      <span>Examen Visual</span><span>$ {costoExamenFinal.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #cbd5e1' }}>
                    <span>Total Subtotal</span><span>$ {subtotalGeneral.toLocaleString()}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    if (carrito.length === 0 && subtotalGeneral === 0) return alert('Agrega al menos un producto al carrito o selecciona un examen cobrado.');
                    setCheckoutActivo(true);
                  }}
                  style={{ width: '100%', backgroundColor: (carrito.length === 0 && subtotalGeneral === 0) ? '#94a3b8' : '#10b981', color: 'white', padding: '1rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: (carrito.length === 0 && subtotalGeneral === 0) ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  Proceder al Pago <ArrowRight size={20} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* --- VISTA 2: OPCIONES DE PAGO --- */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
                {!isModoAbono && (
                  <button 
                    onClick={() => setCheckoutActivo(false)} 
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: 0, fontWeight: 'bold', fontSize: '0.9rem' }}
                  >
                    <ArrowLeft size={16} /> Volver al Resumen
                  </button>
                )}

                <h3 style={{ margin: '0 0 1.25rem 0', color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={20} /> Opciones de Cobro
                </h3>

                {/* Descuentos */}
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#991b1b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Tag size={14} /> Aplicar Descuento</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select value={descuentoTipo} onChange={e => { setDescuentoTipo(e.target.value); setDescuentoValor(''); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', flex: 1, outline: 'none' }}>
                      <option value="none">Sin descuento</option>
                      <option value="percent">Porcentaje (%)</option>
                      <option value="fixed">Monto fijo ($)</option>
                    </select>
                    {descuentoTipo !== 'none' && (
                      <input type="number" min="0" placeholder={descuentoTipo === 'percent' ? '% desc.' : '$ desc.'} value={descuentoValor} onChange={e => setDescuentoValor(e.target.value)} style={{ width: '100px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', textAlign: 'right', outline: 'none' }} />
                    )}
                  </div>
                </div>

                {/* Observaciones */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FileText size={14} /> Observaciones</div>
                  <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas internas de la venta..." rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
                </div>

                {/* Métodos de Pago */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Método de Pago</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {['Efectivo', 'Débito', 'Crédito', 'Transferencia'].map(m => (
                      <button
                        key={m} onClick={() => setMetodoPago(m)}
                        style={{ padding: '0.75rem', border: '2px solid', borderColor: metodoPago === m ? '#3b82f6' : '#e2e8f0', backgroundColor: metodoPago === m ? '#eff6ff' : '#f8fafc', color: metodoPago === m ? '#1e40af' : '#475569', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', transition: 'all 0.2s' }}
                      >
                        {m === 'Efectivo' && <Banknote size={16} />}
                        {m === 'Débito' && <CreditCard size={16} />}
                        {m === 'Crédito' && <CreditCard size={16} />}
                        {m === 'Transferencia' && <Smartphone size={16} />}
                        {m}
                      </button>
                    ))}
                  </div>
                  {(metodoPago === 'Crédito' || metodoPago === 'Débito') && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#ecfdf5', padding: '0.5rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      <CreditCard size={14} /> Se procesará automáticamente mediante la Terminal Inteligente.
                    </div>
                  )}
                </div>

                {/* Adelanto / Efectivo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.95rem', color: '#475569', fontWeight: 'bold' }}>Adelanto / Pagado</span>
                  <div style={{ position: 'relative', width: '150px' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem', fontWeight: 'bold' }}>$</span>
                    <input 
                      type="number" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} placeholder={String(total)}
                      style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 1.75rem', borderRadius: '8px', border: '2px solid #cbd5e1', backgroundColor: '#f8fafc', textAlign: 'right', fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Fixed Totals - VISTA PAGO */}
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '1.25rem', backgroundColor: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontSize: '1.1rem' }}>{isModoAbono ? 'Saldo Pendiente' : 'Total a Pagar'}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>$ {isModoAbono ? Number(ventaAbonoOriginal?.saldoPendiente || 0).toLocaleString() : total.toLocaleString()}</span>
                </div>
                
                <button 
                  onClick={handleProcesar} disabled={carrito.length === 0 && subtotalGeneral === 0 && !isModoAbono}
                  style={{ width: '100%', backgroundColor: (carrito.length === 0 && subtotalGeneral === 0 && !isModoAbono) ? '#94a3b8' : '#3b82f6', color: 'white', padding: '1rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: (carrito.length === 0 && subtotalGeneral === 0 && !isModoAbono) ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'background-color 0.2s' }}
                >
                  <ClipboardList size={20} /> {isModoAbono ? 'Registrar Abono' : 'Procesar Venta'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ========================================================= */}
      {/* ================= MODALES FLOTANTES ===================== */}
      {/* ========================================================= */}
      
      {modalListaPacientes && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Seleccionar Paciente</h2>
              <button onClick={() => setModalListaPacientes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem' }}>
              <input type="text" placeholder="Buscar por nombre..." value={busquedaLista} onChange={e => setBusquedaLista(e.target.value)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <button onClick={() => { setModalListaPacientes(false); setModalRegistroPaciente(true); }} style={{ backgroundColor: '#10b981', color: 'white', padding: '0.75rem 1.25rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <Plus size={18} /> Añadir Paciente
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pacientes.filter(p => `${p.nombre} ${p.apellidos}`.toLowerCase().includes(busquedaLista.toLowerCase())).map(p => (
                  <div key={p.id} onClick={() => { setPacienteId(p.id.toString()); setModalListaPacientes(false); }} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.05rem' }}>{p.nombre} {p.apellidos}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>{p.correo} · {p.telefono}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{p.direccion}</div>
                    </div>
                    <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.9rem' }}>Seleccionar</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalRegistroPaciente && (
        <FormularioPaciente 
          onGuardar={handleGuardarPaciente} 
          onCancelar={() => setModalRegistroPaciente(false)} 
        />
      )}

      {modalRegistroExamen && (
        <FormularioExamen 
          pacienteId={pacienteId}
          onGuardar={handleGuardarExamen}
          onCancelar={() => setModalRegistroExamen(false)}
        />
      )}


      {modalMercadoPago && (
        <ModalMercadoPago
          monto={parseFloat(efectivoRecibido) || total}
          descripcion={`Pago Óptica Dioptrios ($${(parseFloat(efectivoRecibido) || total)} MXN)`}
          crearOrdenMercadoPago={crearOrdenMercadoPago}
          simularEventoMercadoPago={simularEventoMercadoPago}
          obtenerOrdenMercadoPago={obtenerOrdenMercadoPago}
          onCancel={() => setModalMercadoPago(false)}
          onSuccess={async (ordenData) => {
            setMpOrdenActual(ordenData);
            setModalMercadoPago(false);
            await registrarVentaEnSistema(ordenData);
          }}
        />
      )}

    </div>
  );
};

export default PuntoDeVenta;
