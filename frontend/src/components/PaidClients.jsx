// src/components/PaidClients.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFilePdf, FaPaperPlane, FaArrowLeft, FaSearch } from 'react-icons/fa';

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td colSpan="6" className="p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </td>
  </tr>
);

const PaidClients = () => {
  const [factures, setFactures] = useState([]);
  const [filteredFactures, setFilteredFactures] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPaidFactures = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/api/factures/?status=paid', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('API Response:', response.data); // Debug: Log the API response
        setFactures(response.data);
        setFilteredFactures(response.data);
      } catch (err) {
        setError('Erreur lors du chargement des factures payées.');
        console.error(err);
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPaidFactures();
  }, [navigate]);

  useEffect(() => {
    const filtered = factures
      .filter(facture => facture.status === 'paid') // Ensure only paid invoices
      .filter(facture =>
        (facture.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        facture.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facture.amount.toString().includes(searchQuery)
      );
    setFilteredFactures(filtered);
  }, [searchQuery, factures]);

  const handleDownloadPDF = async (id, invoiceNumber) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`http://localhost:8000/api/facture/${id}/pdf/`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${invoiceNumber || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé avec succès.');
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      const message = error.response?.data?.error || 'Erreur lors du téléchargement du PDF.';
      setError(message);
      toast.error(message);
    }
  };

  const handleSendEmail = async (facture) => {
    if (!window.confirm(`Envoyer la facture ${facture.invoice_number} à ${facture.client.name} (${facture.client.email}) ?`)) {
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:8000/api/factures/${facture.id}/send-email/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(response.data.message);
      toast.success(response.data.message);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      const message = error.response?.data?.error || 'Erreur lors de l’envoi de l’email.';
      setError(message);
      toast.error(message);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="bg-gray-800 p-4 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Clients avec Factures Payées</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-white hover:text-gray-300"
          >
            <FaArrowLeft className="mr-2" /> Retour
          </motion.button>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 bg-green-100 text-green-800 p-3 rounded-lg shadow"
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 bg-red-100 text-red-800 p-3 rounded-lg shadow"
          >
            {error}
          </motion.div>
        )}

        <div className="mb-6">
          <div className="relative w-1/3">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Rechercher par client, numéro ou montant..."
              className="w-full p-2 pl-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-4 text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
            {filteredFactures.length} facture{filteredFactures.length !== 1 ? 's' : ''} payée{filteredFactures.length !== 1 ? 's' : ''} trouvée{filteredFactures.length !== 1 ? 's' : ''}
          </div>
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="p-4 text-left">Client</th>
                <th className="p-4 text-left">Numéro de Facture</th>
                <th className="p-4 text-left">Montant (TND)</th>
                <th className="p-4 text-left">Statut</th>
                <th className="p-4 text-left">PDF</th>
                <th className="p-4 text-left">Envoyer Email</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(3).fill().map((_, i) => <SkeletonRow key={i} />)
              ) : filteredFactures.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500 dark:text-gray-400">
                    Aucune facture payée trouvée.
                  </td>
                </tr>
              ) : (
                filteredFactures.map((f) => (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="p-4">{f.client?.name || 'N/A'}</td>
                    <td className="p-4">{f.invoice_number}</td>
                    <td className="p-4">{f.amount} TND</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded ${
                          f.status === 'paid' ? 'bg-green-200 text-green-800' :
                          f.status === 'overdue' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                        }`}
                      >
                        {f.status === 'unpaid' ? 'Impayée' : f.status === 'paid' ? 'Payée' : 'En retard'}
                      </span>
                    </td>
                    <td className="p-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => handleDownloadPDF(f.id, f.invoice_number)}
                        className="text-indigo-500 hover:text-indigo-700"
                      >
                        <FaFilePdf />
                      </motion.button>
                    </td>
                    <td className="p-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => handleSendEmail(f)}
                        className="text-green-500 hover:text-green-700"
                        disabled={f.status !== 'paid'} // Disable if not paid
                      >
                        <FaPaperPlane />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaidClients;