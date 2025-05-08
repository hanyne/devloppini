import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaUserPlus } from 'react-icons/fa';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+216',
    password: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      if (!value.startsWith('+216')) {
        if (value.length <= 4) {
          return;
        }
      }
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!/^\+216\d{8}$/.test(formData.phone)) {
      setError('Le numéro de téléphone doit être au format +216 suivi de 8 chiffres (ex: +21612345678).');
      toast.error('Numéro de téléphone invalide.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Compte client créé avec succès ! Redirection vers la connexion...');
        toast.success('Inscription réussie !');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || 'Erreur lors de l’inscription.');
        toast.error(data.error || 'Erreur lors de l’inscription.');
      }
    } catch (error) {
      console.error('Erreur lors de l’inscription:', error);
      setError('Erreur réseau ou serveur indisponible.');
      toast.error('Erreur réseau ou serveur indisponible.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">Inscription</h2>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-100 text-red-800 p-3 rounded-lg mb-4"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-100 text-green-800 p-3 rounded-lg mb-4"
          >
            {success}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom complet
            </label>
            <div className="flex items-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
              <FaUser className="text-gray-500 dark:text-gray-400 ml-3" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nom complet"
                className="w-full p-2 border-0 rounded-lg bg-transparent focus:ring-0 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="flex items-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
              <FaEnvelope className="text-gray-500 dark:text-gray-400 ml-3" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                className="w-full p-2 border-0 rounded-lg bg-transparent focus:ring-0 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Téléphone
            </label>
            <div className="flex items-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
              <FaPhone className="text-gray-500 dark:text-gray-400 ml-3" />
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+21612345678"
                pattern="\+216\d{8}"
                title="Le numéro de téléphone doit être au format +216 suivi de 8 chiffres (ex: +21612345678)"
                className="w-full p-2 border-0 rounded-lg bg-transparent focus:ring-0 dark:text-white"
                required
              />
            </div>
            <small className="text-gray-500 dark:text-gray-400">
              Format tunisien : +216 suivi de 8 chiffres
            </small>
          </div>

          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mot de passe
            </label>
            <div className="flex items-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
              <FaLock className="text-gray-500 dark:text-gray-400 ml-3" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full p-2 border-0 rounded-lg bg-transparent focus:ring-0 dark:text-white"
                required
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center"
          >
            <FaUserPlus className="mr-2" />
            S’inscrire
          </motion.button>
        </form>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-indigo-500 hover:underline">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;