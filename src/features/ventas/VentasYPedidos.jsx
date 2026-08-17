import React, { useState } from 'react';
import HistorialVentasTab from './HistorialVentasTab';
import PedidosListTab from './PedidosListTab';
import { DollarSign, PackageCheck } from 'lucide-react';

const VentasYPedidos = () => {
  const [activeTab, setActiveTab] = useState('ventas');

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('ventas')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', 
            color: activeTab === 'ventas' ? '#2563eb' : '#64748b', 
            borderBottom: activeTab === 'ventas' ? '3px solid #2563eb' : 'none', 
            paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' 
          }}
        >
          <DollarSign size={20} /> Historial de Ventas
        </button>
        <button 
          onClick={() => setActiveTab('pedidos')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', 
            color: activeTab === 'pedidos' ? '#2563eb' : '#64748b', 
            borderBottom: activeTab === 'pedidos' ? '3px solid #2563eb' : 'none', 
            paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' 
          }}
        >
          <PackageCheck size={20} /> Estado de Pedidos
        </button>
      </div>

      {activeTab === 'ventas' && <HistorialVentasTab />}
      {activeTab === 'pedidos' && <PedidosListTab />}
    </div>
  );
};

export default VentasYPedidos;
