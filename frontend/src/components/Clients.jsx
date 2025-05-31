import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaTrash, FaHistory, FaPlus, FaTimes, FaSearch } from 'react-icons/fa';

// Fonction pour Skeleton Loading
const SkeletonRow = () => (
  <tr>
    <td colSpan="4" className="p-4">
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </td>
  </tr>
);

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]); // State for filtered clients
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [editId, setEditId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    // Filter clients based on search query
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  const fetchClients = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/clients/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      setClients(data);
      setFilteredClients(data); // Initialize filtered clients
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      toast.error('Erreur lors du chargement des clients.');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorique = async (clientId) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/clients/${clientId}/historique/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      setHistorique(data);
    } catch (error) {
      console.error('Erreur lors du chargement de l’historique:', error);
      setHistorique([]);
      toast.error('Erreur lors du chargement de l’historique.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const url = editId ? `http://localhost:8000/api/clients/${editId}/` : 'http://localhost:8000/api/clients/';
    const method = editId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Erreur lors de la soumission');
      const data = await response.json();
      const action = editId ? 'Client modifié' : 'Client ajouté';
      await fetch('http://localhost:8000/api/clients/historique/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ client_id: editId || data.id, action }),
      });
      fetchClients();
      setFormData({ name: '', email: '', phone: '' });
      setEditId(null);
      setIsModalOpen(false);
      toast.success(editId ? 'Client modifié avec succès !' : 'Client ajouté avec succès !');
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      toast.error('Erreur lors de la soumission du formulaire.');
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
      await fetch('http://localhost:8000/api/clients/historique/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ client_id: id, action: 'Client supprimé' }),
      });
      const response = await fetch(`http://localhost:8000/api/clients/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression');
      fetchClients();
      toast.success('Client supprimé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du client.');
    }
  };

  const handleEdit = (client) => {
    setFormData({ name: client.name, email: client.email, phone: client.phone });
    setEditId(client.id);
    setIsModalOpen(true);
  };

  const showHistorique = (clientId) => {
    setSelectedClientId(clientId);
    fetchHistorique(clientId);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Navbar */}
      <nav className="bg-gray-800 p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Gestion des Clients</h1>
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
        {/* Bouton pour Ajouter un Client et Recherche */}
        <div className="mb-6 flex justify-between items-center">
          <div className="relative w-1/3">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Rechercher par nom, email ou téléphone..."
              className="w-full p-2 pl-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setFormData({ name: '', email: '', phone: '' });
              setEditId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
          >
            <FaPlus className="mr-2" />
            Ajouter un Client
          </motion.button>
        </div>

        {/* Tableau des Clients */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="p-4 text-left">Nom</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Téléphone</th>
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
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">
                    Aucun client trouvé.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="p-4">{client.name}</td>
                    <td className="p-4">{client.email}</td>
                    <td className="p-4">{client.phone}</td>
                    <td className="p-4 flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(client)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <FaEdit />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(client.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => showHistorique(client.id)}
                        className="text-green-500 hover:text-green-700"
                      >
                        <FaHistory />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Section Historique */}
        <AnimatePresence>
          {selectedClientId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            >
              <h5 className="text-xl font-semibold mb-4">Historique du Client #{selectedClientId}</h5>
              {historique.length === 0 ? (
                <p className="text-gray-500">Aucune interaction enregistrée.</p>
              ) : (
                <ul className="space-y-2">
                  {historique.map((entry) => (
                    <motion.li
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      {entry.action} - {new Date(entry.date).toLocaleString('fr-FR', { hour12: false })}
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal pour Ajouter/Modifier un Client */}
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
                  {editId ? 'Modifier un Client' : 'Ajouter un Client'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nom"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Téléphone"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    required
                  />
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
    </div>
  );
};

export default Clients;