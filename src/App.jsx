import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './features/auth/Login';
import VerificarCorreo from './features/auth/VerificarCorreo';
import ResetPassword from './features/auth/ResetPassword';
import ProtectedRoute from './routes/ProtectedRoute';

import Home from './features/home/Home';
import Inventario from './features/inventario/Inventario';
import Pacientes from './features/pacientes/Pacientes';
import PuntoDeVenta from './features/ventas/PuntoDeVenta';
import VentasYPedidos from './features/ventas/VentasYPedidos';
import GestionUsuarios from './features/usuarios/GestionUsuarios';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verificar-correo" element={<VerificarCorreo />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/ventas/nueva" element={<PuntoDeVenta />} />
        <Route path="/ventas/historial" element={<VentasYPedidos />} />
        <Route path="/usuarios" element={<GestionUsuarios />} />
      </Route>
    </Routes>
  );
}

export default App;
