import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Navbar from '../components/Navbar';

function ProtectedRoute({ children }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    axiosClient
      .get('/materials')
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsChecking(false));
  }, []);

  if (isChecking) {
    return <div className="p-8 text-center">جاري التحقق...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

 return (
  <>
    <Navbar />
    {children}
  </>
);
}

export default ProtectedRoute;