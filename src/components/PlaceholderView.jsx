import React from 'react';

const PlaceholderView = ({ title }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>{title}</h2>
    <p style={{ color: '#64748b' }}>Este módulo está en construcción y será implementado en la siguiente fase.</p>
  </div>
);

export const InventarioView = () => <PlaceholderView title="Gestión de Inventario" />;
export const PacientesView = () => <PlaceholderView title="Pacientes y Expedientes" />;
export const ExamenesView = () => <PlaceholderView title="Exámenes Visuales" />;
export const PuntoVentaView = () => <PlaceholderView title="Punto de Venta" />;
export const HistorialVentasView = () => <PlaceholderView title="Historial de Ventas" />;
