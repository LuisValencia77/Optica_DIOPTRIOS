import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Package, Image as ImageIcon } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
          <h2>Algo salió mal en Inventario.</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const InventarioContent = () => {
  const { inventario, agregarProducto, editarProducto, subirImagen } = useDatabase();
  const { isManager } = useAuth();
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Estados de Filtros para Productos Generales
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroModelo, setFiltroModelo] = useState('');
  const [filtroPrecio, setFiltroPrecio] = useState('');

  // Formulario General
  const [editandoId, setEditandoId] = useState(null);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [tipo, setTipo] = useState('Armazón');
  const [cantidad, setCantidad] = useState(0);
  const [precio, setPrecio] = useState(0);
  const [imagen, setImagen] = useState('');
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [imagenPreview, setImagenPreview] = useState('');

  // Formulario Cristales
  const [precioEdits, setPrecioEdits] = useState({});
  const [nuevoMaterialCristal, setNuevoMaterialCristal] = useState('');
  const [nuevoPrecioCristal, setNuevoPrecioCristal] = useState('');

  const mostrarMensaje = (msg) => {
    setMensaje(msg);
    setTimeout(() => setMensaje(''), 3000);
  };

  const resetForm = () => {
    setEditandoId(null);
    setMarca(''); setModelo(''); setTipo('Armazón'); setCantidad(0); setPrecio(0); setImagen('');
    setArchivoImagen(null);
    setImagenPreview('');
  };

  const handleAgregarOEditar = async (e) => {
    e.preventDefault();
    if (!marca || !tipo || cantidad <= 0 || precio <= 0) {
      mostrarMensaje('Por favor, complete todos los campos requeridos correctamente.');
      return;
    }

    let urlFinalImagen = imagen;
    
    // Subir la imagen si hay un archivo seleccionado
    if (archivoImagen) {
      const urlSubida = await subirImagen(archivoImagen);
      if (urlSubida) {
        urlFinalImagen = urlSubida;
      } else {
        return; // Detener si falla la subida
      }
    }
    
    if (editandoId) {
      await editarProducto(editandoId, { marca, modelo, tipo, cantidad: parseInt(cantidad), precio: parseFloat(precio), imagen: urlFinalImagen });
      mostrarMensaje('Producto actualizado exitosamente.');
    } else {
      await agregarProducto({ marca, modelo, tipo, cantidad: parseInt(cantidad), precio: parseFloat(precio), imagen: urlFinalImagen });
      mostrarMensaje('Producto registrado exitosamente.');
    }
    
    resetForm();
  };

  const iniciarEdicion = (prod) => {
    setEditandoId(prod.id);
    setMarca(prod.marca);
    setModelo(prod.modelo);
    setTipo(prod.tipo);
    setCantidad(prod.cantidad);
    setPrecio(prod.precio);
    setImagen(prod.imagen || '');
    setArchivoImagen(null);
    setImagenPreview(prod.imagen || '');
  };

  // Filtrado de productos excluyendo Cristales y aplicando filtros avanzados con comprobación de nulos
  const inventarioSeguro = inventario || [];
  const productosGenerales = inventarioSeguro.filter(p => (p.tipo || '') !== 'Cristal');
  const cristales = inventarioSeguro.filter(p => (p.tipo || '') === 'Cristal');

  const inventarioFiltrado = productosGenerales.filter(prod => {
    const marcaSafe = prod.marca || '';
    const modeloSafe = prod.modelo || '';
    const coincideMarca = marcaSafe.toLowerCase().includes(filtroMarca.toLowerCase());
    const coincideModelo = modeloSafe.toLowerCase().includes(filtroModelo.toLowerCase());
    const coincidePrecio = filtroPrecio ? parseFloat(prod.precio || 0) <= parseFloat(filtroPrecio) : true;
    
    const cantidadSafe = prod.cantidad || 0;
    const esStockBajo = cantidadSafe <= 2;
    
    if (soloStockBajo) return coincideMarca && coincideModelo && coincidePrecio && esStockBajo;
    
    return coincideMarca && coincideModelo && coincidePrecio;
  });

  const conteoStockBajo = productosGenerales.filter(p => (p.cantidad || 0) <= 2).length;

  return (
    <div>
      <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>Gestión de Inventario</h2>

      {conteoStockBajo > 0 && (
        <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991b1b' }}>
            <AlertTriangle color="#ef4444" size={24} />
            <div>
              <strong>¡Atención de Inventario!</strong>
              <div style={{ fontSize: '0.85rem' }}>Hay <strong>{conteoStockBajo}</strong> producto(s) con stock crítico (2 o menos unidades).</div>
            </div>
          </div>
          <button
            onClick={() => setSoloStockBajo(!soloStockBajo)}
            style={{ backgroundColor: soloStockBajo ? '#991b1b' : '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            {soloStockBajo ? 'Mostrar Todos' : 'Ver Productos Críticos'}
          </button>
        </div>
      )}

      {mensaje && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontWeight: 'bold' }}>{mensaje}</div>}
      
      <div className="responsive-grid">

        {/* --- SECCIÓN A: GESTIÓN DE CRISTALES --- */}
        <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', border: '2px solid #0ea5e9', marginBottom: '1rem', gridColumn: 'span 2' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#0c4a6e' }}>Gestión de Cristales (Materiales)</h3>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>Edite precios de cristales existentes o agregue nuevos materiales.</p>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: '#334155', marginTop: 0, marginBottom: '0.5rem' }}>Cristales Registrados</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {cristales.map(t => (
                <div key={t.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <div style={{ flex: 1, fontWeight: 'bold' }}>{t.marca}</div>
                  <input type="number" min="0" step="0.01" value={precioEdits[t.id] ?? t.precio} onChange={e => setPrecioEdits(prev => ({ ...prev, [t.id]: e.target.value }))} style={{ width: '120px', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <button onClick={async () => {
                    const nuevoPrecio = parseFloat(precioEdits[t.id]);
                    if (isNaN(nuevoPrecio)) return;
                    await editarProducto(t.id, { marca: t.marca, modelo: t.modelo, tipo: t.tipo, cantidad: t.cantidad, precio: nuevoPrecio });
                    mostrarMensaje('Precio de cristal actualizado.');
                  }} style={{ padding: '0.35rem 0.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
                </div>
              ))}
              {cristales.length === 0 && <div style={{ color: '#94a3b8' }}>No hay cristales registrados.</div>}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '1rem' }}>
            <h4 style={{ color: '#334155', marginTop: 0, marginBottom: '0.75rem' }}>Agregar Nuevo Material de Cristal</h4>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                value={nuevoMaterialCristal} 
                onChange={e => setNuevoMaterialCristal(e.target.value)} 
                placeholder="Nombre del material (ej. CR-39, Policarbonato)"
                style={{ flex: 1, minWidth: '200px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
              />
              <input 
                type="number" 
                min="0.01" 
                step="0.01" 
                value={nuevoPrecioCristal} 
                onChange={e => setNuevoPrecioCristal(e.target.value)} 
                placeholder="Precio"
                style={{ width: '120px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
              />
              <button onClick={async () => {
                if (!nuevoMaterialCristal.trim() || !nuevoPrecioCristal) {
                  mostrarMensaje('Complete nombre del material y precio.');
                  return;
                }
                const newCristal = { marca: nuevoMaterialCristal, modelo: 'Cristal', tipo: 'Cristal', cantidad: 9999, precio: parseFloat(nuevoPrecioCristal), imagen: '' };
                await agregarProducto(newCristal);
                mostrarMensaje('Cristal agregado.');
                setNuevoMaterialCristal('');
                setNuevoPrecioCristal('');
              }} style={{ padding: '0.5rem 0.75rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Registrar Cristal</button>
            </div>
          </div>
        </div>

        {/* --- SECCIÓN B: FORMULARIO DE PRODUCTOS GENERALES --- */}
        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#334155' }}>
            {editandoId ? 'Editar Producto' : 'Registrar Producto'}
          </h3>
          <form onSubmit={handleAgregarOEditar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Tipo de Producto</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                <option value="Armazón">Armazón</option>
                <option value="Lente de Contacto">Lente de Contacto</option>
                <option value="Mica">Mica</option>
                <option value="Accesorio">Accesorio</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Marca</label>
              <input type="text" value={marca} onChange={e => setMarca(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Modelo</label>
              <input type="text" value={modelo} onChange={e => setModelo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Imagen del Producto</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setArchivoImagen(e.target.files[0]);
                      setImagenPreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }} 
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                />
                {imagenPreview && <img src={imagenPreview} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} onError={(e) => { e.target.style.display = 'none' }} />}
              </div>
            </div>
            <div className="responsive-flex" style={{ gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Cantidad</label>
                <input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Precio Venta</label>
                <input type="number" min="0.01" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {editandoId ? 'Actualizar Producto' : 'Registrar Producto'}
              </button>
              {editandoId && (
                <button type="button" onClick={resetForm} style={{ flex: 1, backgroundColor: '#94a3b8', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* --- SECCIÓN C: TABLA Y FILTROS --- */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#334155' }}>Inventario de Productos</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Filtro por marca..." 
              value={filtroMarca}
              onChange={e => setFiltroMarca(e.target.value)}
              style={{ flex: 1, minWidth: '150px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            />
            <input 
              type="text" 
              placeholder="Filtro por modelo..." 
              value={filtroModelo}
              onChange={e => setFiltroModelo(e.target.value)}
              style={{ flex: 1, minWidth: '150px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            />
            <input 
              type="number" 
              placeholder="Precio Máximo..." 
              value={filtroPrecio}
              onChange={e => setFiltroPrecio(e.target.value)}
              style={{ flex: 1, minWidth: '150px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            />
          </div>
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '0.75rem', width: '50px' }}>Img</th>
                  <th style={{ padding: '0.75rem' }}>Tipo</th>
                  <th style={{ padding: '0.75rem' }}>Marca / Modelo</th>
                  <th style={{ padding: '0.75rem' }}>Stock</th>
                  <th style={{ padding: '0.75rem' }}>Precio</th>
                  <th style={{ padding: '0.75rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventarioFiltrado.map(prod => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem' }}>
                      {prod.imagen ? 
                        <img src={prod.imagen} alt={prod.marca} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} onError={(e) => { e.target.style.display = 'none' }} />
                        : <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={18} color="#cbd5e1" /></div>
                      }
                    </td>
                    <td style={{ padding: '0.75rem' }}>{prod.tipo}</td>
                    <td style={{ padding: '0.75rem' }}><strong>{prod.marca || ''}</strong> {prod.modelo ? `- ${prod.modelo}` : ''}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {prod.cantidad <= 0 ? 
                        <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Agotado</span> 
                        : prod.cantidad}
                    </td>
                    <td style={{ padding: '0.75rem' }}>${(Number(prod.precio) || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => iniciarEdicion(prod)} style={{ padding: '0.35rem 0.75rem', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Editar</button>
                    </td>
                  </tr>
                ))}
                {inventarioFiltrado.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No se encontraron productos con estos filtros</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Inventario = () => (
  <ErrorBoundary>
    <InventarioContent />
  </ErrorBoundary>
);

export default Inventario;
