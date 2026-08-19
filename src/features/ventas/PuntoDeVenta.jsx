import React, { useState, useEffect, useMemo, Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, info: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { this.setState({ error, info }); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', backgroundColor: '#fee2e2', height: '100vh' }}>
          <h2>Runtime Error in PuntoDeVenta</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

import { useDatabase } from '../../context/DatabaseContext';
import { generarTicketVentaHTML } from '../../utils/ticketGenerator';
import ModalMercadoPago from '../../components/shared/ModalMercadoPago';
import FormularioPaciente from '../../components/shared/FormularioPaciente';
import FormularioExamen from '../../components/shared/FormularioExamen';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, User, ClipboardList, ShoppingCart, X, CheckCircle, Image as ImageIcon, Plus, ScanFace, Banknote, CreditCard, Smartphone, Eye, Tag, FileText, ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Activity, PackageOpen } from 'lucide-react';

const PuntoDeVenta = () => {
  const { 
    productos, pacientes, examenes, ventas, registrarVenta, actualizarPagoVenta, enviarCorreoConfirmacionPedido, 
    tratamientos, agregarPaciente, agregarExamen, materiales,
    crearOrdenMercadoPago, simularEventoMercadoPago, obtenerOrdenMercadoPago, enviarExamenPorCorreo
  } = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();

  // --- Estados de Carrito y Venta ---
  const [carrito, setCarrito] = useState([]);
  
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [ticketHtml, setTicketHtml] = useState(null);
  const [esAbono, setEsAbono] = useState(false);
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [checkoutActivo, setCheckoutActivo] = useState(false);
  
  const [descuentoTipo, setDescuentoTipo] = useState('none');
  const [descuentoValor, setDescuentoValor] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // --- Estados Modales ---
  const [modalListaPacientes, setModalListaPacientes] = useState(false);
  const [modalRegistroPaciente, setModalRegistroPaciente] = useState(false);
  const [modalMercadoPago, setModalMercadoPago] = useState(false);
  const [modalExamenCompletado, setModalExamenCompletado] = useState(null);
  const [mpOrdenActual, setMpOrdenActual] = useState(null);

  // --- Estado Modo Abono ---
  const [ventaAbonoOriginal, setVentaAbonoOriginal] = useState(null);
  const isModoAbono = !!ventaAbonoOriginal;

  const [busquedaLista, setBusquedaLista] = useState('');

  // Formularios
  const [formPaciente, setFormPaciente] = useState({ nombre: '', apellidos: '', telefono: '', correo: '', direccion: '', fechaNacimiento: '' });
  const [formError, setFormError] = useState(null);
  const examInicial = { od: { esfera: '0.00', cilindro: '0.00', eje: '0' }, oi: { esfera: '0.00', cilindro: '0.00', eje: '0' }, adicion: '0.00', dp: '0.00', ap: '0.00' };
  
  // ==========================================
  // WIZARD STATE MACHINE
  // ==========================================
  const [tipoVenta, setTipoVenta] = useState(null); // 'paciente' | 'mostrador'
  const [pacienteId, setPacienteId] = useState('');
  
  const [flujoActivo, setFlujoActivo] = useState(null); // 'examen', 'lentes', 'contacto', 'accesorios', 'liquidar'
  const [seccionExpandida, setSeccionExpandida] = useState('tipoVenta'); // 'tipoVenta', 'flujo', 'examen', 'configuracion', 'armazon', 'accesorios'
  
  // Flujo Examen Visual
  const [examenSeleccionado, setExamenSeleccionado] = useState(''); // ID si es existente, o 'nuevo'
  const [formExamen, setFormExamen] = useState({...examInicial});
  const [datosMostrador, setDatosMostrador] = useState({ nombre: '', edad: '', correo: '' });
  
  // Flujo Lentes
  const [materialSeleccionado, setMaterialSeleccionado] = useState('');
  const [tratamientoSeleccionado, setTratamientoSeleccionado] = useState('');
  const [armazonSeleccionado, setArmazonSeleccionado] = useState(null); // producto | 'propio'
  const [filtroMarcaArmazon, setFiltroMarcaArmazon] = useState('');
  const [filtroModeloArmazon, setFiltroModeloArmazon] = useState('');

  // Flujo Lentes de Contacto
  const [frecuenciaLC, setFrecuenciaLC] = useState('');
  const [calidadLC, setCalidadLC] = useState('');
  const [marcaLC, setMarcaLC] = useState('');
  
  // Flujo Accesorios
  const [accesoriosSeleccionados, setAccesoriosSeleccionados] = useState([]); // { producto, cantidad }
  const [busquedaAccesorios, setBusquedaAccesorios] = useState('');

  // Flujo Liquidar
  const [ventasPendientesSel, setVentasPendientesSel] = useState([]);

  // Secciones Completadas
  const [pasosCompletados, setPasosCompletados] = useState({
    tipoVenta: false,
    flujo: false,
    examen: false,
    configuracion: false,
    armazon: false,
    accesorios: false,
    liquidar: false
  });

  // ==========================================
  // EFFECTS
  // ==========================================
  useEffect(() => {
    if (location.state?.newPacienteId) {
      setTipoVenta('paciente');
      setPacienteId(location.state.newPacienteId.toString());
      setSeccionExpandida('flujo');
      setPasosCompletados(p => ({...p, tipoVenta: true}));
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Si cambia pacienteId, pre-seleccionar si hay examen
  const examenesPaciente = useMemo(() => {
    if (!pacienteId) return [];
    return examenes
      .filter(ex => String(ex.pacienteId) === String(pacienteId))
      .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  }, [examenes, pacienteId]);

  // ==========================================
  // HELPER FUNCTIONS & COMPUTED
  // ==========================================
  const subtotalCarrito = carrito.reduce((acc, item) => acc + (Number(item.precio) * (item.cantidadVenta || 1)), 0);
  const subtotalGeneral = subtotalCarrito;
  const descuentoMonto = descuentoTipo === 'percent' 
    ? subtotalGeneral * (Number(descuentoValor) / 100)
    : descuentoTipo === 'fixed' 
    ? Number(descuentoValor) 
    : 0;
  const total = Math.max(0, subtotalGeneral - descuentoMonto);

  const resetWizard = (mantenerCliente = false) => {
    setFlujoActivo(null);
    if (!mantenerCliente) {
      setTipoVenta(null);
      setPacienteId('');
      setSeccionExpandida('tipoVenta');
      setPasosCompletados({ tipoVenta: false, flujo: false, examen: false, configuracion: false, armazon: false, accesorios: false, liquidar: false });
    } else {
      setSeccionExpandida('flujo');
      setPasosCompletados({ tipoVenta: true, flujo: false, examen: false, configuracion: false, armazon: false, accesorios: false, liquidar: false });
    }
    
    setExamenSeleccionado('');
    setFormExamen({...examInicial});
    setDatosMostrador({ nombre: '', edad: '', correo: '' });
    setMaterialSeleccionado('');
    setTratamientoSeleccionado('');
    setArmazonSeleccionado(null);
    setFrecuenciaLC('');
    setCalidadLC('');
    setMarcaLC('');
    setAccesoriosSeleccionados([]);
    setVentasPendientesSel([]);
  };

  const handleCancelarCompra = () => {
    setCheckoutActivo(false);
    setCarrito([]);
    resetWizard(false);
  };

  const handleAddExtra = () => {
    resetWizard(true);
  };

  // ==========================================
  // WIZARD ACTIONS
  // ==========================================
  const handleSelectTipoVenta = (tipo) => {
    setTipoVenta(tipo);
    if (tipo === 'mostrador') {
      setPasosCompletados(p => ({...p, tipoVenta: true}));
      setSeccionExpandida('flujo');
    } else {
      setModalListaPacientes(true);
    }
  };

  const handleSelectFlujo = (flujo) => {
    setFlujoActivo(flujo);
    setPasosCompletados(p => ({...p, flujo: true}));
    
    if (flujo === 'examen' || flujo === 'lentes' || flujo === 'contacto') {
      setSeccionExpandida('examen');
    } else if (flujo === 'accesorios') {
      setSeccionExpandida('accesorios');
    } else if (flujo === 'liquidar') {
      setSeccionExpandida('liquidar');
    }
  };

  const handleFinalizarExamen = async () => {
    let exFinalId = examenSeleccionado;
    
    // Si es examen de mostrador o se hizo uno nuevo, y no es uno existente
    if (examenSeleccionado === 'nuevo' && tipoVenta === 'paciente') {
       const newEx = await agregarExamen({ ...formExamen, pacienteId, fecha: new Date().toISOString().split('T')[0] });
       exFinalId = newEx.id || newEx.id_examen;
    }

    setPasosCompletados(p => ({...p, examen: true}));
    
    if (flujoActivo === 'examen') {
       // Agregar al carrito y terminar
       setCarrito([...carrito, { id: Date.now(), tipo: 'examen', precio: 150, examenId: exFinalId, datosMostrador, formExamen }]);
       setSeccionExpandida('finalizado');
    } else if (flujoActivo === 'lentes' || flujoActivo === 'contacto') {
       // Agregar al carrito GRATIS
       setCarrito([...carrito, { id: Date.now(), tipo: 'examen', precio: 0, examenId: exFinalId, formExamen, esGratis: true }]);
       setSeccionExpandida('configuracion');
    }
  };

  const handleFinalizarConfiguracion = () => {
    setPasosCompletados(p => ({...p, configuracion: true}));
    if (flujoActivo === 'lentes') {
      setSeccionExpandida('armazon');
    } else if (flujoActivo === 'contacto') {
      // Agregar Lentes de contacto al carrito
      const item = {
        id: Date.now(),
        tipo: 'lentes_contacto',
        frecuencia: frecuenciaLC,
        calidad: calidadLC,
        marca: marcaLC,
        material: materialSeleccionado ? materiales.find(m => String(m.id_material) === String(materialSeleccionado)) : null,
        precio: calcularPrecioConfig(),
        cantidadVenta: 1
      };
      setCarrito([...carrito, item]);
      setSeccionExpandida('finalizado');
    }
  };

  const handleFinalizarArmazon = () => {
    setPasosCompletados(p => ({...p, armazon: true}));
    
    // Agregar Armazon y Lentes al carrito
    const tratSel = tratamientoSeleccionado ? tratamientos.find(t => String(t.id_tratamiento) === String(tratamientoSeleccionado)) : null;
    const matSel = materialSeleccionado ? materiales.find(m => String(m.id_material) === String(materialSeleccionado)) : null;
    
    const micasItem = {
      id: Date.now() + 1,
      tipo: 'micas',
      material: matSel,
      tratamiento: tratSel,
      precio: calcularPrecioConfig(),
      cantidadVenta: 1
    };
    
    let armazonItem = null;
    if (armazonSeleccionado === 'propio') {
      armazonItem = { id: Date.now() + 2, tipo: 'armazon_propio', principal: { marca: 'Armazón propio del cliente', modelo: '', precio_unitario: 0 }, precio: 0, cantidadVenta: 1 };
    } else if (armazonSeleccionado) {
      armazonItem = { id: Date.now() + 2, tipo: 'producto', principal: armazonSeleccionado, precio: Number(armazonSeleccionado.precio_unitario) || 0, cantidadVenta: 1 };
    }

    setCarrito(prev => armazonItem ? [...prev, micasItem, armazonItem] : [...prev, micasItem]);
    setSeccionExpandida('finalizado');
  };

  const handleFinalizarAccesorios = () => {
    setPasosCompletados(p => ({...p, accesorios: true}));
    const newItems = accesoriosSeleccionados.map((a, idx) => ({
      id: Date.now() + idx,
      tipo: 'producto',
      principal: a.producto,
      precio: Number(a.producto.precio_unitario) || 0,
      cantidadVenta: a.cantidad
    }));
    setCarrito(prev => [...prev, ...newItems]);
    setSeccionExpandida('finalizado');
  };

  const handleFinalizarLiquidar = () => {
    setPasosCompletados(p => ({...p, liquidar: true}));
    const newItems = ventasPendientesSel.map((v, idx) => ({
      id: Date.now() + idx,
      tipo: 'abono',
      ventaId: v.id,
      saldoPendiente: v.saldoPendiente,
      fecha: v.fecha,
      precio: v.saldoPendiente, // By default pays full
      cantidadVenta: 1
    }));
    setCarrito(prev => [...prev, ...newItems]);
    setSeccionExpandida('finalizado');
  };

  const calcularPrecioConfig = () => {
    let sum = 0;
    if (materialSeleccionado) sum += 300; // Base micas dummy o precio real si existiera
    if (tratamientoSeleccionado) {
      const t = tratamientos.find(x => String(x.id_tratamiento) === String(tratamientoSeleccionado));
      if (t) sum += Number(t.costo_adicional) || 0;
    }
    return sum;
  };

  const toggleAccesorio = (prod) => {
    const existe = accesoriosSeleccionados.find(a => a.producto.id_producto === prod.id_producto);
    if (existe) {
      setAccesoriosSeleccionados(accesoriosSeleccionados.filter(a => a.producto.id_producto !== prod.id_producto));
    } else {
      setAccesoriosSeleccionados([...accesoriosSeleccionados, { producto: prod, cantidad: 1 }]);
    }
  };

  const updateAccesorioCant = (id, cant) => {
    if (cant < 1) return;
    setAccesoriosSeleccionados(prev => prev.map(a => a.producto.id_producto === id ? { ...a, cantidad: cant } : a));
  };


  // ==========================================
  // CHECKOUT & RENDER
  // ==========================================
  const registrarVentaEnSistema = async (mpData) => {
    const pObj = pacientes.find(p => String(p.id) === String(pacienteId));
    const pacienteNombre = pObj ? `${pObj.nombre} ${pObj.apellidos || ''}`.trim() : (datosMostrador.nombre || 'Mostrador');
    const ventaId = Date.now();
    const valAdelanto = esAbono ? (parseFloat(efectivoRecibido) || 0) : total;

    // Aplanar carrito para base de datos (simplificado)
    const productosPlanos = carrito.map(item => {
      if (item.tipo === 'micas') return { ...item.material, tratamiento: item.tratamiento, isMica: true, precioBase: item.precio };
      if (item.tipo === 'armazon_propio') return item.principal;
      if (item.tipo === 'producto') return { ...item.principal, cantidadVenta: item.cantidadVenta };
      if (item.tipo === 'examen') return { nombre: 'Examen Visual', precio_unitario: item.precio, isExamen: true };
      if (item.tipo === 'lentes_contacto') return { nombre: `Lente Contacto ${item.marca}`, frecuencia: item.frecuencia, calidad: item.calidad, precio_unitario: item.precio };
      if (item.tipo === 'abono') return { nombre: `Abono a Folio #${item.ventaId}`, precio_unitario: item.precio, isAbono: true };
      return item;
    });

    // Encontrar el examen a guardar (si hay uno principal)
    let examenIdAGuardar = null;
    let graduacionAGuardar = '';
    const examenCart = carrito.find(i => i.tipo === 'examen');
    if (examenCart) {
      if (examenCart.examenId !== 'nuevo' && examenCart.examenId) {
        examenIdAGuardar = examenCart.examenId;
      } else {
        graduacionAGuardar = JSON.stringify(examenCart.formExamen);
      }
    }

    const venta = {
      id: ventaId,
      pacienteId: pacienteId || null,
      examenId: examenIdAGuardar,
      productos: productosPlanos,
      detallesLentes: { config: carrito }, // Guardamos el carrito crudo para poder renderizarlo bien
      consulta: observaciones,
      lentesTerminados: false,
      motivoNoTerminado: 'Pendiente',
      subtotalCarrito: subtotalGeneral,
      descuento: descuentoMonto,
      total,
      adelanto: valAdelanto,
      saldoPendiente: Math.max(0, total - valAdelanto),
      estadoPago: valAdelanto >= total ? 'Pagado' : 'Pendiente',
      graduacion: graduacionAGuardar,
      metodoPago,
      requiereFactura,
      examenData: examenCart && examenCart.examenId !== 'nuevo' ? examenes.find(e => String(e.id_examen) === String(examenCart.examenId)) : (examenCart ? examenCart.formExamen : null)
    };

    await registrarVenta(venta);

    // Procesar Abonos si existen
    const abonos = carrito.filter(i => i.tipo === 'abono');
    for (const ab of abonos) {
      await actualizarPagoVenta(ab.ventaId, valAdelanto); // Simplificado
    }

    // Correo y ticket
    const correoDest = pObj?.correo || datosMostrador.correo;
    if (correoDest) {
      enviarCorreoConfirmacionPedido({
        correoDestino: correoDest, nombreCliente: pacienteNombre,
        productos: carrito, subtotal: subtotalCarrito, total: total,
        adelanto: valAdelanto, saldoPendiente: venta.saldoPendiente, pedidoId: ventaId,
        examenData: venta.examenData
      });
    }

    const htmlTicket = generarTicketVentaHTML({ ...venta, fecha: new Date().toISOString() }, pacienteNombre, carrito);
    setTicketHtml(htmlTicket);
    
    if (examenCart && examenCart.formExamen && String(examenCart.examenId) === 'nuevo') {
      setModalExamenCompletado({
        examen: examenCart.formExamen,
        pacienteNombre: pacienteNombre,
        correo: correoDest
      });
      // Limpiamos todo menos el paciente para que el UI de fondo no se vea raro
      setCarrito([]);
      setDescuentoValor('');
      setEfectivoRecibido('');
    } else {
      setCarrito([]);
      setDescuentoValor('');
      setEfectivoRecibido('');
      resetWizard(false);
    }
  };

  const handleCrearPaciente = async (datos) => {
    try {
      setFormError(null);
      const nuevo = await agregarPaciente(datos);
      setPacienteId(nuevo.id);
      setModalRegistroPaciente(false);
      setModalListaPacientes(false);
      setPasosCompletados(x => ({...x, tipoVenta: true}));
      setSeccionExpandida('flujo');
    } catch (e) {
      console.error('Error registrando paciente:', e);
      try {
        const errObj = JSON.parse(e.message);
        if (errObj.type === 'validation') {
          setFormError({ field: errObj.field, message: errObj.message });
        } else {
          alert('Error: ' + e.message);
        }
      } catch (parseErr) {
        alert('Error registrando paciente: ' + e.message);
      }
    }
  };

  const handleProcesar = async () => {
    if (carrito.length === 0 && subtotalGeneral === 0) return alert('No hay nada para cobrar.');
    
    if (esAbono) {
      const minAbono = total * 0.2;
      const montoEfectivo = Number(efectivoRecibido);
      if (!efectivoRecibido || isNaN(montoEfectivo)) {
        return alert('Por favor ingresa un monto válido para el pago a cuenta.');
      }
      if (montoEfectivo < minAbono) {
        return alert(`El pago a cuenta debe ser igual o mayor al 20% del total ($${minAbono.toFixed(2)}).`);
      }
      if (montoEfectivo > total) {
        return alert(`El monto a cuenta no puede ser mayor al total a pagar ($${total.toFixed(2)}).`);
      }
    }

    if (metodoPago === 'Crédito' || metodoPago === 'Débito') {
      setModalMercadoPago(true);
      return;
    }
    await registrarVentaEnSistema();
  };

  // --- RENDER HELPERS ---
  let pasoActual = 1;
  if (pasosCompletados.tipoVenta) pasoActual = 2;
  if (pasosCompletados.flujo) pasoActual = 3;
  if (pasosCompletados.examen) pasoActual = 4;
  if (pasosCompletados.configuracion) pasoActual = 5;

  const renderAcordeonHeader = (titulo, paso, id_seccion, summary = '') => {
    const isCompleted = pasosCompletados[id_seccion];
    const isExpanded = seccionExpandida === id_seccion;
    const canExpand = paso <= (pasoActual + 1); // Simplificado
    
    return (
      <div 
        onClick={() => { if(isCompleted || canExpand) setSeccionExpandida(isExpanded ? '' : id_seccion) }}
        style={{ 
          padding: '1rem', backgroundColor: isCompleted ? '#ecfdf5' : isExpanded ? '#eff6ff' : 'white', 
          borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: (isCompleted || canExpand) ? 'pointer' : 'default'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isCompleted ? <CheckCircle size={20} color="#10b981" /> : <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: isExpanded ? '#3b82f6' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'normal' }}>{paso}</div>}
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: isExpanded ? '#1e293b' : '#64748b' }}>{titulo}</h3>
            {summary && !isExpanded && <div style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.2rem' }}>{summary}</div>}
          </div>
        </div>
        {(isCompleted || canExpand) && (
          isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />
        )}
      </div>
    );
  };

  const pacienteObj = pacienteId ? pacientes.find(p => String(p.id) === String(pacienteId)) : null;

  return (
    <ErrorBoundary>
      {ticketHtml ? (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: '#1e293b' }}>Ticket de Venta Generado</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => {
                  const ventana = window.open('', '_blank', 'width=700,height=850');
                  if (ventana) {
                    ventana.document.write(ticketHtml + '<script>window.print()</script>');
                    ventana.document.close();
                  } else {
                    alert('Permite las ventanas emergentes para imprimir.');
                  }
                }}
                style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 'normal', cursor: 'pointer' }}>
                Imprimir en PDF
              </button>
              <button 
                onClick={() => {
                  setTicketHtml(null);
                  handleCancelarCompra();
                }}
                style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal', cursor: 'pointer' }}>
                Nueva Venta
              </button>
            </div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <iframe 
              srcDoc={ticketHtml} 
              style={{ width: '100%', height: '800px', border: 'none' }} 
              title="Ticket"
            />
          </div>
        </div>
      ) : (
      <div style={{ display: 'flex', height: 'calc(100vh - 64px)', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      
      {/* ==================================================== */}
      {/* COLUMNA IZQUIERDA: WIZARD DE FLUJOS                  */}
      {/* ==================================================== */}
      <div style={{ flex: '7', display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>
        
        {/* PASO 1: Selección de Cliente */}
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
          {renderAcordeonHeader('Tipo de Venta / Cliente', 1, 'tipoVenta', tipoVenta === 'mostrador' ? 'Venta de Mostrador' : pacienteObj ? `Paciente: ${pacienteObj.nombre}` : '')}
          
          {seccionExpandida === 'tipoVenta' && (
            <div style={{ padding: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => handleSelectTipoVenta('paciente')} style={{ flex: 1, padding: '2rem', borderRadius: '12px', border: '2px solid', borderColor: tipoVenta === 'paciente' ? '#3b82f6' : '#e2e8f0', backgroundColor: tipoVenta === 'paciente' ? '#eff6ff' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }}>
                <User size={48} color={tipoVenta === 'paciente' ? '#3b82f6' : '#94a3b8'} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'normal', color: '#1e293b' }}>Selección de Paciente</span>
              </button>
              <button onClick={() => handleSelectTipoVenta('mostrador')} style={{ flex: 1, padding: '2rem', borderRadius: '12px', border: '2px solid', borderColor: tipoVenta === 'mostrador' ? '#3b82f6' : '#e2e8f0', backgroundColor: tipoVenta === 'mostrador' ? '#eff6ff' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }}>
                <ScanFace size={48} color={tipoVenta === 'mostrador' ? '#3b82f6' : '#94a3b8'} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'normal', color: '#1e293b' }}>Venta de Mostrador</span>
              </button>
            </div>
          )}
        </div>

        {/* PASO 2: Selección de Flujo */}
        {pasosCompletados.tipoVenta && (
          <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
            {renderAcordeonHeader('¿Qué desea realizar?', 2, 'flujo', flujoActivo ? flujoActivo.toUpperCase() : '')}
            
            {seccionExpandida === 'flujo' && (
              <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {tipoVenta === 'mostrador' && (
                  <button onClick={() => handleSelectFlujo('examen')} style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'normal', color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}><ClipboardList size={32} style={{marginBottom:'0.5rem', color:'#3b82f6'}}/><br/>Solo Examen Visual</button>
                )}
                
                {tipoVenta === 'paciente' && (
                  <>
                    <button onClick={() => handleSelectFlujo('lentes')} style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'normal', color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}><Eye size={32} style={{marginBottom:'0.5rem', color:'#8b5cf6'}}/><br/>Lentes</button>
                    <button onClick={() => handleSelectFlujo('contacto')} style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'normal', color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}><ScanFace size={32} style={{marginBottom:'0.5rem', color:'#10b981'}}/><br/>Lentes de Contacto</button>
                  </>
                )}
                
                <button onClick={() => handleSelectFlujo('accesorios')} style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'normal', color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}><PackageOpen size={32} style={{marginBottom:'0.5rem', color:'#f59e0b'}}/><br/>Accesorios</button>
                
                {tipoVenta === 'paciente' && (
                  <button onClick={() => handleSelectFlujo('liquidar')} style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'normal', color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}><Banknote size={32} style={{marginBottom:'0.5rem', color:'#ef4444'}}/><br/>Liquidar Pago</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 3+: Dinámicos según el flujo */}
        
        {/* === EXAMEN VISUAL === */}
        {(flujoActivo === 'examen' || flujoActivo === 'lentes' || flujoActivo === 'contacto') && (
          <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
            {renderAcordeonHeader('Examen Visual', 3, 'examen', pasosCompletados.examen ? 'Completado' : '')}
            
            {seccionExpandida === 'examen' && (
              <div style={{ padding: '1.5rem' }}>
                {tipoVenta === 'mostrador' && (
                  <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <input type="text" placeholder="Nombre completo" value={datosMostrador.nombre} onChange={e=>setDatosMostrador({...datosMostrador, nombre: e.target.value})} style={{flex:1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1'}} />
                    <input type="number" placeholder="Edad" value={datosMostrador.edad} onChange={e=>setDatosMostrador({...datosMostrador, edad: e.target.value})} style={{width: '80px', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1'}} />
                    <input type="email" placeholder="Correo (opcional)" value={datosMostrador.correo} onChange={e=>setDatosMostrador({...datosMostrador, correo: e.target.value})} style={{flex:1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1'}} />
                  </div>
                )}
                
                {tipoVenta === 'paciente' && examenesPaciente.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontWeight: 'normal', display: 'block', marginBottom: '0.5rem' }}>Seleccionar Examen Existente</label>
                    <select value={examenSeleccionado} onChange={(e) => setExamenSeleccionado(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }}>
                      <option value="">-- Seleccionar --</option>
                      <option value="nuevo">+ Realizar Nuevo Examen</option>
                      {examenesPaciente.map(ex => (
                        <option key={ex.id} value={ex.id}>Fecha: {ex.fecha} - DP: {ex.dp}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(tipoVenta === 'mostrador' || examenSeleccionado === 'nuevo' || examenesPaciente.length === 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#1d4ed8', borderBottom: '2px solid #93c5fd', paddingBottom: '0.5rem' }}>Ojo Derecho (OD)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Esfera</label><input type="number" step="0.25" value={formExamen.od.esfera} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, esfera: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                          <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Cilindro</label><input type="number" step="0.25" value={formExamen.od.cilindro} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, cilindro: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                          <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontSize: '0.8rem' }}>Eje</label><input type="number" min="0" max="180" value={formExamen.od.eje} onChange={e => setFormExamen({...formExamen, od: {...formExamen.od, eje: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                        </div>
                      </div>
                      <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#1d4ed8', borderBottom: '2px solid #93c5fd', paddingBottom: '0.5rem' }}>Ojo Izquierdo (OS)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Esfera</label><input type="number" step="0.25" value={formExamen.oi.esfera} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, esfera: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                          <div><label style={{ display: 'block', fontSize: '0.8rem' }}>Cilindro</label><input type="number" step="0.25" value={formExamen.oi.cilindro} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, cilindro: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                          <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontSize: '0.8rem' }}>Eje</label><input type="number" min="0" max="180" value={formExamen.oi.eje} onChange={e => setFormExamen({...formExamen, oi: {...formExamen.oi, eje: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div><label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'normal', color: '#334155', marginBottom: '0.5rem' }}>Adición</label><input type="number" step="0.25" value={formExamen.adicion} onChange={e => setFormExamen({...formExamen, adicion: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                      <div><label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'normal', color: '#334155', marginBottom: '0.5rem' }}>Distancia Interpupilar (DP)</label><input type="text" value={formExamen.dp} onChange={e => setFormExamen({...formExamen, dp: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                      <div><label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'normal', color: '#334155', marginBottom: '0.5rem' }}>Altura Pupilar (AP)</label><input type="text" value={formExamen.ap} onChange={e => setFormExamen({...formExamen, ap: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button onClick={handleFinalizarExamen} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'normal', cursor: 'pointer' }}>
                    {flujoActivo === 'examen' ? 'Finalizar y Agregar al Carrito' : 'Guardar Examen y Continuar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === MATERIAL Y PROTECCION (Lentes) / ATRIBUTOS (Contacto) === */}
        {(flujoActivo === 'lentes' || flujoActivo === 'contacto') && pasosCompletados.examen && (
          <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
            {renderAcordeonHeader(flujoActivo === 'lentes' ? 'Material y Protección' : 'Configuración Lentes de Contacto', 4, 'configuracion', pasosCompletados.configuracion ? 'Completado' : '')}
            
            {seccionExpandida === 'configuracion' && (
              <div style={{ padding: '1.5rem' }}>
                {flujoActivo === 'lentes' ? (
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    {/* Selectores de Material y Tratamiento similares a los originales */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ marginBottom: '0.5rem', color: '#475569' }}>Material</h4>
                      <select value={materialSeleccionado} onChange={e=>setMaterialSeleccionado(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="">Seleccionar...</option>
                        {materiales.map(m => <option key={m.id_material} value={m.id_material}>{m.nombre}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ marginBottom: '0.5rem', color: '#475569' }}>Tratamiento</h4>
                      <select value={tratamientoSeleccionado} onChange={e=>setTratamientoSeleccionado(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="">Ninguno</option>
                        {tratamientos.map(t => <option key={t.id_tratamiento} value={t.id_tratamiento}>{t.nombre} (+${t.costo_adicional})</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 'normal', marginBottom: '0.5rem' }}>Marca</label>
                      <input type="text" value={marcaLC} onChange={e=>setMarcaLC(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 'normal', marginBottom: '0.5rem' }}>Frecuencia de Reemplazo</label>
                      <select value={frecuenciaLC} onChange={e=>setFrecuenciaLC(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="">Seleccionar...</option><option value="Diario">Diario</option><option value="Quincenal">Quincenal</option><option value="Mensual">Mensual</option><option value="Anual">Anual</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 'normal', marginBottom: '0.5rem' }}>Calidad</label>
                      <select value={calidadLC} onChange={e=>setCalidadLC(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="">Seleccionar...</option><option value="Estandar">Estándar</option><option value="Premium">Premium</option>
                      </select>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button onClick={handleFinalizarConfiguracion} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'normal', cursor: 'pointer' }}>
                    {flujoActivo === 'lentes' ? 'Continuar a Armazones' : 'Finalizar y Agregar al Carrito'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === SELECCION ARMAZON (Lentes) === */}
        {flujoActivo === 'lentes' && pasosCompletados.configuracion && (
          <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
            {renderAcordeonHeader('Selección de Armazón', 5, 'armazon', pasosCompletados.armazon ? 'Completado' : '')}
            
            {seccionExpandida === 'armazon' && (
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button onClick={() => setArmazonSeleccionado('propio')} style={{ flex: 1, padding: '1rem', border: '2px solid', borderColor: armazonSeleccionado === 'propio' ? '#10b981' : '#e2e8f0', borderRadius: '8px', backgroundColor: armazonSeleccionado === 'propio' ? '#ecfdf5' : 'white', cursor: 'pointer', fontWeight: 'normal' }}>
                    Armazón Propio del Cliente
                  </button>
                  <div style={{ flex: 2, display: 'flex', gap: '1rem' }}>
                    <select 
                      value={filtroMarcaArmazon} 
                      onChange={e => { setFiltroMarcaArmazon(e.target.value); setFiltroModeloArmazon(''); }}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
                    >
                      <option value="">Todas las marcas</option>
                      {[...new Set(productos.filter(p => p.tipo_articulo === 'armazon' && p.cantidad_inventario > 0).map(p => p.marca))].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    <select 
                      value={filtroModeloArmazon} 
                      onChange={e => setFiltroModeloArmazon(e.target.value)}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
                    >
                      <option value="">Todos los modelos</option>
                      {[...new Set(productos.filter(p => p.tipo_articulo === 'armazon' && p.cantidad_inventario > 0 && (!filtroMarcaArmazon || p.marca === filtroMarcaArmazon)).map(p => p.modelo))].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {productos.filter(p => 
                    p.tipo_articulo === 'armazon' && 
                    p.cantidad_inventario > 0 && 
                    (!filtroMarcaArmazon || p.marca === filtroMarcaArmazon) &&
                    (!filtroModeloArmazon || p.modelo === filtroModeloArmazon)
                  ).map(prod => (
                    <div key={prod.id_producto} onClick={() => setArmazonSeleccionado(prod)} style={{ border: '2px solid', borderColor: armazonSeleccionado?.id_producto === prod.id_producto ? '#3b82f6' : '#e2e8f0', borderRadius: '8px', padding: '0.75rem', cursor: 'pointer', textAlign: 'center', backgroundColor: armazonSeleccionado?.id_producto === prod.id_producto ? '#eff6ff' : 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {prod.ruta_imagen ? (
                        <img src={prod.ruta_imagen} alt={prod.modelo} style={{ width: '100%', height: '80px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                      ) : (
                        <div style={{ width: '100%', height: '80px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', borderRadius: '4px', color: '#94a3b8', fontSize: '0.8rem' }}>Sin imagen</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 'normal', fontSize: '0.85rem', color: '#1e293b' }}>{prod.marca}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{prod.modelo}</div>
                        <div style={{ color: '#10b981', fontWeight: 'normal', marginTop: '0.5rem' }}>${prod.precio_unitario}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button disabled={!armazonSeleccionado} onClick={handleFinalizarArmazon} style={{ backgroundColor: armazonSeleccionado ? '#3b82f6' : '#cbd5e1', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'normal', cursor: armazonSeleccionado ? 'pointer' : 'not-allowed' }}>
                    Finalizar y Agregar al Carrito
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === ACCESORIOS === */}
        {flujoActivo === 'accesorios' && (
          <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
            {renderAcordeonHeader('Catálogo de Accesorios', 3, 'accesorios', pasosCompletados.accesorios ? 'Completado' : '')}
            
            {seccionExpandida === 'accesorios' && (
              <div style={{ padding: '1.5rem' }}>
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" placeholder="Buscar accesorio..." value={busquedaAccesorios} onChange={e=>setBusquedaAccesorios(e.target.value)} style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {productos.filter(p => p.tipo_articulo === 'accesorio' && p.cantidad_inventario > 0 && (`${p.marca} ${p.modelo}`.toLowerCase().includes(busquedaAccesorios.toLowerCase()))).map(prod => {
                    const sel = accesoriosSeleccionados.find(a => a.producto.id_producto === prod.id_producto);
                    return (
                      <div key={prod.id_producto} style={{ border: '2px solid', borderColor: sel ? '#10b981' : '#e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: sel ? '#ecfdf5' : 'white' }}>
                        <div style={{ fontWeight: 'normal', color: '#1e293b' }}>{prod.marca} {prod.modelo}</div>
                        <div style={{ color: '#10b981', fontWeight: 'normal', margin: '0.5rem 0' }}>${prod.precio_unitario}</div>
                        
                        {sel ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="number" min="1" value={sel.cantidad} onChange={e=>updateAccesorioCant(prod.id_producto, parseInt(e.target.value)||1)} style={{ width: '60px', padding: '0.25rem', textAlign: 'center' }} />
                            <button onClick={()=>toggleAccesorio(prod)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={18}/></button>
                          </div>
                        ) : (
                          <button onClick={()=>toggleAccesorio(prod)} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'normal' }}>Seleccionar</button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button disabled={accesoriosSeleccionados.length === 0} onClick={handleFinalizarAccesorios} style={{ backgroundColor: accesoriosSeleccionados.length > 0 ? '#3b82f6' : '#cbd5e1', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'normal', cursor: accesoriosSeleccionados.length > 0 ? 'pointer' : 'not-allowed' }}>
                    Finalizar y Agregar al Carrito
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === LIQUIDAR PAGO === */}
        {flujoActivo === 'liquidar' && (
          <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
            {renderAcordeonHeader('Ventas Pendientes', 3, 'liquidar', pasosCompletados.liquidar ? 'Completado' : '')}
            
            {seccionExpandida === 'liquidar' && (
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {ventas.filter(v => String(v.pacienteId) === String(pacienteId) && v.estadoPago === 'Pendiente').length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px' }}>No hay ventas pendientes para este paciente.</div>
                  ) : (
                    ventas.filter(v => String(v.pacienteId) === String(pacienteId) && v.estadoPago === 'Pendiente').map(v => {
                      const sel = ventasPendientesSel.find(vp => vp.id === v.id);
                      return (
                        <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid', borderColor: sel ? '#3b82f6' : '#e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: sel ? '#eff6ff' : 'white' }}>
                          <input type="checkbox" checked={!!sel} onChange={(e) => {
                            if (e.target.checked) setVentasPendientesSel([...ventasPendientesSel, v]);
                            else setVentasPendientesSel(ventasPendientesSel.filter(vp => vp.id !== v.id));
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'normal' }}>Folio #{v.id}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Fecha: {new Date(v.fecha).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#ef4444', fontWeight: 'normal' }}>Saldo: ${v.saldoPendiente}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total original: ${v.total}</div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button disabled={ventasPendientesSel.length === 0} onClick={handleFinalizarLiquidar} style={{ backgroundColor: ventasPendientesSel.length > 0 ? '#3b82f6' : '#cbd5e1', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'normal', cursor: ventasPendientesSel.length > 0 ? 'pointer' : 'not-allowed' }}>
                    Finalizar y Agregar al Carrito
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === FINALIZADO / EXTRA === */}
        {seccionExpandida === 'finalizado' && (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <CheckCircle size={64} color="#10b981" style={{ marginBottom: '1rem' }} />
            <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>¡Producto agregado al carrito!</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>Puedes proceder al pago o agregar más productos a esta misma venta.</p>
            <button onClick={handleAddExtra} style={{ backgroundColor: '#f1f5f9', color: '#3b82f6', border: '2px solid #3b82f6', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'normal', cursor: 'pointer', fontSize: '1.1rem' }}>
              + Añadir Producto Extra
            </button>
          </div>
        )}

        <div style={{ padding: '1.5rem', marginTop: 'auto' }}>
          <button onClick={handleCancelarCompra} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'normal', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            Cancelar Compra
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* COLUMNA DERECHA: CARRITO DE COMPRAS                  */}
      {/* ==================================================== */}
      <div style={{ flex: '3', minWidth: '350px', maxWidth: '400px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%', position: 'sticky', top: 0 }}>
        
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={24} color="#3b82f6" /> Carrito de Compras
          </h2>
          {pacienteObj && <div style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 'normal' }}>Paciente: {pacienteObj.nombre} {pacienteObj.apellidos}</div>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {checkoutActivo ? (
            <div>
              <button onClick={() => setCheckoutActivo(false)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textAlign: 'left', marginBottom: '1.5rem', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Volver al Carrito
              </button>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                <span>Subtotal</span><span>${subtotalGeneral.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#64748b' }}>
                <span>Descuento</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select value={descuentoTipo} onChange={e=>setDescuentoTipo(e.target.value)} style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <option value="none">Sin Desc.</option><option value="percent">%</option><option value="fixed">$</option>
                  </select>
                  {descuentoTipo !== 'none' && <input type="number" value={descuentoValor} onChange={e=>setDescuentoValor(e.target.value)} style={{ width: '60px', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'normal', color: '#1e293b' }}>Total a Pagar</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'normal', color: '#10b981' }}>${total.toLocaleString()}</span>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Método de Pago</label>
                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', backgroundColor: 'white' }}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Crédito">Tarjeta de Crédito</option>
                  <option value="Débito">Tarjeta de Débito</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Tipo de Pago</label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input type="radio" name="tipoAbono" checked={!esAbono} onChange={() => setEsAbono(false)} /> Completo
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input type="radio" name="tipoAbono" checked={esAbono} onChange={() => setEsAbono(true)} /> A cuenta
                  </label>
                </div>
                {esAbono && (
                  <div style={{ marginTop: '0.5rem', backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#1e40af', display: 'block', marginBottom: '0.25rem' }}>
                      Monto a cuenta (Min. 20%: $${(total * 0.2).toFixed(2)})
                    </label>
                    <input 
                      type="number" 
                      value={efectivoRecibido} 
                      onChange={e => setEfectivoRecibido(e.target.value)} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bfdbfe', fontSize: '1rem' }} 
                      placeholder={`Mínimo: ${(total * 0.2).toFixed(2)}`}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="req-factura" 
                  checked={requiereFactura} 
                  onChange={e => setRequiereFactura(e.target.checked)} 
                  style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                />
                <label htmlFor="req-factura" style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#334155', cursor: 'pointer' }}>¿Requiere Factura?</label>
              </div>
            </div>
          ) : carrito.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '3rem' }}>El carrito está vacío</div>
          ) : (
            carrito.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                {item.tipo === 'examen' ? (
                   <div style={{ width: 50, height: 50, borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardList color="#3b82f6" /></div>
                ) : item.tipo === 'micas' ? (
                   <div style={{ width: 50, height: 50, borderRadius: '8px', backgroundColor: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye color="#d946ef" /></div>
                ) : item.tipo === 'armazon_propio' ? (
                   <div style={{ width: 50, height: 50, borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Tag color="#10b981" /></div>
                ) : item.tipo === 'abono' ? (
                   <div style={{ width: 50, height: 50, borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Banknote color="#d97706" /></div>
                ) : item.principal?.ruta_imagen ? (
                   <img src={item.principal.ruta_imagen} alt="Img" style={{ width: 50, height: 50, borderRadius: '8px', objectFit: 'contain', border: '1px solid #e2e8f0' }} />
                ) : (
                   <div style={{ width: 50, height: 50, borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon color="#94a3b8" /></div>
                )}
                
                <div style={{ flex: 1 }}>
                  {item.tipo === 'examen' && <div style={{ fontWeight: 'normal', color: '#1e293b' }}>Examen Visual {item.esGratis && '(Incluido)'}</div>}
                  {item.tipo === 'micas' && <div style={{ fontWeight: 'normal', color: '#1e293b' }}>Micas: {item.material?.nombre} {item.tratamiento ? `+ ${item.tratamiento.nombre}`:''}</div>}
                  {item.tipo === 'armazon_propio' && <div style={{ fontWeight: 'normal', color: '#1e293b' }}>Armazón propio del cliente</div>}
                  {item.tipo === 'producto' && <div style={{ fontWeight: 'normal', color: '#1e293b' }}>{item.principal.marca} {item.principal.modelo} (x{item.cantidadVenta})</div>}
                  {item.tipo === 'lentes_contacto' && <div style={{ fontWeight: 'normal', color: '#1e293b' }}>Lentes de Contacto {item.marca}</div>}
                  {item.tipo === 'abono' && (
                    <div>
                      <div style={{ fontWeight: 'normal', color: '#1e293b' }}>Saldo Pendiente</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Pedido del: {item.fecha ? new Date(item.fecha).toLocaleDateString() : 'Folio #' + item.ventaId}</div>
                    </div>
                  )}
                  
                  <div style={{ color: '#10b981', fontWeight: 'normal', marginTop: '0.25rem' }}>${item.esGratis ? '0' : Number(item.precio * (item.cantidadVenta||1)).toLocaleString()}</div>
                </div>
                <button onClick={() => setCarrito(prev => prev.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}><X size={16} /></button>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          {!checkoutActivo && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                <span>Subtotal</span><span>${subtotalGeneral.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'normal', color: '#1e293b' }}>Total a Pagar</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'normal', color: '#10b981' }}>${total.toLocaleString()}</span>
              </div>
            </>
          )}

          {checkoutActivo ? (
            <button onClick={handleProcesar} disabled={carrito.length === 0} style={{ width: '100%', backgroundColor: '#10b981', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 'normal', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}>
              Confirmar Pago <ArrowRight size={20} />
            </button>
          ) : (
            <button onClick={() => setCheckoutActivo(true)} disabled={carrito.length === 0} style={{ width: '100%', backgroundColor: carrito.length > 0 ? '#3b82f6' : '#94a3b8', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 'normal', fontSize: '1.1rem', cursor: carrito.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)' }}>
              Proceder al Pago <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Modales de búsqueda y Mercado Pago (Simplificados para esta vista) */}
      {modalListaPacientes && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Seleccionar Paciente</h2>
              <button onClick={() => setModalListaPacientes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <input type="text" placeholder="Buscar paciente..." value={busquedaLista} onChange={e => setBusquedaLista(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem' }} />
            
            <button onClick={() => { setModalRegistroPaciente(true); setModalListaPacientes(false); }} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px dashed #6366f1', borderRadius: '8px', fontWeight: 'normal', cursor: 'pointer', marginBottom: '1.5rem' }}>
              + Crear Nuevo Registro
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pacientes.filter(p => `${p.nombre} ${p.apellidos||''}`.toLowerCase().includes(busquedaLista.toLowerCase())).map(p => (
                <div key={p.id} onClick={() => { setPacienteId(p.id); setModalListaPacientes(false); setPasosCompletados(x => ({...x, tipoVenta: true})); setSeccionExpandida('flujo'); }} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                  {p.nombre} {p.apellidos}<br/>
                  <small style={{ color: '#64748b' }}>{p.telefono} • {p.correo}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalMercadoPago && <ModalMercadoPago 
        monto={total} ordenId={mpOrdenActual?.id} onCancel={() => setModalMercadoPago(false)} 
        onSuccess={() => { setModalMercadoPago(false); registrarVentaEnSistema({id: mpOrdenActual?.id, status: 'approved'}); }}
        crearOrdenMercadoPago={crearOrdenMercadoPago}
        simularEventoMercadoPago={simularEventoMercadoPago}
        obtenerOrdenMercadoPago={obtenerOrdenMercadoPago}
      />}

      {/* Modal Crear Nuevo Paciente */}
      {modalRegistroPaciente && (
        <FormularioPaciente 
          onGuardar={handleCrearPaciente} 
          onCancelar={() => { setModalRegistroPaciente(false); setFormError(null); }} 
          error={formError}
        />
      )}

      {/* Modal Post-Venta Examen */}
      {modalExamenCompletado && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '450px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><CheckCircle size={48} color="#10b981" /></div>
            <h2 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Venta y Examen Completados</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>¿Qué deseas hacer con la receta óptica del paciente {modalExamenCompletado.pacienteNombre}?</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                onClick={async () => {
                  try {
                    const btn = document.getElementById('btn-enviar-pdf');
                    btn.innerText = 'Enviando...';
                    btn.disabled = true;
                    await enviarExamenPorCorreo(modalExamenCompletado.correo || 'correo@ejemplo.com', modalExamenCompletado.pacienteNombre, modalExamenCompletado.examen);
                    btn.innerText = '¡Enviado!';
                    btn.style.backgroundColor = '#10b981';
                    setTimeout(() => {
                      setModalExamenCompletado(null);
                      handleCancelarCompra();
                    }, 1500);
                  } catch (e) {
                    alert('Error enviando correo: ' + e.message);
                    const btn = document.getElementById('btn-enviar-pdf');
                    btn.innerText = 'Enviar por Correo';
                    btn.disabled = false;
                  }
                }} 
                id="btn-enviar-pdf"
                style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                Enviar por Correo en PDF
              </button>
              
              <button 
                onClick={() => {
                  import('../../utils/ticketGenerator').then(mod => {
                    mod.generarExamenVisualHTML(modalExamenCompletado.examen, modalExamenCompletado.pacienteNombre);
                    setModalExamenCompletado(null);
                    handleCancelarCompra();
                  });
                }} 
                style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '8px', fontWeight: 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                🖨️ Imprimir Receta
              </button>

              <button 
                onClick={() => {
                  setModalExamenCompletado(null);
                  handleCancelarCompra();
                }} 
                style={{ backgroundColor: 'transparent', color: '#94a3b8', border: 'none', padding: '0.75rem', fontWeight: 'normal', cursor: 'pointer', marginTop: '0.5rem' }}
              >
                Cerrar (No hacer nada)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    )}
    </ErrorBoundary>
  );
};

export default PuntoDeVenta;
