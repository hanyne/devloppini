import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaTrash, FaFilePdf, FaPlus, FaTimes, FaUpload } from 'react-icons/fa';

// Fonction pour Skeleton Loading
const SkeletonRow = () => (
  <tr>
    <td colSpan="7" className="p-4">
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </td>
  </tr>
);

const Factures = () => {
  const [factures, setFactures] = useState([]);
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [formData, setFormData] = useState({
    client_id: '',
    devis_id: '',
    invoice_number: '',
    amount: '',
    status: 'unpaid',
  });
  const [editId, setEditId] = useState(null);
  const [file, setFile] = useState(null);
  const [ocrError, setOcrError] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFactures();
    fetchClients();
    fetchDevis();
  }, []);

  const fetchFactures = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/factures/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFactures(response.data);
      setFetchError(null);
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
      setFetchError('Impossible de charger les factures. Veuillez réessayer plus tard.');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get('http://localhost:8000/api/clients/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      setFetchError('Impossible de charger les clients. Veuillez réessayer plus tard.');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const fetchDevis = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get('http://localhost:8000/api/devis/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevis(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des devis:', error);
      setFetchError('Impossible de charger les devis. Veuillez réessayer plus tard.');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setOcrError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const url = editId ? `http://localhost:8000/api/factures/${editId}/` : 'http://localhost:8000/api/factures/';
    const method = editId ? 'put' : 'post';

    try {
      const response = await axios({
        method,
        url,
        data: formData,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccessMessage(editId ? 'Facture modifiée avec succès.' : 'Facture créée avec succès. Un SMS a été envoyé au client.');
      fetchFactures();
      setFormData({ client_id: '', devis_id: '', invoice_number: '', amount: '', status: 'unpaid' });
      setEditId(null);
      setIsModalOpen(false);
      setFetchError(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de la soumission de la facture.';
      setFetchError(errorMessage);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleOCRSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!file) {
      setOcrError('Veuillez sélectionner un fichier.');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('image', file);

    try {
      const response = await axios.post('http://localhost:8000/api/facture/ocr/', formDataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMessage('Facture importée via OCR avec succès.');
      fetchFactures();
      setFile(null);
      setOcrError(null);
      setIsOCRModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Erreur lors de l’OCR:', error);
      setOcrError(error.response?.data?.error || 'Erreur réseau ou serveur indisponible');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;

    try {
      await axios.delete(`http://localhost:8000/api/factures/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFactures();
      setFetchError(null);
      toast.success('Facture supprimée avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setFetchError('Erreur lors de la suppression de la facture.');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleEdit = (facture) => {
    setFormData({
      client_id: facture.client.id,
      devis_id: facture.devis ? facture.devis.id : '',
      invoice_number: facture.invoice_number,
      amount: facture.amount,
      status: facture.status,
    });
    setEditId(facture.id);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleDownloadPDF = async (id) => {
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

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      setFetchError('Erreur lors du téléchargement du PDF.');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Navbar */}
      <nav className="bg-gray-800 p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Gestion des Factures</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white hover:text-gray-300 transition"
          >
            Retour au Dashboard
          </button>
        </div>
      </nav>

      {/* Contenu Principal */}
      <div className="container mx-auto p-6">
        {/* Boutons pour Ajouter et OCR */}
        <div className="mb-6 flex justify-end space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setFormData({ client_id: '', devis_id: '', invoice_number: '', amount: '', status: 'unpaid' });
              setEditId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
          >
            <FaPlus className="mr-2" />
            Ajouter une Facture
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setFile(null);
              setOcrError(null);
              setIsOCRModalOpen(true);
            }}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition"
          >
            <FaUpload className="mr-2" />
            Importer via OCR
          </motion.button>
        </div>

        {/* Messages de succès ou erreur */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 bg-green-100 text-green-800 p-3 rounded-lg"
          >
            {successMessage}
          </motion.div>
        )}
        {fetchError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 bg-red-100 text-red-800 p-3 rounded-lg"
          >
            {fetchError}
          </motion.div>
        )}

        {/* Tableau des Factures */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="p-4 text-left">Numéro</th>
                <th className="p-4 text-left">Client</th>
                <th className="p-4 text-left">Devis</th>
                <th className="p-4 text-left">Montant (TND)</th>
                <th className="p-4 text-left">Statut</th>
                <th className="p-4 text-left">Date</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : factures.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-500">
                    Aucune facture disponible.
                  </td>
                </tr>
              ) : (
                factures.map((f) => (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="p-4">{f.invoice_number}</td>
                    <td className="p-4">{f.client.name}</td>
                    <td className="p-4">{f.devis ? `${f.devis.description} (${f.devis.amount} TND)` : 'Aucun'}</td>
                    <td className="p-4">{f.amount} TND</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded ${
                          f.status === 'paid' ? 'bg-green-200 text-green-800' : f.status === 'overdue' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                        }`}
                      >
                        {f.status === 'unpaid' ? 'Impayée' : f.status === 'paid' ? 'Payée' : 'En retard'}
                      </span>
                    </td>
                    <td className="p-4">{new Date(f.created_at).toLocaleDateString()}</td>
                    <td className="p-4 flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(f)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <FaEdit />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(f.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDownloadPDF(f.id)}
                        className="text-indigo-500 hover:text-indigo-700"
                      >
                        <FaFilePdf />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal pour Ajouter/Modifier une Facture */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {editId ? 'Modifier une Facture' : 'Ajouter une Facture'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Client</label>
                  <select
                    name="client_id"
                    value={formData.client_id}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Choisir un client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Devis</label>
                  <select
                    name="devis_id"
                    value={formData.devis_id}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Aucun devis</option>
                    {devis.map((d) => (
                      <option key={d.id} value={d.id}>{d.description} - {d.amount} TND</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Numéro de facture</label>
                  <input
                    type="text"
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleChange}
                    placeholder="Numéro de facture"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Montant (TND)</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="Montant (TND)"
                    step="0.01"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="unpaid">Impayée</option>
                    <option value="paid">Payée</option>
                    <option value="overdue">En retard</option>
                  </select>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  {editId ? 'Modifier' : 'Ajouter'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal pour OCR */}
      <AnimatePresence>
        {isOCRModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Importer une Facture via OCR</h3>
                <button onClick={() => setIsOCRModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleOCRSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Fichier (Image ou PDF)</label>
                  <input
                    type="file"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-green-500"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                  />
                </div>
                {ocrError && <div className="text-red-500 text-sm mb-4">{ocrError}</div>}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Analyser et Ajouter
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Factures;