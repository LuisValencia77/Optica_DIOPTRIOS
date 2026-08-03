import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './features/auth/Login';
import ProtectedRoute from './routes/ProtectedRoute';

import Home from './features/home/Home';
import Inventario from './features/inventario/Inventario';
import Pacientes from './features/pacientes/Pacientes';
import Examenes from './features/pacientes/Examenes';
import PuntoDeVenta from './features/ventas/PuntoDeVenta';
import HistorialVentas from './features/ventas/HistorialVentas';
import PedidosList from './features/pedidos/PedidosList';
import GestionUsuarios from './features/usuarios/GestionUsuarios';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/examenes" element={<Examenes />} />
        <Route path="/pedidos" element={<PedidosList />} />
        <Route path="/ventas/nueva" element={<PuntoDeVenta />} />
        <Route path="/ventas/historial" element={<HistorialVentas />} />
        <Route path="/usuarios" element={<GestionUsuarios />} />
      </Route>
    </Routes>
  );
}

export default App;
