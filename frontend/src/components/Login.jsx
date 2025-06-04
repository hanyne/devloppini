import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa'; 

const Login = ({ setIsAuthenticated, setUserRole }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { email, password };
    console.log('Étape 1 - Données envoyées au serveur:', payload);

    try {
      console.log('Étape 2 - Envoi de la requête à /api/client/token/');
      const response = await fetch('http://localhost:8000/api/client/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('Étape 3 - Statut de la réponse:', response.status);
      const data = await response.json();
      console.log('Étape 4 - Réponse complète du serveur:', data);

      if (!response.ok) {
        console.log('Étape 5 - Erreur détectée dans la réponse:', data.error);
        throw new Error(data.error || 'Erreur d’authentification');
      }

      console.log('Étape 6 - Connexion réussie, stockage des tokens');
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      console.log('Étape 7 - Décodage du token');
      const decodedToken = jwtDecode(data.access);
      console.log('Token décodé:', decodedToken);
      const userRole = decodedToken.role || 'client';
      console.log('Étape 8 - Rôle de l’utilisateur:', userRole);

      setIsAuthenticated(true);
      setUserRole(userRole);

      console.log('Étape 9 - Redirection selon le rôle');
      if (userRole === 'admin') {
        console.log('Redirection vers /dashboard');
        toast.success('Connexion réussie ! Redirection vers le tableau de bord...');
        navigate('/dashboard');
      } else {
        console.log('Redirection vers /home');
        toast.success('Connexion réussie ! Redirection vers l’accueil...');
        navigate('/home');
      }
    } catch (err) {
      console.error('Étape 10 - Erreur lors de la connexion:', err);
      setError(err.message);
      toast.error(err.message);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('https://www.wgcfrance.com/images/cours_informatique.png')`, // Replace with your image URL
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">Connexion</h2>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-100 text-red-800 p-3 rounded-lg mb-4"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="flex items-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
              <FaEnvelope className="text-gray-500 dark:text-gray-400 ml-3" />
              <input
                type="email"
                className="w-full p-2 border-0 rounded-lg bg-transparent focus:ring-0 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>
          </div>

          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mot de passe
            </label>
            <div className="flex items-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
              <FaLock className="text-gray-500 dark:text-gray-400 ml-3" />
              <input
                type="password"
                className="w-full p-2 border-0 rounded-lg bg-transparent focus:ring-0 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="mb-4 text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-indigo-500 hover:underline dark:text-indigo-400"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center"
          >
            <FaSignInAlt className="mr-2" />
            Se connecter
          </motion.button>
        </form>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-indigo-500 hover:underline">
            S’inscrire
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;