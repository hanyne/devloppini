import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaTrash, FaFilePdf, FaPlus, FaTimes, FaUpload } from 'react-icons/fa';

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td colSpan="7" className="p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        await Promise.all([fetchFactures(token), fetchClients(token), fetchDevis(token)]);
      } catch (err) {
        setError('Erreur lors du chargement des données.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const fetchFactures = async (token) => {
    try {
      const response = await axios.get('http://localhost:8000/api/factures/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFactures(response.data);
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des factures.');
    }
  };

  const fetchClients = async (token) => {
    try {
      const response = await axios.get('http://localhost:8000/api/clients/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data);
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des clients.');
    }
  };

  const fetchDevis = async (token) => {
    try {
      const response = await axios.get('http://localhost:8000/api/devis/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevis(response.data);
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des devis.');
    }
  };

  const handleError = (error, defaultMessage) => {
    const message = error.response?.data?.error || defaultMessage;
    setError(message);
    if (error.response?.status === 401) {
      navigate('/login');
    }
    console.error(defaultMessage, error);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('access_token');
  if (!token) {
    setError('Vous devez être connecté.');
    navigate('/login');
    return;
  }

  const data = {
    client_id: formData.client_id,
    devis_id: formData.devis_id || null, // Handle nullable devis_id
    invoice_number: formData.invoice_number,
    amount: parseFloat(formData.amount) || 0,
    status: formData.status,
  };

  try {
    const url = editId
      ? `http://localhost:8000/api/factures/${editId}/`
      : 'http://localhost:8000/api/factures/';
    const method = editId ? 'put' : 'post';

    await axios({
      method,
      url,
      data,
      headers: { Authorization: `Bearer ${token}` },
    });

    setSuccess(editId ? 'Facture modifiée.' : 'Facture créée.');
    setFormData({ client_id: '', devis_id: '', invoice_number: '', amount: '', status: 'unpaid' });
    setEditId(null);
    setIsModalOpen(false);
    fetchFactures(token);
    setTimeout(() => setSuccess(null), 3000);
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de la soumission.';
    setError(message);
    if (error.response?.status === 401) {
      navigate('/login');
    } else if (error.response?.status === 400) {
      console.error('Validation errors:', error.response.data);
      setError(JSON.stringify(error.response.data));
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
      setError('Veuillez sélectionner un fichier.');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('image', file);
      await axios.post('http://localhost:8000/api/facture/ocr/', formDataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Facture importée via OCR avec succès.');
      setFile(null);
      setIsOCRModalOpen(false);
      fetchFactures(token);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      handleError(error, 'Erreur lors de l’importation OCR.');
    }
  };

  const handleDelete = async (id) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    setError('Vous devez être connecté.');
    navigate('/login');
    return;
  }
  if (!window.confirm('Confirmer la suppression de la facture ?')) return;

  try {
    await axios.delete(`http://localhost:8000/api/factures/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSuccess('Facture supprimée avec succès.');
    fetchFactures(token); // Refetch to update UI
    setTimeout(() => setSuccess(null), 3000);
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de la suppression.';
    setError(message);
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      navigate('/login');
    } else if (error.response?.status === 404) {
      setError('Facture non trouvée.');
    }
    console.error('Delete error:', error);
  }
};
  const handleEdit = (facture) => {
  setFormData({
    client_id: facture.client?.id?.toString() || '',
    devis_id: facture.devis?.id?.toString() || '',
    invoice_number: facture.invoice_number || '',
    amount: facture.amount?.toString() || '',
    status: facture.status || 'unpaid',
  });
  setEditId(facture.id);
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

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleError(error, 'Erreur lors du téléchargement du PDF.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="bg-gray-800 p-4 shadow">
        <div className="container mx-auto flex justify-between">
          <h1 className="text-2xl font-bold text-white">Gestion des Factures</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white hover:text-gray-300"
          >
            Retour
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="mb-6 flex justify-end space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => {
              setFormData({ client_id: '', devis_id: '', invoice_number: '', amount: '', status: 'unpaid' });
              setEditId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg"
          >
            <FaPlus className="mr-2" /> Ajouter
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsOCRModalOpen(true)}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            <FaUpload className="mr-2" /> Importer OCR
          </motion.button>
        </div>

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 bg-green-100 text-green-800 p-3 rounded"
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 bg-red-100 text-red-800 p-3 rounded"
          >
            {error}
          </motion.div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
                Array(3).fill().map((_, i) => <SkeletonRow key={i} />)
              ) : factures.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-500">
                    Aucune facture.
                  </td>
                </tr>
              ) : (
                factures.map((f) => (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="p-4">{f.invoice_number}</td>
                    <td className="p-4">{f.client?.name || 'N/A'}</td>
                    <td className="p-4">{f.devis ? `${f.devis.description} (${f.devis.amount} TND)` : 'Aucun'}</td>
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
                    <td className="p-4">{new Date(f.created_at).toLocaleDateString()}</td>
                    <td className="p-4 flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => handleEdit(f)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <FaEdit />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => handleDelete(f.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
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

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
            >
              <div className="flex justify-between mb-4">
                <h3 className="text-xl font-semibold">{editId ? 'Modifier Facture' : 'Ajouter Facture'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium">Client</label>
                  <select
                    name="client_id"
                    value={formData.client_id}
                    onChange={handleChange}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Choisir un client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium">Devis</label>
                  <select
                    name="devis_id"
                    value={formData.devis_id}
                    onChange={handleChange}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Aucun devis</option>
                    {devis.map((d) => (
                      <option key={d.id} value={d.id}>{d.description} - {d.amount} TND</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium">Numéro de facture</label>
                  <input
                    type="text"
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleChange}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium">Montant (TND)</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium">Statut</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                  >
                    <option value="unpaid">Impayée</option>
                    <option value="paid">Payée</option>
                    <option value="overdue">En retard</option>
                  </select>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2 rounded"
                >
                  {editId ? 'Modifier' : 'Ajouter'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOCRModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
            >
              <div className="flex justify-between mb-4">
                <h3 className="text-xl font-semibold">Importer via OCR</h3>
                <button onClick={() => setIsOCRModalOpen(false)} className="text-gray-500">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleOCRSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium">Fichier (Image/PDF)</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  type="submit"
                  className="w-full bg-green-600 text-white py-2 rounded"
                >
                  Importer
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