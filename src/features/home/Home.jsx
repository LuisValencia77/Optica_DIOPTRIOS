import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DashboardSuperUser, DashboardAdmin, DashboardEmployee } from '../auth/Dashboards';

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


    </div>
  );
};

export default Home;
