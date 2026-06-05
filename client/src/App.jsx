import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Doctors from './pages/Doctors';
import Appointments from './pages/Appointments';
import Calendar from './pages/Calendar';
import AIBooking from './pages/AIBooking';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/ai-booking" element={<AIBooking />} />
        </Routes>
      </Layout>
    </Router>
  );
}
