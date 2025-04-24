import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Ajout pour redirection
import '../App.css';

const Devis = () => {
  const [devis, setDevis] = useState([]);
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({ client_id: '', description: '', amount: '', status: 'pending' });
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate(); // Ajout pour redirection

  useEffect(() => {
    fetchDevis();
    fetchClients();
  }, []);

  const fetchDevis = async () => {
    const token = localStorage.getItem('access_token'); // Récupération du token
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/devis/', {
        headers: { 'Authorization': `Bearer ${token}` }, // Ajout du token
      });
      const data = await response.json();
      setDevis(data);
    } catch (error) {
      console.error('Erreur lors du chargement des devis:', error);
      navigate('/login'); // Redirection en cas d'erreur (ex. 401)
    }
  };

  const fetchClients = async () => {
    const token = localStorage.getItem('access_token'); // Récupération du token
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/clients/', {
        headers: { 'Authorization': `Bearer ${token}` }, // Ajout du token
      });
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      navigate('/login'); // Redirection en cas d'erreur (ex. 401)
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token'); // Récupération du token
    if (!token) {
      navigate('/login');
      return;
    }

    const url = editId ? `http://localhost:8000/api/devis/${editId}/` : 'http://localhost:8000/api/devis/';
    const method = editId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Ajout du token
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        fetchDevis();
        setFormData({ client_id: '', description: '', amount: '', status: 'pending' });
        setEditId(null);
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      navigate('/login'); // Redirection en cas d'erreur (ex. 401)
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('access_token'); // Récupération du token
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await fetch(`http://localhost:8000/api/devis/${id}/`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }, // Ajout du token
      });
      fetchDevis();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      navigate('/login'); // Redirection en cas d'erreur (ex. 401)
    }
  };

  const handleEdit = (devis) => {
    setFormData({ client_id: devis.client.id, description: devis.description, amount: devis.amount, status: devis.status });
    setEditId(devis.id);
  };

  return (
    <div className="min-vh-100 bg-light">
     
      <div className="container mt-4">
        <h2 className="mb-4">Gestion des Devis</h2>

        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <h5 className="card-title">{editId ? 'Modifier un Devis' : 'Ajouter un Devis'}</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <select
                  className="form-select"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Choisir un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <textarea
                  className="form-control"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Description"
                  required
                />
              </div>
              <div className="mb-3">
                <input
                  type="number"
                  className="form-control"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Montant (TND)"
                  step="0.01"
                  required
                />
              </div>
              <div className="mb-3">
                <select
                  className="form-select"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvé</option>
                  <option value="rejected">Rejeté</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                {editId ? 'Modifier' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Liste des Devis</h5>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Description</th>
                  <th>Montant (TND)</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devis.map((d) => (
                  <tr key={d.id}>
                    <td>{d.client.name}</td>
                    <td>{d.description}</td>
                    <td>{d.amount} TND</td>
                    <td>{d.status === 'pending' ? 'En attente' : d.status === 'approved' ? 'Approuvé' : 'Rejeté'}</td>
                    <td>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => handleEdit(d)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(d.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Devis;