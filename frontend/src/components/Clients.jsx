import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [editId, setEditId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null); // Pour afficher l'historique d'un client
  const [historique, setHistorique] = useState([]); // Stocke l'historique
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/clients/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      navigate('/login');
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
      const data = await response.json();
      setHistorique(data);
    } catch (error) {
      console.error('Erreur lors du chargement de l’historique:', error);
      setHistorique([]);
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
      if (response.ok) {
        fetchClients();
        setFormData({ name: '', email: '', phone: '' });
        setEditId(null);
        // Ajouter à l'historique
        const action = editId ? 'Client modifié' : 'Client ajouté';
        await fetch('http://localhost:8000/api/clients/historique/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ client_id: editId || (await response.json()).id, action }),
        });
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      navigate('/login');
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await fetch(`http://localhost:8000/api/clients/${id}/`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      // Ajouter à l'historique avant suppression
      await fetch('http://localhost:8000/api/clients/historique/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ client_id: id, action: 'Client supprimé' }),
      });
      fetchClients();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      navigate('/login');
    }
  };

  const handleEdit = (client) => {
    setFormData({ name: client.name, email: client.email, phone: client.phone });
    setEditId(client.id);
  };

  const showHistorique = (clientId) => {
    setSelectedClientId(clientId);
    fetchHistorique(clientId);
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-dark bg-dark shadow">
        
      </nav>

      <div className="container mt-4">
        <h2 className="mb-4">Gestion des Clients</h2>

        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <h5 className="card-title">{editId ? 'Modifier un Client' : 'Ajouter un Client'}</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nom"
                  required
                />
              </div>
              <div className="mb-3">
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                />
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Téléphone"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                {editId ? 'Modifier' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Liste des Clients</h5>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.email}</td>
                    <td>{client.phone}</td>
                    <td>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => handleEdit(client)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn btn-danger btn-sm me-2"
                        onClick={() => handleDelete(client.id)}
                      >
                        Supprimer
                      </button>
                      <button
                        className="btn btn-info btn-sm"
                        onClick={() => showHistorique(client.id)}
                      >
                        Historique
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section Historique */}
        {selectedClientId && (
          <div className="card shadow-sm mt-4">
            <div className="card-body">
              <h5 className="card-title">Historique du client #{selectedClientId}</h5>
              {historique.length === 0 ? (
                <p>Aucune interaction enregistrée.</p>
              ) : (
                <ul className="list-group">
                  {historique.map((entry) => (
                    <li key={entry.id} className="list-group-item">
                      {entry.action} - {new Date(entry.date).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;