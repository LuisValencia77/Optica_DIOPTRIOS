import React, { useState, useEffect, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { buildReceiptText } from '../../utils/metrics';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, User, ClipboardList, ShoppingCart, X, CheckCircle, Image as ImageIcon, Plus, ScanFace, Banknote, CreditCard, Smartphone, Eye } from 'lucide-react';

const PuntoDeVenta = () => {
  const { 
    productos, pacientes, examenes, ventas, registrarVenta, enviarCorreoConfirmacionPedido, 
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
  const [mpCargando, setMpCargando] = useState(false);
  const [mpStatusInfo, setMpStatusInfo] = useState('');
  const [mpLogs, setMpLogs] = useState([]);
  
  const [busquedaLista, setBusquedaLista] = useState('');

  // Formularios
  const [formPaciente, setFormPaciente] = useState({ nombre: '', apellidos: '', telefono: '', correo: '', direccion: '', fechaNacimiento: '' });
  
  const examInicial = { esfera: '0.00', cilindro: '0.00', eje: '0', adicion: '0.00', agudeza: '20/20' };
  const [formExamen, setFormExamen] = useState({
    od: {...examInicial},
    oi: {...examInicial},
    dp: ''
  });

  // --- Estados Receta Adicional ---
  const [paraQuienTipo, setParaQuienTipo] = useState('principal');
  const [modalRegistroAdicional, setModalRegistroAdicional] = useState(false);
  const [adicionalNombre, setAdicionalNombre] = useState('');
  const [adicionalExamen, setAdicionalExamen] = useState({ od: {...examInicial}, oi: {...examInicial} });

  // --- NUEVA ESTRUCTURA CATÁLOGO ---
  const [categoriaTop, setCategoriaTop] = useState('Armazones');
  const [productoConstructor, setProductoConstructor] = useState(null);
  
  const [materialSeleccionado, setMaterialSeleccionado] = useState('');
  const [tratamientosSeleccionados, setTratamientosSeleccionados] = useState([]);
  const [graduacionSeleccionada, setGraduacionSeleccionada] = useState('Ninguna');
  const graduaciones = ['Ninguna', 'Monofocal', 'Bifocal', 'Progresivo', 'Ocupacional'];

  // Efectos y Memorizaciones
  useEffect(() => {
    if (location.state?.newPacienteId) {
      setPacienteId(location.state.newPacienteId.toString());
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
    return productos.filter(prod => {
      if (categoriaTop === 'Armazones' && prod.tipo_articulo === 'armazon') return true;
      if (categoriaTop === 'Lentes de Contacto' && prod.tipo_articulo === 'lente_contacto') return true;
      if (categoriaTop === 'Accesorios' && prod.tipo_articulo === 'accesorio') return true;
      return false;
    });
  }, [productos, categoriaTop]);



  // --- Funciones Carrito ---
  const toggleTratamiento = (id) => {
    setTratamientosSeleccionados(prev => prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]);
  };

  const calcularPrecioConfig = () => {
    let total = 0;
    if (productoConstructor) total += Number(productoConstructor.precio_unitario) || 0;
    tratamientosSeleccionados.forEach(id => {
      const trat = tratamientos.find(t => String(t.id_tratamiento) === String(id));
      if (trat) total += Number(trat.costo_adicional) || 0;
    });
    return total;
  };

  const agregarLenteAlCarrito = () => {
    if (!productoConstructor) return;

    let recetaFinal = null;
    if (graduacionSeleccionada !== 'Ninguna') {
      if (paraQuienTipo === 'principal') {
        if (!examenSeleccionado) {
          alert('Debes seleccionar un examen visual del paciente principal en el panel derecho.');
          return;
        }
        const ex = examenes.find(e => String(e.id) === String(examenSeleccionado));
        const pacienteObj = pacientes.find(p => String(p.id) === String(pacienteId));
        recetaFinal = {
          tipo: 'principal',
          nombre: pacienteObj ? `${pacienteObj.nombre} ${pacienteObj.apellidos}` : 'Cliente Principal',
          od: ex?.od,
          oi: ex?.oi
        };
      } else {
        if (!adicionalNombre) {
          alert('Debes ingresar los datos de la persona adicional.');
          setModalRegistroAdicional(true);
          return;
        }
        recetaFinal = {
          tipo: 'adicional',
          nombre: adicionalNombre,
          od: adicionalExamen.od,
          oi: adicionalExamen.oi
        };
      }
    }

    const paquete = {
      id: Date.now(),
      isPaquete: true,
      principal: productoConstructor,
      material: materialSeleccionado ? materiales.find(m => String(m.id_material) === String(materialSeleccionado)) : null,
      tratamientos: tratamientosSeleccionados.map(id => tratamientos.find(t => String(t.id_tratamiento) === String(id))).filter(Boolean),
      graduacion: graduacionSeleccionada,
      receta: recetaFinal,
      cantidadVenta: 1,
      precio: calcularPrecioConfig()
    };
    
    setCarrito([...carrito, paquete]);
    setProductoConstructor(null);
    setMaterialSeleccionado('');
    setTratamientosSeleccionados([]);
    setGraduacionSeleccionada('Ninguna');
    setParaQuienTipo('principal');
    setAdicionalNombre('');
    setAdicionalExamen({ od: {...examInicial}, oi: {...examInicial} });
  };

  const quitarDelCarrito = (id) => setCarrito(prev => prev.filter(item => item.id !== id));

  const subtotalCarrito = carrito.reduce((sum, item) => sum + ((Number(item.precio) || 0) * (item.cantidadVenta || 1)), 0);
  const total = subtotalCarrito;

  // --- Handlers Formularios ---
  const handleGuardarPaciente = async (e) => {
    e.preventDefault();
    if (!formPaciente.nombre || !formPaciente.apellidos) return alert('Nombre y apellidos requeridos');
    const newId = await agregarPaciente(formPaciente);
    if (newId) {
      setPacienteId(newId.toString());
      setModalRegistroPaciente(false);
      setFormPaciente({ nombre: '', apellidos: '', telefono: '', correo: '', direccion: '', fechaNacimiento: '' });
    }
  };

  const handleGuardarExamen = async (e) => {
    e.preventDefault();
    if (!pacienteId) return alert('Seleccione un paciente primero');
    
    const exObj = {
      pacienteId,
      fecha: new Date().toISOString().split('T')[0],
      od: formExamen.od,
      oi: formExamen.oi,
      tipoArmazon: formExamen.dp // Reutilizando campo para DP por simplicidad
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
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ✅ Orden Creada ($${valAdelanto} MXN): ${JSON.stringify(data, null, 2)}`, ...prev]);
    } catch (err) {
      setMpStatusInfo(`❌ Error creando orden: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error Orden: ${err.message}`, ...prev]);
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
      setMpStatusInfo('✅ Evento enviado: Pago simulado y Acreditado');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 💳 Evento Simulado: ${JSON.stringify(data, null, 2)}`, ...prev]);
      
      // Auto obtener orden actualizada
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando evento: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error Evento: ${err.message}`, ...prev]);
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
      setMpStatusInfo(`❌ SIMULACIÓN DE RECHAZO: Estado ${data.status || 'failed'} (${detail})`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Falla Simulada (${detail}): ${JSON.stringify(data, null, 2)}`, ...prev]);
      
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando falla: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error Falla: ${err.message}`, ...prev]);
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
      setMpStatusInfo('🔄 SIMULACIÓN DE REEMBOLSO: Estado REFUNDED');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 🔄 Reembolso Simulado: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando reembolso: ${err.message}`);
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
      setMpStatusInfo('🚫 SIMULACIÓN DE CANCELACIÓN: Estado CANCELED');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 🚫 Cancelación Simulada: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando cancelación: ${err.message}`);
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
      setMpStatusInfo('⏳ SIMULACIÓN DE EXPIRACIÓN: Estado EXPIRED (Timeout presencial)');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ⏳ Expiración Simulada: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando expiración: ${err.message}`);
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
      setMpStatusInfo('📱 SIMULACIÓN DE ACCIÓN REQUERIDA: Estado ACTION_REQUIRED (Revisar Terminal/NIP)');
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 📱 Acción Requerida Simulada: ${JSON.stringify(data, null, 2)}`, ...prev]);
      await handleObtenerOrdenMP(mpOrdenActual.id);
    } catch (err) {
      setMpStatusInfo(`❌ Error simulando acción requerida: ${err.message}`);
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
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] 🔍 Estatus Orden: ${JSON.stringify(data, null, 2)}`, ...prev]);
    } catch (err) {
      setMpStatusInfo(`❌ Error consultando orden: ${err.message}`);
      setMpLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error Consulta: ${err.message}`, ...prev]);
    } finally {
      setMpCargando(false);
    }
  };

  const handleFinalizarVentaBd = async () => {
    const est = (mpOrdenActual?.status || mpOrdenActual?.data?.status || '').toLowerCase();
    if (est === 'failed' || est === 'rejected') {
      return alert('❌ No se puede registrar la venta porque el cobro con Mercado Pago fue RECHAZADO / FALLIDO.');
    }
    if (est === 'canceled' || est === 'refunded') {
      return alert(`❌ No se puede registrar la venta porque la orden está ${est.toUpperCase()} (Cancelada/Reembolsada).`);
    }
    if (est === 'expired') {
      return alert('⏳ No se puede registrar la venta porque la orden EXPIRÓ. Por favor crea una nueva orden.');
    }
    if (est === 'action_required') {
      return alert('📱 No se puede registrar la venta aún. La terminal requiere una acción del cliente (NIP / Deslizar tarjeta).');
    }
    if (!mpOrdenActual?.id) {
      if (!window.confirm('⚠️ Aún no has creado la orden en Mercado Pago. ¿Deseas confirmar la venta de todas formas?')) {
        return;
      }
    }
    await registrarVentaEnSistema();
    setModalMercadoPago(false);
    setMpOrdenActual(null);
  };

  const registrarVentaEnSistema = async () => {
    const pacienteObj = pacientes.find((p) => String(p.id) === String(pacienteId));
    const pacienteNombre = pacienteObj ? `${pacienteObj.nombre} ${pacienteObj.apellidos || ''}`.trim() : 'Mostrador';
    const ventaId = Date.now();
    const valAdelanto = parseFloat(efectivoRecibido) || total;

    const productosPlanos = [];
    let graduacionesParaDb = [];
    carrito.forEach(item => {
      if (item.isPaquete) {
        productosPlanos.push({ ...item.principal, cantidadVenta: item.cantidadVenta, precioBase: item.principal.precio_unitario });
        if (item.material) productosPlanos.push({ ...item.material, cantidadVenta: item.cantidadVenta });
        if (item.graduacion !== 'Ninguna') graduacionesParaDb.push(item.graduacion);
      } else {
        productosPlanos.push(item);
      }
    });

    const venta = {
      id: ventaId,
      pacienteId: pacienteId ? pacienteId.toString() : null,
      examenId: examenSeleccionado ? examenSeleccionado.toString().replace('ex-', '') : null,
      productos: productosPlanos,
      detallesLentes: { config: carrito.filter(i => i.isPaquete), mercadoPago: mpOrdenActual },
      consulta,
      lentesTerminados,
      motivoNoTerminado: lentesTerminados ? '' : motivoNoTerminado,
      subtotalCarrito,
      total,
      adelanto: valAdelanto,
      saldoPendiente: Math.max(0, total - valAdelanto),
      estadoPago: valAdelanto >= total ? 'Pagado' : 'Pendiente',
      graduacion: [...new Set(graduacionesParaDb)].join(', ')
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

    const ticketText = buildReceiptText({ ...venta, productos: carrito, fecha: new Date().toISOString() }, pacienteNombre);
    window.alert(ticketText);
    
    setCarrito([]); setPacienteId(''); setExamenSeleccionado(''); setMetodoPago('Efectivo'); setEfectivoRecibido('');
  };

  // --- Handler Procesar Venta ---
  const handleProcesar = async () => {
    if (carrito.length === 0) return alert('Agrega al menos un producto al carrito.');
    
    if (metodoPago === 'Mercado Pago') {
      setModalMercadoPago(true);
      setMpStatusInfo('Terminal Virtual Mercado Pago lista. Haz clic en "Crear Orden" para iniciar.');
      setMpLogs([]);
      setMpOrdenActual(null);
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
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: '1 1 50%', minHeight: '350px' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
              {['Armazones', 'Lentes de Contacto', 'Accesorios'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaTop(cat)}
                  style={{
                    flex: 1, padding: '1rem', border: 'none', backgroundColor: categoriaTop === cat ? '#eff6ff' : 'white',
                    color: categoriaTop === cat ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer',
                    borderBottom: categoriaTop === cat ? '3px solid #2563eb' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.95rem'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                {productosTop.map(prod => (
                  <div 
                    key={prod.id_producto} onClick={() => setProductoConstructor(prod)}
                    style={{ border: '2px solid', borderColor: productoConstructor?.id_producto === prod.id_producto ? '#3b82f6' : '#e2e8f0', borderRadius: '12px', padding: '1rem', cursor: 'pointer', backgroundColor: productoConstructor?.id_producto === prod.id_producto ? '#eff6ff' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: '160px' }}
                  >
                    <div style={{ marginBottom: '1rem', flex: 1, display: 'flex', alignItems: 'center' }}>
                      {prod.ruta_imagen ? <img src={prod.ruta_imagen} alt="Img" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'contain' }} /> : <div style={{width: '60px', height: '60px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><ImageIcon size={32} color="#94a3b8" /></div>}
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
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: '1 1 50%', minHeight: '350px' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={18} /> Configurar Producto</h3>
            </div>
            
            <div style={{ padding: '1.25rem', display: 'flex', gap: '1.5rem', flex: 1 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: '0.75rem', textTransform: 'uppercase' }}>1. Material del Lente</h4>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
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

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: '0.75rem', textTransform: 'uppercase' }}>2. Tratamientos (Múltiple)</h4>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                  {tratamientos.map(trat => (
                    <label key={trat.id_tratamiento} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid', borderColor: tratamientosSeleccionados.includes(trat.id_tratamiento.toString()) ? '#10b981' : '#e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: tratamientosSeleccionados.includes(trat.id_tratamiento.toString()) ? '#ecfdf5' : 'white' }}>
                      <input type="checkbox" checked={tratamientosSeleccionados.includes(trat.id_tratamiento.toString())} onChange={() => toggleTratamiento(trat.id_tratamiento.toString())} style={{ margin: 0 }} />
                      <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 'bold' }}>{trat.nombre}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#10b981' }}>+${(Number(trat.costo_adicional)||0)}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: '0.75rem', textTransform: 'uppercase' }}>3. Graduación</h4>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                  {graduaciones.map(grad => (
                    <label key={grad} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid', borderColor: graduacionSeleccionada === grad ? '#8b5cf6' : '#e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: graduacionSeleccionada === grad ? '#f5f3ff' : 'white' }}>
                      <input type="radio" name="graduacion" value={grad} checked={graduacionSeleccionada === grad} onChange={(e) => setGraduacionSeleccionada(e.target.value)} style={{ margin: 0 }} />
                      <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 'bold', color: graduacionSeleccionada === grad ? '#6d28d9' : '#334155' }}>{grad}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: '0.75rem', textTransform: 'uppercase' }}>4. ¿Para quién es?</h4>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid', borderColor: paraQuienTipo === 'principal' ? '#f59e0b' : '#e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: paraQuienTipo === 'principal' ? '#fffbeb' : 'white' }}>
                    <input type="radio" value="principal" checked={paraQuienTipo === 'principal'} onChange={() => setParaQuienTipo('principal')} style={{ margin: 0 }} />
                    <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 'bold' }}>Paciente Principal</div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid', borderColor: paraQuienTipo === 'adicional' ? '#f59e0b' : '#e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: paraQuienTipo === 'adicional' ? '#fffbeb' : 'white' }}>
                    <input type="radio" value="adicional" checked={paraQuienTipo === 'adicional'} onChange={() => setParaQuienTipo('adicional')} style={{ margin: 0 }} />
                    <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 'bold' }}>Persona Adicional</div>
                  </label>
                  
                  {paraQuienTipo === 'adicional' && (
                    <button onClick={() => setModalRegistroAdicional(true)} style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fef3c7', color: '#d97706', border: '1px dashed #f59e0b', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>
                      {adicionalNombre ? `Receta de ${adicionalNombre}` : '+ Ingresar Datos Adicionales'}
                    </button>
                  )}
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

        {/* COLUMNA DERECHA: TICKET DE COMPRA */}
        <div style={{ flex: '3', minWidth: '400px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%', position: 'sticky', top: 0 }}>
          
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
                <button 
                  onClick={() => setModalListaPacientes(true)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#3b82f6', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                >
                  <Search size={16} /> Buscar o Seleccionar Paciente
                </button>
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
                {examenSeleccionado ? <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14}/> Seleccionado</div> : null}
              </div>
              
              {!pacienteId ? (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Primero seleccione un paciente</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {examenesPaciente.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Este paciente no tiene exámenes registrados.</div>
                  ) : (
                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                      {examenesPaciente.map(ex => {
                        const isSel = String(ex.id) === String(examenSeleccionado);
                        return (
                          <div 
                            key={ex.id} 
                            onClick={() => setExamenSeleccionado(ex.id)}
                            style={{ backgroundColor: isSel ? '#eff6ff' : '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${isSel ? '#bfdbfe' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', color: isSel ? '#1d4ed8' : '#475569', marginBottom: '0.5rem' }}>
                              <ScanFace size={14} /> {ex.fecha} · {ex.tratamientoLentes || 'Sin Doctor'}
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: isSel ? '#2563eb' : '#64748b' }}>
                              <div><div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>OD</div><div>{ex.od?.esfera} / {ex.od?.cilindro} / {ex.od?.eje}°</div></div>
                              <div><div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>OS</div><div>{ex.oi?.esfera} / {ex.oi?.cilindro} / {ex.oi?.eje}°</div></div>
                            </div>
                            {ex.tipoArmazon && <div style={{ fontSize: '0.75rem', color: isSel ? '#2563eb' : '#64748b', marginTop: '0.4rem' }}>DP: {ex.tipoArmazon} mm</div>}
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
                    <Plus size={16} /> Realizar Examen
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
                              {item.tratamientos.map(t => <li key={t.id_tratamiento}>+ Trat: {t.nombre}</li>)}
                              {item.graduacion !== 'Ninguna' && <li>+ Grad: {item.graduacion}</li>}
                            </ul>
                            {item.receta && (
                              <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                                <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '0.25rem' }}>👤 Para: {item.receta.nombre}</div>
                                {JSON.stringify(item.receta.od) === JSON.stringify(item.receta.oi) ? (
                                  <div>Ambos Ojos: Esf {item.receta.od?.esfera} / Cil {item.receta.od?.cilindro} / Eje {item.receta.od?.eje}°</div>
                                ) : (
                                  <>
                                    <div>OD: Esf {item.receta.od?.esfera} / Cil {item.receta.od?.cilindro} / Eje {item.receta.od?.eje}°</div>
                                    <div>OS: Esf {item.receta.oi?.esfera} / Cil {item.receta.oi?.cilindro} / Eje {item.receta.oi?.eje}°</div>
                                  </>
                                )}
                              </div>
                            )}
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

          {/* Bottom Fixed Totals */}
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '1.25rem', backgroundColor: 'white' }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>
                <span>Subtotal</span><span>$ {subtotalCarrito.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>
                <span>Total a pagar</span><span>$ {total.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {['Efectivo', 'Mercado Pago', 'Débito', 'Crédito', 'Transferencia'].map(m => (
                <button
                  key={m} onClick={() => setMetodoPago(m)}
                  style={{ padding: '0.6rem', border: '1px solid', borderColor: metodoPago === m ? '#009ee3' : '#e2e8f0', backgroundColor: metodoPago === m ? '#009ee3' : '#f8fafc', color: metodoPago === m ? 'white' : '#1e293b', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem' }}
                >
                  {m === 'Efectivo' && <Banknote size={16} />}
                  {m === 'Mercado Pago' && <CreditCard size={16} color={metodoPago === m ? 'white' : '#009ee3'} />}
                  {m === 'Débito' && <CreditCard size={16} />}
                  {m === 'Crédito' && <CreditCard size={16} />}
                  {m === 'Transferencia' && <Smartphone size={16} />}
                  {m}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Efectivo recibido</span>
              <div style={{ position: 'relative', width: '140px' }}>
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#0f172a', fontSize: '0.9rem', fontWeight: 'bold' }}>$ 0</span>
                <input 
                  type="number" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} placeholder=""
                  style={{ width: '100%', padding: '0.5rem 2.5rem 0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', textAlign: 'right', fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a' }}
                />
              </div>
            </div>

            <button 
              onClick={handleProcesar} disabled={carrito.length === 0}
              style={{ width: '100%', backgroundColor: carrito.length === 0 ? '#94a3b8' : '#3b82f6', color: 'white', padding: '1rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: carrito.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              <ClipboardList size={20} /> {carrito.length === 0 ? 'Carrito vacío' : 'Procesar Venta'}
            </button>
          </div>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '500px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Añadir Nuevo Paciente</h2>
              <button onClick={() => setModalRegistroPaciente(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            <form onSubmit={handleGuardarPaciente} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Nombre</label>
                <input required type="text" value={formPaciente.nombre} onChange={e => setFormPaciente({...formPaciente, nombre: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Apellidos</label>
                <input required type="text" value={formPaciente.apellidos} onChange={e => setFormPaciente({...formPaciente, apellidos: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Teléfono</label>
                  <input type="tel" value={formPaciente.telefono} onChange={e => setFormPaciente({...formPaciente, telefono: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Nacimiento</label>
                  <input type="date" value={formPaciente.fechaNacimiento} onChange={e => setFormPaciente({...formPaciente, fechaNacimiento: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Correo Electrónico</label>
                <input type="email" value={formPaciente.correo} onChange={e => setFormPaciente({...formPaciente, correo: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Dirección</label>
                <input type="text" value={formPaciente.direccion} onChange={e => setFormPaciente({...formPaciente, direccion: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setModalRegistroPaciente(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Paciente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRegistroExamen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Nuevo Examen de la Vista</h2>
              <button onClick={() => setModalRegistroExamen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleGuardarExamen} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Distancia Pupilar (DP)</label>
                  <input type="text" value={formExamen.dp} onChange={e => setFormExamen({...formExamen, dp: e.target.value})} placeholder="Ej: 62mm" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              {/* Contenedor OD / OI */}
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                {/* Ojo Derecho */}
                <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#1d4ed8', borderBottom: '2px solid #93c5fd', paddingBottom: '0.5rem' }}>Ojo Derecho (OD)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Esfera</label>
                      <input type="number" step="0.25" value={formExamen.od.esfera} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, esfera: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Cilindro</label>
                      <input type="number" step="0.25" value={formExamen.od.cilindro} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, cilindro: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Eje</label>
                      <input type="number" min="0" max="180" value={formExamen.od.eje} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, eje: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Adición</label>
                      <input type="number" step="0.25" value={formExamen.od.adicion} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, adicion: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Agudeza</label>
                      <input type="text" value={formExamen.od.agudeza} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, agudeza: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>

                {/* Ojo Izquierdo */}
                <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#1d4ed8', borderBottom: '2px solid #93c5fd', paddingBottom: '0.5rem' }}>Ojo Izquierdo (OS)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Esfera</label>
                      <input type="number" step="0.25" value={formExamen.oi.esfera} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, esfera: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Cilindro</label>
                      <input type="number" step="0.25" value={formExamen.oi.cilindro} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, cilindro: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Eje</label>
                      <input type="number" min="0" max="180" value={formExamen.oi.eje} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, eje: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Adición</label>
                      <input type="number" step="0.25" value={formExamen.oi.adicion} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, adicion: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem' }}>Agudeza</label>
                      <input type="text" value={formExamen.oi.agudeza} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, agudeza: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalRegistroExamen(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Examen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRegistroAdicional && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef3c7', position: 'sticky', top: 0, zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#92400e' }}>Receta para Persona Adicional</h2>
              <button onClick={() => setModalRegistroAdicional(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#92400e" /></button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); setModalRegistroAdicional(false); }} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Nombre de la persona adicional *</label>
                  <input required type="text" value={adicionalNombre} onChange={e => setAdicionalNombre(e.target.value)} placeholder="Ej: Mi novia" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              {/* Contenedor OD / OI */}
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                {/* Ojo Derecho */}
                <div style={{ flex: 1, backgroundColor: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#d97706', borderBottom: '2px solid #fcd34d', paddingBottom: '0.5rem' }}>Ojo Derecho (OD)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Esfera</label><input type="number" step="0.25" value={adicionalExamen.od.esfera} onChange={e => setAdicionalExamen({...adicionalExamen, od: {...adicionalExamen.od, esfera: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                    <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Cilindro</label><input type="number" step="0.25" value={adicionalExamen.od.cilindro} onChange={e => setAdicionalExamen({...adicionalExamen, od: {...adicionalExamen.od, cilindro: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                    <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Eje</label><input type="number" min="0" max="180" value={adicionalExamen.od.eje} onChange={e => setAdicionalExamen({...adicionalExamen, od: {...adicionalExamen.od, eje: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                    <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Adición</label><input type="number" step="0.25" value={adicionalExamen.od.adicion} onChange={e => setAdicionalExamen({...adicionalExamen, od: {...adicionalExamen.od, adicion: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                  </div>
                </div>

                {/* Ojo Izquierdo */}
                <div style={{ flex: 1, backgroundColor: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#d97706', borderBottom: '2px solid #fcd34d', paddingBottom: '0.5rem' }}>Ojo Izquierdo (OS)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Esfera</label><input type="number" step="0.25" value={adicionalExamen.oi.esfera} onChange={e => setAdicionalExamen({...adicionalExamen, oi: {...adicionalExamen.oi, esfera: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                    <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Cilindro</label><input type="number" step="0.25" value={adicionalExamen.oi.cilindro} onChange={e => setAdicionalExamen({...adicionalExamen, oi: {...adicionalExamen.oi, cilindro: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                    <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Eje</label><input type="number" min="0" max="180" value={adicionalExamen.oi.eje} onChange={e => setAdicionalExamen({...adicionalExamen, oi: {...adicionalExamen.oi, eje: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                    <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Adición</label><input type="number" step="0.25" value={adicionalExamen.oi.adicion} onChange={e => setAdicionalExamen({...adicionalExamen, oi: {...adicionalExamen.oi, adicion: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalRegistroAdicional(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f59e0b', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Temporalmente</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modalMercadoPago && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Header Modal MP */}
            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#009ee3', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'white', padding: '0.4rem 0.6rem', borderRadius: '8px', fontWeight: 'bold', color: '#009ee3', fontSize: '0.9rem' }}>
                  Mercado Pago
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'white' }}>Terminal Virtual & Simulación de Órdenes</h3>
                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>Integración Presencial (v1/orders)</p>
                </div>
              </div>
              <button onClick={() => setModalMercadoPago(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}><X size={24} /></button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Box Cuentas de Prueba */}
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#0369a1', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔑 Cuentas de Prueba Configuradas (.env)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem', color: '#0c4a6e' }}>
                  <div>
                    <strong>Vendedor:</strong> TESTUSER5420596611249074639<br/>
                    <strong>Pass:</strong> GR5saBuGut
                  </div>
                  <div>
                    <strong>Comprador:</strong> TESTUSER6704094853165047914<br/>
                    <strong>Pass:</strong> 4aEeG20BLm
                  </div>
                </div>
              </div>

              {/* Box Estado de la Orden Actual */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  <span>Total de la Venta:</span>
                  <span>$ {total.toLocaleString()} MXN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0369a1' }}>Monto a cobrar en Terminal (Adelanto/Pago actual):</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#009ee3' }}>$ {(parseFloat(efectivoRecibido) || total).toLocaleString()} MXN</span>
                </div>
                {Math.max(0, total - (parseFloat(efectivoRecibido) || total)) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#b91c1c', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    <span>Saldo restante que quedará pendiente:</span>
                    <span>$ {Math.max(0, total - (parseFloat(efectivoRecibido) || total)).toLocaleString()} MXN</span>
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: '#334155', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
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
                  onClick={handleCrearOrdenMP} disabled={mpCargando}
                  style={{ backgroundColor: '#009ee3', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: mpCargando ? 'not-allowed' : 'pointer', opacity: mpCargando ? 0.7 : 1 }}
                >
                  1. Crear Orden
                </button>
                <button
                  onClick={handleSimularEventoMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#10b981' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2a. Éxito
                </button>
                <button
                  onClick={() => handleSimularFallaMP('insufficient_amount')} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#ef4444' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2b. Falla
                </button>
                <button
                  onClick={handleSimularReembolsoMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#f59e0b' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2c. Reembolso
                </button>
                <button
                  onClick={handleSimularCancelacionMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#64748b' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2d. Cancelar
                </button>
                <button
                  onClick={handleSimularExpiracionMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#ea580c' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2e. Expirar
                </button>
                <button
                  onClick={handleSimularAccionRequeridaMP} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: mpOrdenActual?.id ? '#0284c7' : '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  2f. Acción Req.
                </button>
                <button
                  onClick={() => handleObtenerOrdenMP()} disabled={mpCargando || !mpOrdenActual?.id}
                  style={{ backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 0.35rem', fontWeight: 'bold', fontSize: '0.75rem', cursor: (!mpOrdenActual?.id || mpCargando) ? 'not-allowed' : 'pointer' }}
                >
                  3. Consultar Estado
                </button>
              </div>

              {/* Terminal Logs */}
              <div>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', color: '#64748b' }}>Log de Peticiones API Mercado Pago:</h4>
                <div style={{ backgroundColor: '#0f172a', color: '#38bdf8', padding: '0.75rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.78rem', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                  {mpLogs.length === 0 ? '// Presiona "Crear Orden MP" para iniciar' : mpLogs.join('\n\n')}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setModalMercadoPago(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={handleFinalizarVentaBd}
                style={{ backgroundColor: '#16a34a', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <CheckCircle size={18} /> Confirmar Venta y Generar Ticket
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PuntoDeVenta;
