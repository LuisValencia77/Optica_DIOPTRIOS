import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DashboardSuperUser, DashboardAdmin, DashboardEmployee } from '../auth/Dashboards';

const exampleCards = [
  { title: 'Inventario', path: '/inventario', description: 'Revisa y administra productos y tratamientos.' },
  { title: 'Pacientes', path: '/pacientes', description: 'Registra y consulta expedientes de pacientes.' },
  { title: 'Exámenes', path: '/examenes', description: 'Captura y revisa datos de exámenes visuales.' },
  { title: 'Pedidos Realizados', path: '/pedidos', description: 'Consulta pedidos y envía notificaciones de recolección por correo.' },
  { title: 'Punto de Venta', path: '/ventas/nueva', description: 'Crea ventas y genera tickets al instante.' },
  { title: 'Historial de Ventas', path: '/ventas/historial', description: 'Consulta ventas anteriores y estados de pago.' },
];

const Home = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    if (user?.role === 'Super Usuario') return <DashboardSuperUser />;
    if (user?.role === 'Administrador') return <DashboardAdmin />;
    if (user?.role === 'Empleado') return <DashboardEmployee />;
    return <div>Bienvenido</div>;
  };

  return (
    <div>
      <section style={{ marginBottom: '2rem' }}>
        {renderDashboard()}
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem', color: '#1e293b' }}>Ejemplos rápidos</h2>
        <div className="examples-grid">
          {exampleCards.map(card => (
            <NavLink
              key={card.path}
              to={card.path}
              className="example-card"
            >
              <div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
              <span style={{ color: '#2563eb', fontWeight: '700' }}>Ir</span>
            </NavLink>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
