import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaChevronDown, FaChevronUp, FaSearch, FaFilePdf } from 'react-icons/fa';

// Skeleton Loading
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

const Devis = () => {
  const [devis, setDevis] = useState([]);
  const [filteredDevis, setFilteredDevis] = useState([]);
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    client_id: '',
    description: '',
    amount: '',
    status: 'pending',
    counter_offer: '',
    counter_offer_status: '',
    type_site: 'vitrine',
    fonctionnalites: '',
    design_personnalise: false,
    integration_seo: false,
    autre_details: '',
  });
  const [editId, setEditId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCounterOfferModalOpen, setIsCounterOfferModalOpen] = useState(false);
  const [counterOfferData, setCounterOfferData] = useState({ devisId: null, counter_offer: '', pdf: null });
  const [expandedRows, setExpandedRows] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDevis();
    fetchClients();
  }, []);

  useEffect(() => {
    const filtered = devis.filter(
      (d) =>
        d.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.amount.toString().includes(searchQuery)
    );
    setFilteredDevis(filtered);
  }, [searchQuery, devis]);

  const fetchDevis = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/devis/list/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      setDevis(data);
      setFilteredDevis(data);
    } catch (error) {
      console.error('Erreur lors du chargement des devis:', error);
      toast.error('Erreur lors du chargement des devis.');
      navigate('/login');
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
      const response = await fetch('http://localhost:8000/api/clients/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      toast.error('Erreur lors du chargement des clients.');
      navigate('/login');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleCounterOfferChange = (e) => {
    const { name, value, files } = e.target;
    setCounterOfferData({
      ...counterOfferData,
      [name]: files ? files[0] : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const url = editId ? `http://localhost:8000/api/devis/${editId}/` : 'http://localhost:8000/api/devis/';
    const method = editId ? 'PUT' : 'POST';

    const submissionData = {
      client_id: formData.client_id,
      description: formData.description,
      amount: parseFloat(formData.amount),
      status: formData.status,
      counter_offer: formData.counter_offer || null,
      counter_offer_status: formData.counter_offer_status || null,
      produit_details: [{
        type_site: formData.type_site,
        fonctionnalites: formData.fonctionnalites,
        design_personnalise: formData.design_personnalise,
        integration_seo: formData.integration_seo,
        autre_details: formData.autre_details,
      }],
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submissionData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la soumission');
      }
      fetchDevis();
      setFormData({
        client_id: '',
        description: '',
        amount: '',
        status: 'pending',
        counter_offer: '',
        counter_offer_status: '',
        type_site: 'vitrine',
        fonctionnalites: '',
        design_personnalise: false,
        integration_seo: false,
        autre_details: '',
      });
      setEditId(null);
      setIsModalOpen(false);
      toast.success(editId ? 'Devis modifié avec succès !' : 'Devis ajouté avec succès !');
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      toast.error(error.message || 'Erreur lors de la soumission du formulaire.');
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/devis/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression');
      fetchDevis();
      toast.success('Devis supprimé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du devis.');
    }
  };

  const handleEdit = (devisItem) => {
    const produitDetail = devisItem.produit_details[0] || {};
    setFormData({
      client_id: devisItem.client.id,
      description: devisItem.description,
      amount: devisItem.amount,
      status: devisItem.status,
      counter_offer: devisItem.counter_offer || '',
      counter_offer_status: devisItem.counter_offer_status || '',
      type_site: produitDetail.type_site || 'vitrine',
      fonctionnalites: produitDetail.fonctionnalites || '',
      design_personnalise: produitDetail.design_personnalise || false,
      integration_seo: produitDetail.integration_seo || false,
      autre_details: produitDetail.autre_details || '',
    });
    setEditId(devisItem.id);
    setIsModalOpen(true);
  };

  const handleRejectWithCounterOffer = (devisId) => {
    setCounterOfferData({ devisId, counter_offer: '', pdf: null });
    setIsCounterOfferModalOpen(true);
  };

  const handleCounterOfferSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!counterOfferData.counter_offer) {
      toast.error('La contre-proposition est requise.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('counter_offer', counterOfferData.counter_offer);
      if (counterOfferData.pdf) {
        if (!counterOfferData.pdf.name.toLowerCase().endsWith('.pdf')) {
          toast.error('Le fichier doit être un PDF.');
          return;
        }
        formData.append('specification_pdf', counterOfferData.pdf);
      }

      const response = await fetch(`http://localhost:8000/api/admin/devis/${counterOfferData.devisId}/reject-counter-offer/`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la soumission de la contre-proposition.');
      }

      const data = await response.json();
      fetchDevis();
      setIsCounterOfferModalOpen(false);
      setCounterOfferData({ devisId: null, counter_offer: '', pdf: null });
      toast.success('Contre-proposition envoyée avec succès !');
    } catch (error) {
      console.error('Erreur lors de la soumission de la contre-proposition:', error);
      toast.error(error.message || 'Erreur lors de la soumission de la contre-proposition.');
    }
  };

  const handleViewPDF = async (id) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/devis/${id}/specification-pdf/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}: `;
        try {
          const errorData = await response.json();
          errorMessage += errorData.error || 'Erreur inconnue.';
        } catch {
          if (response.status === 401) {
            errorMessage += 'Non autorisé. Veuillez vous reconnecter.';
            navigate('/login');
          } else if (response.status === 404) {
            errorMessage += 'PDF non trouvé ou devis inexistant.';
          } else if (response.status === 403) {
            errorMessage += 'Accès interdit.';
          } else {
            errorMessage += 'Erreur serveur.';
          }
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('Content-Type');
      if (!contentType.includes('application/pdf')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'La réponse n\'est pas un fichier PDF.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de la récupération du PDF:', error);
      toast.error(error.message || 'Impossible de charger le PDF.');
    }
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const statusTranslation = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    counter_offer_accepted: 'Contre-proposition acceptée',
  };

  const counterOfferStatusTranslation = {
    pending: 'En attente',
    accepted: 'Acceptée',
    rejected: 'Rejetée',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100">
      {/* Navbar */}
      <nav className="bg-gray-800 p-4 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Gestion des Devis</h1>
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
        {/* Search and Add Button */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Rechercher un devis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 pl-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setFormData({
                client_id: '',
                description: '',
                amount: '',
                status: 'pending',
                counter_offer: '',
                counter_offer_status: '',
                type_site: 'vitrine',
                fonctionnalites: '',
                design_personnalise: false,
                integration_seo: false,
                autre_details: '',
              });
              setEditId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
          >
            <FaPlus className="mr-2" />
            Ajouter un Devis
          </motion.button>
        </div>

        {/* Tableau des Devis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="p-4 text-left">Client</th>
                <th className="p-4 text-left">Montant (TND)</th>
                <th className="p-4 text-left">Statut</th>
                <th className="p-4 text-left">Contre-proposition</th>
                <th className="p-4 text-left">Date</th>
                <th className="p-4 text-left">Actions</th>
                <th className="p-4 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filteredDevis.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-500">
                    Aucun devis disponible.
                  </td>
                </tr>
              ) : (
                filteredDevis.map((d) => (
                  <React.Fragment key={d.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="p-4">{d.client.name}</td>
                      <td className="p-4">{d.amount} TND</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            d.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : d.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : d.status === 'counter_offer_accepted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {statusTranslation[d.status] || d.status}
                        </span>
                      </td>
                      <td className="p-4">{d.counter_offer || '-'}</td>
                      <td className="p-4">{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4 flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEdit(d)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <FaEdit />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(d.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrash />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRejectWithCounterOffer(d.id)}
                          className="text-yellow-500 hover:text-yellow-700"
                        >
                          Contre-proposition
                        </motion.button>
                        {d.specification_pdf && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleViewPDF(d.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <FaFilePdf />
                          </motion.button>
                        )}
                      </td>
                      <td className="p-4">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleRow(d.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {expandedRows[d.id] ? <FaChevronUp /> : <FaChevronDown />}
                        </motion.button>
                      </td>
                    </motion.tr>
                    {expandedRows[d.id] && (
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <td colSpan="7" className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="font-semibold">Description:</p>
                              <p>{d.description || '-'}</p>
                            </div>
                            <div>
                              <p className="font-semibold">Statut Contre-proposition:</p>
                              <p>{counterOfferStatusTranslation[d.counter_offer_status] || '-'}</p>
                            </div>
                            {d.produit_details && d.produit_details[0] && (
                              <>
                                <div>
                                  <p className="font-semibold">Type de Site:</p>
                                  <p>{d.produit_details[0].type_site || '-'}</p>
                                </div>
                                <div>
                                  <p className="font-semibold">Fonctionnalités:</p>
                                  <p>{d.produit_details[0].fonctionnalites || '-'}</p>
                                </div>
                                <div>
                                  <p className="font-semibold">Design Personnalisé:</p>
                                  <p>{d.produit_details[0].design_personnalise ? 'Oui' : 'Non'}</p>
                                </div>
                                <div>
                                  <p className="font-semibold">Intégration SEO:</p>
                                  <p>{d.produit_details[0].integration_seo ? 'Oui' : 'Non'}</p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="font-semibold">Autres Détails:</p>
                                  <p>{d.produit_details[0].autre_details || '-'}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal pour Ajouter/Modifier un Devis */}
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
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl shadow-lg overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{editId ? 'Modifier un Devis' : 'Ajouter un Devis'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
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
                  <div>
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
                  <div>
                    <label className="block text-sm font-medium mb-1">Statut</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="pending">En attente</option>
                      <option value="approved">Approuvé</option>
                      <option value="rejected">Rejeté</option>
                      <option value="counter_offer_accepted">Contre-proposition acceptée</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Statut Contre-proposition</label>
                    <select
                      name="counter_offer_status"
                      value={formData.counter_offer_status}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Aucun</option>
                      <option value="pending">En attente</option>
                      <option value="accepted">Acceptée</option>
                      <option value="rejected">Rejetée</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Description"
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Contre-proposition</label>
                    <textarea
                      name="counter_offer"
                      value={formData.counter_offer}
                      onChange={handleChange}
                      placeholder="Contre-proposition"
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type de Site</label>
                    <select
                      name="type_site"
                      value={formData.type_site}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="vitrine">Site Vitrine</option>
                      <option value="ecommerce">Site E-commerce</option>
                      <option value="blog">Blog</option>
                      <option value="portfolio">Portfolio</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fonctionnalités</label>
                    <input
                      type="text"
                      name="fonctionnalites"
                      value={formData.fonctionnalites}
                      onChange={handleChange}
                      placeholder="Ex. formulaire, panier"
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="design_personnalise"
                        checked={formData.design_personnalise}
                        onChange={handleChange}
                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm">Design Personnalisé</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="integration_seo"
                        checked={formData.integration_seo}
                        onChange={handleChange}
                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm">Intégration SEO</span>
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Autres Détails</label>
                    <textarea
                      name="autre_details"
                      value={formData.autre_details}
                      onChange={handleChange}
                      placeholder="Autres détails"
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition mt-4"
                >
                  {editId ? 'Modifier' : 'Ajouter'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal pour Contre-proposition */}
      <AnimatePresence>
        {isCounterOfferModalOpen && (
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
                <h3 className="text-xl font-semibold">Rejeter avec Contre-proposition</h3>
                <button onClick={() => setIsCounterOfferModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleCounterOfferSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Contre-proposition</label>
                  <textarea
                    name="counter_offer"
                    value={counterOfferData.counter_offer}
                    onChange={handleCounterOfferChange}
                    placeholder="Décrivez la contre-proposition"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Cahier des Charges (PDF)</label>
                  <input
                    type="file"
                    name="pdf"
                    accept="application/pdf"
                    onChange={handleCounterOfferChange}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition"
                >
                  Envoyer la Contre-proposition
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Devis;