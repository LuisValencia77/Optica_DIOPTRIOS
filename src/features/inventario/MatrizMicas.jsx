import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';

const MatrizMicas = () => {
  const { materiales, tratamientos, obtenerMatrizMicas, actualizarCeldaMatrizMicas } = useDatabase();
  
  const [materialSel, setMaterialSel] = useState('');
  const [tratamientoSel, setTratamientoSel] = useState('');
  const [matrizData, setMatrizData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [precioBase, setPrecioBase] = useState(0);

  // Rango de cilindro (0.00 a 6.00)
  const cilindros = Array.from({ length: 25 }, (_, i) => (i * 0.25).toFixed(2));
  // Rango de esfera (+6.00 a -15.00)
  const esferas = Array.from({ length: 85 }, (_, i) => (6.00 - i * 0.25).toFixed(2));

  useEffect(() => {
    if (materialSel) {
      cargarMatriz();
    } else {
      setMatrizData([]);
    }
  }, [materialSel, tratamientoSel]);

  const cargarMatriz = async () => {
    setLoading(true);
    const data = await obtenerMatrizMicas(materialSel, tratamientoSel);
    setMatrizData(data);
    setLoading(false);
  };

  const getCantidad = (esf, cil) => {
    const item = matrizData.find(d => parseFloat(d.esfera).toFixed(2) === parseFloat(esf).toFixed(2) && parseFloat(d.cilindro).toFixed(2) === parseFloat(cil).toFixed(2));
    return item ? item.cantidad_inventario : '';
  };

  const handleBlur = async (esf, cil, valor) => {
    const valStr = valor.trim();
    if (valStr === '') return; // No hacer nada si está vacío
    const num = parseInt(valStr, 10);
    if (isNaN(num) || num < 0) return;

    // Verificar si cambió
    const actual = getCantidad(esf, cil);
    if (actual === num) return;

    try {
      await actualizarCeldaMatrizMicas({
        id_material: materialSel,
        id_tratamiento: tratamientoSel || null,
        esfera: esf,
        cilindro: cil,
        cantidad: num,
        precio_unitario: precioBase
      });
      // Actualizar estado local
      setMatrizData(prev => {
        const existe = prev.find(d => parseFloat(d.esfera).toFixed(2) === parseFloat(esf).toFixed(2) && parseFloat(d.cilindro).toFixed(2) === parseFloat(cil).toFixed(2));
        if (existe) {
          return prev.map(d => d.id_producto === existe.id_producto ? { ...d, cantidad_inventario: num } : d);
        } else {
          return [...prev, { esfera: esf, cilindro: cil, cantidad_inventario: num, id_producto: 'temp' }];
        }
      });
    } catch (e) {
      console.error(e);
      alert('Error al guardar la cantidad');
    }
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginTop: 0, marginBottom: '1.5rem' }}>Matriz de Inventario (Micas)</h2>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Material</label>
          <select value={materialSel} onChange={e => setMaterialSel(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}>
            <option value="">-- Seleccionar --</option>
            {materiales.map(m => (
              <option key={m.id_material} value={m.id_material}>{m.nombre}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Tratamiento</label>
          <select value={tratamientoSel} onChange={e => setTratamientoSel(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}>
            <option value="">-- Sin Tratamiento --</option>
            {tratamientos.map(t => (
              <option key={t.id_tratamiento} value={t.id_tratamiento}>{t.nombre}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Precio Base para Micas Nuevas ($)</label>
          <input type="number" value={precioBase} onChange={e => setPrecioBase(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: '150px', outline: 'none' }} />
        </div>
      </div>

      {!materialSel ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          Selecciona un material para cargar la matriz de inventario.
        </div>
      ) : loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#3b82f6', fontWeight: 'bold' }}>Cargando matriz...</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '60vh' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', backgroundColor: 'white' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '0.25rem', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', position: 'sticky', left: 0, zIndex: 11, width: '45px', fontSize: '0.7rem' }}>Esf \ Cil</th>
                {cilindros.map(cil => (
                  <th key={cil} style={{ padding: '0.25rem', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', minWidth: '25px', textAlign: 'center', fontSize: '0.7rem', color: '#334155' }}>{cil}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {esferas.map(esf => (
                <tr key={esf}>
                  <th style={{ padding: '0.25rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', position: 'sticky', left: 0, zIndex: 9, fontSize: '0.75rem', color: '#334155' }}>{esf}</th>
                  {cilindros.map(cil => {
                    const cant = getCantidad(esf, cil);
                    return (
                      <td key={cil} style={{ padding: 0, border: '1px solid #e2e8f0', height: '30px' }}>
                        <input 
                          type="text"
                          defaultValue={cant}
                          onBlur={(e) => handleBlur(esf, cil, e.target.value)}
                          style={{
                            width: '100%',
                            height: '100%',
                            minHeight: '30px',
                            border: 'none',
                            textAlign: 'center',
                            backgroundColor: cant > 0 ? '#ecfdf5' : 'transparent',
                            color: cant > 0 ? '#065f46' : '#1e293b',
                            fontWeight: cant > 0 ? 'bold' : 'normal',
                            outline: 'none',
                            fontSize: '0.8rem',
                            padding: 0
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MatrizMicas;
