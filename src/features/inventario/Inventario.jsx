import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Package, Image as ImageIcon, Check, Glasses, Eye, Box } from 'lucide-react';
import MatrizMicas from './MatrizMicas';

const Inventario = () => {
  const { productos, materiales, tratamientos, agregarProducto, editarProducto, subirImagen, agregarMaterial, agregarTratamiento } = useDatabase();
  const { isManager } = useAuth();
  
  const [tab, setTab] = useState('productos');
  const [mensaje, setMensaje] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  // === ESTADOS PARA PRODUCTO ===
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [tipoArticulo, setTipoArticulo] = useState('armazon');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cantidad, setCantidad] = useState(0);
  const [precio, setPrecio] = useState(0);
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [imagenPreview, setImagenPreview] = useState('');
  const [rutaImagenExistente, setRutaImagenExistente] = useState('');

  // Estados Armazon
  const [color, setColor] = useState('');
  const [materialArmazon, setMaterialArmazon] = useState('');
  const [medidaPuente, setMedidaPuente] = useState('');
  const [medidaVarilla, setMedidaVarilla] = useState('');

  // Estados Lentes de Contacto
  const [curvaBase, setCurvaBase] = useState('');
  const [diametro, setDiametro] = useState('');
  const [poderEsferico, setPoderEsferico] = useState('');
  const [diasReemplazo, setDiasReemplazo] = useState('');
  const [fechaCaducidad, setFechaCaducidad] = useState('');

  // Estados Cristales
  const [idMaterialCristal, setIdMaterialCristal] = useState('');
  const [esfera, setEsfera] = useState('');
  const [cilindro, setCilindro] = useState('');
  const [eje, setEje] = useState('');
  const [adicion, setAdicion] = useState('');
  const [tipoLente, setTipoLente] = useState('monofocal');
  const [tratamientosSel, setTratamientosSel] = useState([]);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');

  // === ESTADOS PARA CATALOGOS ===
  const [nuevoMatNombre, setNuevoMatNombre] = useState('');
  const [nuevoMatDesc, setNuevoMatDesc] = useState('');
  const [nuevoTratNombre, setNuevoTratNombre] = useState('');
  const [nuevoTratDesc, setNuevoTratDesc] = useState('');
  const [nuevoTratCosto, setNuevoTratCosto] = useState(0);

  const mostrarMensaje = (msg) => {
    setMensaje(msg);
    setTimeout(() => setMensaje(''), 3000);
  };

  const resetForm = () => {
    setEditandoId(null);
    setMostrarFormulario(false);
    setTipoArticulo('armazon');
    setMarca(''); setModelo(''); setCantidad(0); setPrecio(0);
    setArchivoImagen(null); setImagenPreview(''); setRutaImagenExistente('');
    setColor(''); setMaterialArmazon(''); setMedidaPuente(''); setMedidaVarilla('');
    setCurvaBase(''); setDiametro(''); setPoderEsferico(''); setDiasReemplazo(''); setFechaCaducidad('');
    setIdMaterialCristal(''); setEsfera(''); setCilindro(''); setEje(''); setAdicion(''); setTipoLente('monofocal'); setTratamientosSel([]);
  };

  const handleArchivoCambio = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivoImagen(file);
      setImagenPreview(URL.createObjectURL(file));
    }
  };

  const toggleTratamiento = (tId) => {
    if (tratamientosSel.includes(tId)) {
      setTratamientosSel(tratamientosSel.filter(id => id !== tId));
    } else {
      setTratamientosSel([...tratamientosSel, tId]);
    }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!marca) return mostrarMensaje('La marca es obligatoria.');

    let ruta_imagen = rutaImagenExistente;
    if (archivoImagen) {
      const urlSubida = await subirImagen(archivoImagen);
      if (urlSubida) ruta_imagen = urlSubida;
      else return mostrarMensaje('Error subiendo imagen.');
    }

    const payload = {
      tipo_articulo: tipoArticulo,
      marca,
      modelo,
      cantidad_inventario: parseInt(cantidad) || 0,
      precio_unitario: parseFloat(precio) || 0,
      ruta_imagen
    };

    if (tipoArticulo === 'armazon') {
      Object.assign(payload, { color, material: materialArmazon, medida_puente: medidaPuente, medida_varilla: medidaVarilla });
    } else if (tipoArticulo === 'lente_contacto') {
      Object.assign(payload, { curva_base: curvaBase, diametro, poder_esferico: poderEsferico, dias_reemplazo: parseInt(diasReemplazo) || null, fecha_caducidad: fechaCaducidad || null });
    } else if (tipoArticulo === 'cristal') {
      Object.assign(payload, { id_material: parseInt(idMaterialCristal) || null, esfera, cilindro, eje, adicion, tipo_lente: tipoLente, tratamientos: tratamientosSel });
    }

    if (editandoId) {
      await editarProducto(editandoId, payload);
      mostrarMensaje('Producto actualizado exitosamente.');
    } else {
      await agregarProducto(payload);
      mostrarMensaje('Producto creado exitosamente.');
    }
    resetForm();
  };

  const editarItem = (prod) => {
    resetForm();
    setEditandoId(prod.id_producto);
    setMostrarFormulario(true);
    setTipoArticulo(prod.tipo_articulo);
    setMarca(prod.marca);
    setModelo(prod.modelo);
    setCantidad(prod.cantidad_inventario);
    setPrecio(prod.precio_unitario);
    setRutaImagenExistente(prod.ruta_imagen || '');
    setImagenPreview(prod.ruta_imagen || '');

    if (prod.tipo_articulo === 'armazon') {
      setColor(prod.color || ''); setMaterialArmazon(prod.material || ''); setMedidaPuente(prod.medida_puente || ''); setMedidaVarilla(prod.medida_varilla || '');
    } else if (prod.tipo_articulo === 'lente_contacto') {
      setCurvaBase(prod.curva_base || ''); setDiametro(prod.diametro || ''); setPoderEsferico(prod.poder_esferico || '');
      setDiasReemplazo(prod.dias_reemplazo || '');
      setFechaCaducidad(prod.fecha_caducidad ? prod.fecha_caducidad.split('T')[0] : '');
    } else if (prod.tipo_articulo === 'cristal') {
      setIdMaterialCristal(prod.id_material || '');
      setEsfera(prod.esfera || ''); setCilindro(prod.cilindro || ''); setEje(prod.eje || ''); setAdicion(prod.adicion || '');
      setTipoLente(prod.tipo_lente || 'monofocal');
      setTratamientosSel((prod.tratamientos || []).map(t => t.id_tratamiento));
    }
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchTexto = p.marca.toLowerCase().includes(filtroTexto.toLowerCase()) || p.modelo.toLowerCase().includes(filtroTexto.toLowerCase());
      const stockCritico = soloStockBajo ? p.cantidad_inventario <= 2 : true;
      const matchCategoria = filtroCategoria === 'todos' || p.tipo_articulo === filtroCategoria;
      return matchTexto && stockCritico && matchCategoria;
    });
  }, [productos, filtroTexto, soloStockBajo, filtroCategoria]);

  const cantStockBajo = productos.filter(p => p.cantidad_inventario <= 2).length;

  const marcasUnicas = useMemo(() => {
    const marcas = productos.map(p => p.marca).filter(Boolean);
    return [...new Set(marcas)].sort();
  }, [productos]);

  const getIsotipo = (tipo) => {
    switch(tipo) {
      case 'armazon': return <Glasses size={20} color="#94a3b8" />;
      case 'lente_contacto':
      case 'cristal': return <Eye size={20} color="#94a3b8" />;
      default: return <Box size={20} color="#94a3b8" />;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #cbd5e1' }}>
        <button onClick={() => setTab('productos')} style={{ background: 'none', border: 'none', padding: '0.75rem 1.5rem', borderBottom: tab === 'productos' ? '2px solid #2563eb' : '2px solid transparent', color: tab === 'productos' ? '#2563eb' : '#64748b', fontWeight: tab === 'productos' ? 'bold' : 'normal', cursor: 'pointer' }}>Productos</button>
        <button onClick={() => setTab('catalogos')} style={{ background: 'none', border: 'none', padding: '0.75rem 1.5rem', borderBottom: tab === 'catalogos' ? '2px solid #2563eb' : '2px solid transparent', color: tab === 'catalogos' ? '#2563eb' : '#64748b', fontWeight: tab === 'catalogos' ? 'bold' : 'normal', cursor: 'pointer' }}>Catálogos (Materiales y Tratamientos)</button>
      </div>

      {mensaje && (
        <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={20} /> {mensaje}
        </div>
      )}

      {tab === 'productos' && (
        <div>
          {cantStockBajo > 0 && (
            <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991b1b' }}>
                <AlertTriangle color="#ef4444" size={24} />
                <div>
                  <strong>¡Atención de Inventario!</strong>
                  <div style={{ fontSize: '0.85rem' }}>Hay <strong>{cantStockBajo}</strong> producto(s) con stock crítico.</div>
                </div>
              </div>
              <button
                onClick={() => setSoloStockBajo(!soloStockBajo)}
                style={{ backgroundColor: soloStockBajo ? '#991b1b' : '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {soloStockBajo ? 'Mostrar Todos' : 'Ver Stock Crítico'}
              </button>
            </div>
          )}

          {isManager && (
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarFormulario || editandoId ? '1rem' : '0' }}>
                <h3 style={{ color: '#334155', margin: 0 }}>{editandoId ? 'Editar Producto' : 'Registrar Nuevo Producto'}</h3>
                {!mostrarFormulario && !editandoId && (
                  <button onClick={() => setMostrarFormulario(true)} style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    + Añadir Producto
                  </button>
                )}
              </div>
              {(mostrarFormulario || editandoId) && (
              <form onSubmit={guardarProducto}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Tipo de Artículo *</label>
                    <select value={tipoArticulo} onChange={e => setTipoArticulo(e.target.value)} disabled={!!editandoId} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <option value="armazon">Armazón</option>
                      <option value="lente_contacto">Lente de Contacto</option>
                      <option value="cristal">Cristal / Mica</option>
                      <option value="accesorio">Accesorio</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Marca *</label>
                    <input required list="marcas-list" value={marca} onChange={e => setMarca(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    <datalist id="marcas-list">
                      {marcasUnicas.map(m => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Modelo / Nombre</label>
                    <input value={modelo} onChange={e => setModelo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Cantidad *</label>
                    <input type="number" min="0" required value={cantidad} onChange={e => setCantidad(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Precio Unitario *</label>
                    <input type="number" min="0" step="0.01" required value={precio} onChange={e => setPrecio(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Imagen del Producto</label>
                    <input type="file" accept="image/*" onChange={handleArchivoCambio} style={{ width: '100%', padding: '0.4rem' }} />
                    {imagenPreview && <img src={imagenPreview} alt="Preview" style={{ height: '50px', marginTop: '0.5rem', borderRadius: '4px' }} />}
                  </div>

                </div>

                {/* Secciones Específicas */}
                {tipoArticulo === 'armazon' && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.95rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Características Adicionales</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    <div><label style={{ fontSize: '0.85rem' }}>Color</label><input value={color} onChange={e=>setColor(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Material</label><input value={materialArmazon} onChange={e=>setMaterialArmazon(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Medida Puente</label><input value={medidaPuente} onChange={e=>setMedidaPuente(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Medida Varilla</label><input value={medidaVarilla} onChange={e=>setMedidaVarilla(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    </div>
                  </div>
                )}

                {tipoArticulo === 'lente_contacto' && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.95rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Características Adicionales</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div><label style={{ fontSize: '0.85rem' }}>Curva Base</label><input value={curvaBase} onChange={e=>setCurvaBase(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Diámetro</label><input value={diametro} onChange={e=>setDiametro(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Poder Esférico</label><input value={poderEsferico} onChange={e=>setPoderEsferico(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Días Reemplazo</label><input type="number" value={diasReemplazo} onChange={e=>setDiasReemplazo(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Fecha Caducidad</label><input type="date" value={fechaCaducidad} onChange={e=>setFechaCaducidad(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    </div>
                  </div>
                )}

                {tipoArticulo === 'cristal' && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.95rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Características Adicionales</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Material de Cristal</label>
                      <select value={idMaterialCristal} onChange={e=>setIdMaterialCristal(e.target.value)} style={{width:'100%', padding:'0.4rem'}}>
                        <option value="">Seleccione...</option>
                        {materiales.map(m => <option key={m.id_material} value={m.id_material}>{m.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Tipo de Lente</label>
                      <select value={tipoLente} onChange={e=>setTipoLente(e.target.value)} style={{width:'100%', padding:'0.4rem'}}>
                        <option value="monofocal">Monofocal</option>
                        <option value="bifocal">Bifocal</option>
                        <option value="progresivo">Progresivo</option>
                      </select>
                    </div>
                    <div><label style={{ fontSize: '0.85rem' }}>Esfera</label><input value={esfera} onChange={e=>setEsfera(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Cilindro</label><input value={cilindro} onChange={e=>setCilindro(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Eje</label><input value={eje} onChange={e=>setEje(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    <div><label style={{ fontSize: '0.85rem' }}>Adición</label><input value={adicion} onChange={e=>setAdicion(e.target.value)} style={{width:'100%', padding:'0.4rem'}} /></div>
                    
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Tratamientos Aplicables</label>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {tratamientos.map(t => (
                          <label key={t.id_tratamiento} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', backgroundColor: '#e2e8f0', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                            <input type="checkbox" checked={tratamientosSel.includes(t.id_tratamiento)} onChange={() => toggleTratamiento(t.id_tratamiento)} />
                            {t.nombre} (+${t.costo_adicional})
                          </label>
                        ))}
                      </div>
                    </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={resetForm} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'transparent', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                    {editandoId ? 'Guardar Cambios' : 'Registrar Producto'}
                  </button>
                </div>
              </form>
              )}
            </div>
          )}

          {/* Buscador de productos */}
          <div style={{ marginBottom: '1rem' }}>
            <input type="text" placeholder="Buscar producto por marca o modelo..." value={filtroTexto} onChange={e=>setFiltroTexto(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>

          {/* Filtro de Categorías */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setFiltroCategoria('todos')} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #cbd5e1', backgroundColor: filtroCategoria === 'todos' ? '#2563eb' : '#f8fafc', color: filtroCategoria === 'todos' ? 'white' : '#475569', cursor: 'pointer', fontSize: '0.9rem' }}>Todos</button>
            <button onClick={() => setFiltroCategoria('armazon')} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #cbd5e1', backgroundColor: filtroCategoria === 'armazon' ? '#2563eb' : '#f8fafc', color: filtroCategoria === 'armazon' ? 'white' : '#475569', cursor: 'pointer', fontSize: '0.9rem' }}>Armazones</button>
            <button onClick={() => setFiltroCategoria('lente_contacto')} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #cbd5e1', backgroundColor: filtroCategoria === 'lente_contacto' ? '#2563eb' : '#f8fafc', color: filtroCategoria === 'lente_contacto' ? 'white' : '#475569', cursor: 'pointer', fontSize: '0.9rem' }}>Lentes de Contacto</button>
            <button onClick={() => setFiltroCategoria('accesorio')} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #cbd5e1', backgroundColor: filtroCategoria === 'accesorio' ? '#2563eb' : '#f8fafc', color: filtroCategoria === 'accesorio' ? 'white' : '#475569', cursor: 'pointer', fontSize: '0.9rem' }}>Accesorios</button>
            <button onClick={() => setFiltroCategoria('cristal')} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #cbd5e1', backgroundColor: filtroCategoria === 'cristal' ? '#2563eb' : '#f8fafc', color: filtroCategoria === 'cristal' ? 'white' : '#475569', cursor: 'pointer', fontSize: '0.9rem' }}>Micas</button>
          </div>

          {filtroCategoria === 'cristal' ? (
            <MatrizMicas />
          ) : (
          <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem' }}>Imagen</th>
                  <th style={{ padding: '1rem' }}>Tipo</th>
                  <th style={{ padding: '1rem' }}>Marca / Modelo</th>
                  <th style={{ padding: '1rem' }}>Detalles</th>
                  <th style={{ padding: '1rem' }}>Precio Unit.</th>
                  <th style={{ padding: '1rem' }}>Stock</th>
                  {isManager && <th style={{ padding: '1rem' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map(prod => (
                  <tr key={prod.id_producto} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem' }}>
                      {prod.ruta_imagen ? <img src={prod.ruta_imagen} alt={prod.marca} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} /> : <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getIsotipo(prod.tipo_articulo)}</div>}
                    </td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{prod.tipo_articulo.replace('_', ' ')}</td>
                    <td style={{ padding: '1rem' }}><strong>{prod.marca}</strong><br/><span style={{ fontSize: '0.85rem', color: '#64748b' }}>{prod.modelo}</span></td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                      {prod.tipo_articulo === 'armazon' && <span>Color: {prod.color} | Mat: {prod.material}</span>}
                      {prod.tipo_articulo === 'cristal' && <span>{prod.tipo_lente} | Esf: {prod.esfera} | Cil: {prod.cilindro}</span>}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#0f172a' }}>${parseFloat(prod.precio_unitario).toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: prod.cantidad_inventario <= 2 ? '#fee2e2' : '#dcfce7', color: prod.cantidad_inventario <= 2 ? '#991b1b' : '#166534' }}>
                        {prod.cantidad_inventario}
                      </span>
                    </td>
                    {isManager && (
                      <td style={{ padding: '1rem' }}>
                        <button onClick={() => editarItem(prod)} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Editar</button>
                      </td>
                    )}
                  </tr>
                ))}
                {productosFiltrados.length === 0 && (
                  <tr><td colSpan={isManager ? 7 : 6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No se encontraron productos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {tab === 'catalogos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Materiales */}
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#334155' }}>Materiales de Cristal</h3>
            <form onSubmit={async (e) => { e.preventDefault(); await agregarMaterial({ nombre: nuevoMatNombre, descripcion: nuevoMatDesc }); setNuevoMatNombre(''); setNuevoMatDesc(''); mostrarMensaje('Material agregado'); }} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: '0.85rem' }}>Nombre</label><input required value={nuevoMatNombre} onChange={e=>setNuevoMatNombre(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: '0.85rem' }}>Descripción</label><input value={nuevoMatDesc} onChange={e=>setNuevoMatDesc(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
              <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Agregar</button>
            </form>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {materiales.map(m => (
                <li key={m.id_material} style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{m.nombre}</strong> <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{m.descripcion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tratamientos */}
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#334155' }}>Tratamientos de Cristal</h3>
            <form onSubmit={async (e) => { e.preventDefault(); await agregarTratamiento({ nombre: nuevoTratNombre, descripcion: nuevoTratDesc, costo_adicional: parseFloat(nuevoTratCosto) }); setNuevoTratNombre(''); setNuevoTratDesc(''); setNuevoTratCosto(0); mostrarMensaje('Tratamiento agregado'); }} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px' }}><label style={{ fontSize: '0.85rem' }}>Nombre</label><input required value={nuevoTratNombre} onChange={e=>setNuevoTratNombre(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
              <div style={{ flex: 1, minWidth: '120px' }}><label style={{ fontSize: '0.85rem' }}>Descripción</label><input value={nuevoTratDesc} onChange={e=>setNuevoTratDesc(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
              <div style={{ flex: 1, minWidth: '80px' }}><label style={{ fontSize: '0.85rem' }}>Costo (+)</label><input type="number" required value={nuevoTratCosto} onChange={e=>setNuevoTratCosto(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></div>
              <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Agregar</button>
            </form>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {tratamientos.map(t => (
                <li key={t.id_tratamiento} style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><strong>{t.nombre}</strong> <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{t.descripcion}</div></div>
                  <strong style={{ color: '#0f172a' }}>+${t.costo_adicional}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default function InventarioWrapped() {
  return (
    // Reusing the Error Boundary logic (simplified or full if needed, but since we didn't export ErrorBoundary, we just wrap it inline or omit if optional)
    <Inventario />
  );
}
