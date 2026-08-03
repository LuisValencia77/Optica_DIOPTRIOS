import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Package } from 'lucide-react';

const Inventario = () => {
  const { inventario, agregarProducto, editarProducto, eliminarProducto } = useDatabase();
  const { isManager } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  
  // Form state
  const [editandoId, setEditandoId] = useState(null);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [tipo, setTipo] = useState('Armazón');
  const [cantidad, setCantidad] = useState(0);
  const [precio, setPrecio] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [precioEdits, setPrecioEdits] = useState({});
  const [nuevoTratamiento, setNuevoTratamiento] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');

  const resetForm = () => {
    setEditandoId(null);
    setMarca(''); setModelo(''); setTipo('Armazón'); setCantidad(0); setPrecio(0);
  };

  const handleAgregarOEditar = (e) => {
    e.preventDefault();
    if (!marca || !modelo || !tipo || cantidad <= 0 || precio <= 0) {
      setMensaje('Por favor, complete todos los campos correctamente.');
      return;
    }
    
    if (editandoId) {
      editarProducto(editandoId, { marca, modelo, tipo, cantidad: parseInt(cantidad), precio: parseFloat(precio) });
      setMensaje('Producto actualizado exitosamente.');
    } else {
      agregarProducto({ marca, modelo, tipo, cantidad: parseInt(cantidad), precio: parseFloat(precio) });
      setMensaje('Producto registrado exitosamente.');
    }
    
    resetForm();
    setTimeout(() => setMensaje(''), 3000);
  };

  const iniciarEdicion = (prod) => {
    setEditandoId(prod.id);
    setMarca(prod.marca);
    setModelo(prod.modelo);
    setTipo(prod.tipo);
    setCantidad(prod.cantidad);
    setPrecio(prod.precio);
  };

  const inventarioFiltrado = inventario.filter(prod => {
    const coincideTexto = prod.marca.toLowerCase().includes(searchTerm.toLowerCase()) || 
      prod.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.tipo.toLowerCase().includes(searchTerm.toLowerCase());

    const esStockBajo = prod.cantidad <= 2;
    if (soloStockBajo) return coincideTexto && esStockBajo;
    return coincideTexto;
  });

  const conteoStockBajo = inventario.filter(p => p.cantidad <= 2).length;

  return (
    <div>
      <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>Gestión de Inventario</h2>

      {conteoStockBajo > 0 && (
        <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991b1b' }}>
            <AlertTriangle color="#ef4444" size={24} />
            <div>
              <strong>¡Atención de Inventario!</strong>
              <div style={{ fontSize: '0.85rem' }}>Hay <strong>{conteoStockBajo}</strong> producto(s) o armazón(es) con stock crítico (2 o menos unidades).</div>
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
      
      <div className="responsive-grid">

        {/* Gestión de Tratamientos (sección separada) */}
        <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', border: '2px solid #0ea5e9', marginBottom: '1rem', gridColumn: 'span 2' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#0c4a6e' }}>Gestión de Tratamientos</h3>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>Edite precios de tratamientos existentes o agregue nuevos.</p>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: '#334155', marginTop: 0, marginBottom: '0.5rem' }}>Tratamientos Existentes</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {inventario.filter(p => p.tipo === 'Tratamiento').map(t => (
                <div key={t.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <div style={{ flex: 1 }}>{t.marca}</div>
                  <input type="number" min="0" step="0.01" value={precioEdits[t.id] ?? t.precio} onChange={e => setPrecioEdits(prev => ({ ...prev, [t.id]: e.target.value }))} style={{ width: '120px', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <button onClick={async () => {
                    const nuevoPrecio = parseFloat(precioEdits[t.id]);
                    if (isNaN(nuevoPrecio)) return;
                    try {
                      await editarProducto(t.id, { marca: t.marca, modelo: t.modelo, tipo: t.tipo, cantidad: t.cantidad, precio: nuevoPrecio });
                      setMensaje('Precio de tratamiento actualizado.');
                      setTimeout(() => setMensaje(''), 2500);
                    } catch (err) {
                      console.error(err);
                    }
                  }} style={{ padding: '0.35rem 0.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
                </div>
              ))}
              {inventario.filter(p => p.tipo === 'Tratamiento').length === 0 && <div style={{ color: '#94a3b8' }}>No hay tratamientos registrados.</div>}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '1rem' }}>
            <h4 style={{ color: '#334155', marginTop: 0, marginBottom: '0.75rem' }}>Agregar Nuevo Tratamiento</h4>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="text" 
                value={nuevoTratamiento} 
                onChange={e => setNuevoTratamiento(e.target.value)} 
                placeholder="Nombre del tratamiento (ej. Antirreflejante)"
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
              />
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                value={nuevoPrecio} 
                onChange={e => setNuevoPrecio(e.target.value)} 
                placeholder="Precio"
                style={{ width: '120px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
              />
              <button onClick={async () => {
                if (!nuevoTratamiento.trim() || !nuevoPrecio) {
                  setMensaje('Complete nombre y precio.');
                  setTimeout(() => setMensaje(''), 2500);
                  return;
                }
                const newTrat = { id: Date.now(), marca: nuevoTratamiento, modelo: '', tipo: 'Tratamiento', cantidad: 100, precio: parseFloat(nuevoPrecio) };
                await agregarProducto(newTrat);
                setMensaje('Tratamiento agregado.');
                setNuevoTratamiento('');
                setNuevoPrecio('');
                setTimeout(() => setMensaje(''), 2500);
              }} style={{ padding: '0.5rem 0.75rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Agregar</button>
            </div>
          </div>
        </div>
        {/* Formulario de registro */}
        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#334155' }}>
            {editandoId ? 'Editar Producto' : 'Registrar Producto'}
          </h3>
          {mensaje && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>{mensaje}</div>}
          <form onSubmit={handleAgregarOEditar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Marca</label>
              <input type="text" value={marca} onChange={e => setMarca(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Modelo</label>
              <input type="text" value={modelo} onChange={e => setModelo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Tipo de Producto</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                <option value="Armazón">Armazón</option>
                <option value="Lente de Contacto">Lente de Contacto</option>
                <option value="Mica">Mica</option>
                <option value="Accesorio">Accesorio</option>
              </select>
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
                {editandoId ? 'Actualizar' : 'Registrar'}
              </button>
              {editandoId && (
                <button type="button" onClick={resetForm} style={{ flex: 1, backgroundColor: '#94a3b8', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de inventario */}
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="Buscar por marca, modelo o tipo..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '1rem' }}
            />
          </div>
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '0.75rem' }}>ID</th>
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
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>#{prod.id}</td>
                    <td style={{ padding: '0.75rem' }}>{prod.tipo}</td>
                    <td style={{ padding: '0.75rem' }}><strong>{prod.marca}</strong> - {prod.modelo}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {prod.cantidad <= 0 ? 
                        <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Agotado</span> 
                        : prod.cantidad}
                    </td>
                    <td style={{ padding: '0.75rem' }}>${(Number(prod.precio) || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => iniciarEdicion(prod)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {inventarioFiltrado.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No se encontraron productos</td>
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

export default Inventario;
