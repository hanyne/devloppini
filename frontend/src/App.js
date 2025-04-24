import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Devis from './components/Devis';
import Factures from './components/Factures';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import DevisForm from './components/DevisForm';
import Contact from './components/Contact'; // New Contact component
import 'bootstrap/dist/css/bootstrap.min.css';

const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" />;
  }

  try {
    const decodedToken = jwtDecode(token);
    const userRole = decodedToken.role || 'client';
    console.log('ProtectedRoute - Rôle de l’utilisateur:', userRole);
    if (allowedRole && userRole !== allowedRole) {
      return <Navigate to={userRole === 'admin' ? '/dashboard' : '/home'} />;
    }
    return children;
  } catch (error) {
    console.error('Erreur lors du décodage du token:', error);
    return <Navigate to="/login" />;
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const [userRole, setUserRole] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          const role = decodedToken.role || 'client';
          console.log('checkAuth - Rôle extrait du token:', role);
          setUserRole(role);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Erreur lors du décodage du token:', error);
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setUserRole(null);
    window.location.href = '/login';
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  console.log('App - État userRole:', userRole);

  return (
    <Router>
      <div>
        {/* Modernized Navbar */}
        <nav className="bg-gradient-to-r from-gray-800 to-blue-900 text-white shadow-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src="https://sdmntpritalynorth.oaiusercontent.com/files/00000000-e344-6246-a6e7-774c8f4ba386/raw?se=2025-04-23T23%3A06%3A48Z&sp=r&sv=2024-08-04&sr=b&scid=18cbe70e-7904-587f-a4a6-9e101a4076d1&skoid=06e05d6f-bdd9-4a88-a7ec-2c0a779a08ca&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-04-23T10%3A27%3A36Z&ske=2025-04-24T10%3A27%3A36Z&sks=b&skv=2024-08-04&sig=nxlZm6n7iKK7/2/fYPRAi93d9yvARYvXDUG/TvpfCOw%3D" alt="Logo" className="h-8 w-8" />
              <span className="text-2xl font-extrabold tracking-tight text-white font-medium hover:text-gold-400 transition-colors duration-300">
              Devlopini
              </span>
            </Link>
            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8 items-center">
              {isAuthenticated ? (
                <>
                  {userRole === 'admin' && (
                    <>
                      <Link to="/dashboard" className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                        Tableau de bord
                      </Link>
                      <Link to="/clients" className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                        Clients
                      </Link>
                      <Link to="/devis" className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                        Devis
                      </Link>
                      <Link to="/factures" className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                        Factures
                      </Link>
                    </>
                  )}
                  {userRole === 'client' && (
                    <>
                      <Link to="/home" className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                        Accueil
                      </Link>
                      <Link to="/devis-form" className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                        Demander un Devis
                      </Link>
                      <Link to="/contact" className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                        Contact
                      </Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                    Connexion
                  </Link>
                  <Link to="/register" className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                    Inscription
                  </Link>
                </>
              )}
            </div>
            {/* Hamburger Menu for Mobile */}
            <button className="md:hidden focus:outline-none" onClick={toggleMenu}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
              </svg>
            </button>
          </div>
          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden bg-gray-800 py-4">
              <div className="flex flex-col items-center space-y-4">
                {isAuthenticated ? (
                  <>
                    {userRole === 'admin' && (
                      <>
                        <Link to="/dashboard" className="text-white font-medium hover:text-gold-400 transition-colors duration-300" onClick={toggleMenu}>Tableau de bord</Link>
                        <Link to="/clients" className="text-white font-medium hover:text-gold-400 transition-colors duration-300" onClick={toggleMenu}>Clients</Link>
                        <Link to="/devis" className="text-white font-medium hover:text-gold-400 transition-colors duration-300" onClick={toggleMenu}>Devis</Link>
                        <Link to="/factures" className="text-white font-medium hover:text-gold-400 transition-colors duration-300" onClick={toggleMenu}>Factures</Link>
                      </>
                    )}
                    {userRole === 'client' && (
                      <>
                        <Link to="/home" className="text-white font-medium hover:text-gold-400 transition-colors duration-300" onClick={toggleMenu}>Accueil</Link>
                        <Link to="/devis-form" className="text-white font-medium hover:text-gold-400 transition-colors duration-300" onClick={toggleMenu}>Demander un Devis</Link>
                        <Link to="/contact" className="text-white font-medium hover:text-gold-400 transition-colors duration-300" onClick={toggleMenu}>Contact</Link>
                      </>
                    )}
                    <button onClick={() => { handleLogout(); toggleMenu(); }} className="text-white font-medium hover:text-gold-400 transition-colors duration-300">
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="text-white font-medium hover:text-gold-400 transition-colors duration-300" onClick={toggleMenu}>Connexion</Link>
                    <Link to="/register" className="text-white font-medium hover:text-gold-400 transition-colors duration-300" onClick={toggleMenu}>Inscription</Link>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>

        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/devis-form" element={<DevisForm />} />
          <Route path="/contact" element={<Contact />} /> {/* New Contact Route */}
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRole="admin"><Dashboard /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute allowedRole="admin"><Clients /></ProtectedRoute>} />
          <Route path="/devis" element={<ProtectedRoute allowedRole="admin"><Devis /></ProtectedRoute>} />
          <Route path="/factures" element={<ProtectedRoute allowedRole="admin"><Factures /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to={isAuthenticated ? (userRole === 'admin' ? '/dashboard' : '/home') : '/login'} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;