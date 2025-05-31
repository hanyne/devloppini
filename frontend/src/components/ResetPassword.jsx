// src/components/ResetPassword.jsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FaLock } from 'react-icons/fa';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();
  const { uid, token } = useParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      toast.error('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/password-reset-confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réinitialisation du mot de passe.');
      }

      setSuccess(data.message);
      toast.success(data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
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
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">Réinitialiser le mot de passe</h2>

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
              Nouveau mot de passe
            </label>
            <div className="flex items-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
              <FaLock className="text-gray-500 dark:text-gray-400 ml-3" />
              <input
                type="password"
                className="w-full p-2 border-0 rounded-lg bg-transparent focus:ring-0 dark:text-white"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmer le mot de passe
            </label>
            <div className="flex items-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
              <FaLock className="text-gray-500 dark:text-gray-400 ml-3" />
              <input
                type="password"
                className="w-full p-2 border-0 rounded-lg bg-transparent focus:ring-0 dark:text-white"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;