import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Devis from './components/Devis';
import Factures from './components/Factures';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import DevisForm from './components/DevisForm';
import Contact from './components/Contact';
import PaymentDevis from './components/PaymentDevis';
import Chat from './components/Chat';
import ClientDevisList from './components/ClientDevisList';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ChangePassword from './components/ChangePassword';
import PaidClients from './components/PaidClients';

const PaymentSuccess = () => {
    const { factureId } = useParams();
    useEffect(() => {
        const timer = setTimeout(() => {
            window.location.href = `/payment-devis`;
        }, 3000);
        return () => clearTimeout(timer);
    }, [factureId]);

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: 'green' }}>Paiement effectué avec succès pour la facture #{factureId} !</h2>
            <p>Vous serez redirigé dans quelques secondes...</p>
        </div>
    );
};

const PayPalExecuteHandler = () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const paymentId = searchParams.get('paymentId');
    const payerId = searchParams.get('PayerID');
    const token = localStorage.getItem('access_token');

    useEffect(() => {
        const handlePaymentExecute = async () => {
            if (paymentId && payerId && token) {
                try {
                    const response = await fetch(`http://localhost:8000/api/payment/paypal/execute/?paymentId=${paymentId}&PayerID=${payerId}`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    const data = await response.json();
                    if (data.status === 'Paiement réussi') {
                        const urlParams = new URLSearchParams(location.search);
                        const factureId = urlParams.get('factureId');
                        window.location.href = factureId ? `/payment/success/${factureId}` : '/payment-devis';
                    } else {
                        console.error('Payment execution failed:', data);
                        window.location.href = '/payment-devis';
                    }
                } catch (err) {
                    console.error('Error executing PayPal payment:', err);
                    window.location.href = '/payment-devis';
                }
            } else {
                console.warn('Missing paymentId, payerId, or token');
                window.location.href = '/payment-devis';
            }
        };

        handlePaymentExecute();
    }, [location.search, paymentId, payerId, token]);

    return <div>Loading...</div>;
};

const ProtectedRoute = ({ children, allowedRole }) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        return <Navigate to="/login" />;
    }

    try {
        const decodedToken = jwtDecode(token);
        const userRole = decodedToken.role || 'client';
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

    return (
        <Router>
            <div>
                <ToastContainer position="top-right" autoClose={3000} />
                <nav className="bg-gradient-to-r from-gray-800 to-blue-900 text-white shadow-lg sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <Link to="/" className="flex items-center space-x-2">
                            <img src={'/logo.png'} alt="Logo" className="h-8 w-8" />
                            <span className="text-2xl font-bold tracking-tight text-white hover:text-yellow-300 transition-colors">
                                SMARTBILL
                            </span>
                        </Link>
                        <div className="hidden md:flex space-x-6 items-center">
                            {isAuthenticated ? (
                                <>
                                    {userRole === 'admin' && (
                                        <>
                                            <Link to="/dashboard" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Tableau de bord
                                            </Link>
                                            <Link to="/clients" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Clients
                                            </Link>
                                            <Link to="/devis" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Devis
                                            </Link>
                                            <Link to="/factures" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Factures
                                            </Link>
                                            <Link to="/paid-clients" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Clients payee
                                            </Link>
                                        </>
                                    )}
                                    {userRole === 'client' && (
                                        <>
                                            <Link to="/home" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Accueil
                                            </Link>
                                            <Link to="/devis-form" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Demander un Devis
                                            </Link>
                                            <Link to="/client-devis" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Mes Devis
                                            </Link>
                                            <Link to="/payment-devis" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Mes Factures
                                            </Link>
                                            <Link to="/change-password" className="text-white font-medium hover:text-yellow-300 transition-colors">
                        Changer Mot de Passe
                      </Link>
                                            <Link to="/contact" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                                Contact
                                            </Link>
                                            <Link to="/chat" className="text-white hover:text-yellow-300 transition-colors" title="Chatbot">
                                                <i className="fas fa-comment-dots fa-lg"></i>
                                            </Link>
                                        </>
                                    )}
                                    <button onClick={handleLogout} className="text-white font-medium hover:text-yellow-300 transition-colors">
                                        Déconnexion
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                        Connexion
                                    </Link>
                                    <Link to="/register" className="text-white font-medium hover:text-yellow-300 transition-colors">
                                        Inscription
                                    </Link>
                                </>
                            )}
                        </div>
                        <button className="md:hidden focus:outline-none" onClick={toggleMenu}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
                            </svg>
                        </button>
                    </div>
                    {isMenuOpen && (
                        <div className="md:hidden bg-gray-800 py-2">
                            <div className="flex flex-col items-center space-y-2">
                                {isAuthenticated ? (
                                    <>
                                        {userRole === 'admin' && (
                                            <>
                                                <Link to="/dashboard" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Tableau de bord</Link>
                                                <Link to="/clients" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Clients</Link>
                                                <Link to="/devis" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Devis</Link>
                                                <Link to="/factures" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Factures</Link>
                                                <Link to="/paid-clients" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Clients payee</Link>

                                            </>
                                        )}
                                        {userRole === 'client' && (
                                            <>
                                                <Link to="/home" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Accueil</Link>
                                                <Link to="/devis-form" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Demander un Devis</Link>
                                                <Link to="/client-devis" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Mes Devis</Link>
                                                <Link to="/payment-devis" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Mes Factures</Link>
                                                <Link to="/contact" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Contact</Link>
                                                <Link to="/chat" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>
                                                    Chatbot <i className="fas fa-comment-dots fa-lg"></i>
                                                </Link>
                                            </>
                                        )}
                                        <button onClick={() => { handleLogout(); toggleMenu(); }} className="text-white font-medium hover:text-yellow-300 transition-colors">
                                            Déconnexion
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Connexion</Link>
                                        <Link to="/register" className="text-white font-medium hover:text-yellow-300 transition-colors" onClick={toggleMenu}>Inscription</Link>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </nav>

                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/devis-form" element={<DevisForm />} />
                    <Route path="/client-devis" element={<ProtectedRoute allowedRole="client"><ClientDevisList /></ProtectedRoute>} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<ProtectedRoute allowedRole="admin"><Dashboard /></ProtectedRoute>} />
                    <Route path="/clients" element={<ProtectedRoute allowedRole="admin"><Clients /></ProtectedRoute>} />
                    <Route path="/devis" element={<ProtectedRoute allowedRole="admin"><Devis /></ProtectedRoute>} />
                    <Route path="/factures" element={<ProtectedRoute allowedRole="admin"><Factures /></ProtectedRoute>} />
                    <Route path="/payment-devis" element={<ProtectedRoute allowedRole="client"><PaymentDevis /></ProtectedRoute>} />
                    <Route path="/payment/success/:factureId" element={<ProtectedRoute allowedRole="client"><PaymentSuccess /></ProtectedRoute>} />
                    <Route path="/api/payment/paypal/execute/" element={<PayPalExecuteHandler />} />
                    <Route path="/chat" element={<ProtectedRoute allowedRole="client"><Chat /></ProtectedRoute>} />
                    <Route path="/paid-clients" element={<PaidClients />} /> {/* Add this route */}
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
                    <Route path="/change-password" element={<ProtectedRoute allowedRole="client"><ChangePassword /></ProtectedRoute>} /> {/* Add this route */}
                </Routes>
            </div>
        </Router>
    );
}

export default App;