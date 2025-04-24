import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

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
  const [lignes, setLignes] = useState([]);
  const [newLigne, setNewLigne] = useState({ designation: '', prix_unitaire: '', quantite: '' });
  const [editId, setEditId] = useState(null);
  const [file, setFile] = useState(null);
  const [ocrError, setOcrError] = useState(null);
  const [fetchError, setFetchError] = useState(null); // Ajout d'un état pour gérer les erreurs de fetch
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
      const response = await fetch('http://localhost:8000/api/factures/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des factures');
      }
      const data = await response.json();
      const formattedData = data.map(facture => ({
        ...facture,
        lignes: facture.lignes.map(ligne => ({
          ...ligne,
          prix_unitaire: parseFloat(ligne.prix_unitaire),
          total: parseFloat(ligne.total),
        })),
      }));
      setFactures(formattedData);
      setFetchError(null); // Réinitialiser l'erreur si la requête réussit
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
      setFetchError('Impossible de charger les factures. Veuillez réessayer plus tard.');
      // Ne pas rediriger vers /login ici, sauf si c'est une erreur 401
      if (error.message.includes('401')) {
        navigate('/login');
      }
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
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des clients');
      }
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      setFetchError('Impossible de charger les clients. Veuillez réessayer plus tard.');
      if (error.message.includes('401')) {
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
      const response = await fetch('http://localhost:8000/api/devis/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des devis');
      }
      const data = await response.json();
      setDevis(data);
    } catch (error) {
      console.error('Erreur lors du chargement des devis:', error);
      setFetchError('Impossible de charger les devis. Veuillez réessayer plus tard.');
      if (error.message.includes('401')) {
        navigate('/login');
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLigneChange = (e) => {
    const { name, value } = e.target;
    setNewLigne({ ...newLigne, [name]: value });
  };

  const addLigne = () => {
    const { designation, prix_unitaire, quantite } = newLigne;
    if (!designation || !prix_unitaire || !quantite) {
      alert('Veuillez remplir tous les champs de la ligne.');
      return;
    }

    const prixUnitaireNum = parseFloat(prix_unitaire);
    const quantiteNum = parseInt(quantite);
    const total = prixUnitaireNum * quantiteNum;
    setLignes([...lignes, { designation, prix_unitaire: prixUnitaireNum, quantite: quantiteNum, total }]);
    setNewLigne({ designation: '', prix_unitaire: '', quantite: '' });
  };

  const removeLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
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
    const method = editId ? 'PUT' : 'POST';

    const totalAmount = lignes.reduce((sum, ligne) => sum + ligne.total, 0);

    const dataToSend = {
      ...formData,
      amount: totalAmount,
      lignes: lignes.map(ligne => ({
        designation: ligne.designation,
        prix_unitaire: ligne.prix_unitaire,
        quantite: ligne.quantite,
        total: ligne.total,
      })),
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });
      if (response.ok) {
        fetchFactures();
        setFormData({ client_id: '', devis_id: '', invoice_number: '', amount: '', status: 'unpaid' });
        setLignes([]);
        setEditId(null);
      } else {
        const errorData = await response.json();
        console.error('Erreur lors de la soumission:', errorData);
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setFetchError('Erreur lors de la soumission de la facture. Veuillez réessayer.');
      if (error.message.includes('401')) {
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
      setOcrError("Veuillez sélectionner un fichier.");
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:8000/api/factures/ocr/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        fetchFactures();
        setFile(null);
        setOcrError(null);
      } else {
        setOcrError(result.error || "Erreur inconnue lors de l’OCR");
      }
    } catch (error) {
      console.error('Erreur lors de l’OCR:', error);
      setOcrError("Erreur réseau ou serveur indisponible");
      if (error.message.includes('401')) {
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

    try {
      const response = await fetch(`http://localhost:8000/api/factures/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchFactures();
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setFetchError('Erreur lors de la suppression de la facture.');
      if (error.message.includes('401')) {
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
    const formattedLignes = facture.lignes.map(ligne => ({
      ...ligne,
      prix_unitaire: parseFloat(ligne.prix_unitaire),
      total: parseFloat(ligne.total),
    }));
    setLignes(formattedLignes);
    setEditId(facture.id);
  };

  const handleDownloadPDF = async (id) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/factures/${id}/pdf/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      setFetchError('Erreur lors du téléchargement du PDF.');
      if (error.message.includes('401')) {
        navigate('/login');
      }
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <div className="container my-5">
        <h2 className="mb-4 text-dark fw-bold">Gestion des Factures</h2>

        {/* Afficher les erreurs de fetch */}
        {fetchError && <div className="alert alert-danger">{fetchError}</div>}

        {/* Formulaire manuel */}
        <div className="card mb-5 shadow-lg border-0 rounded-3">
          <div className="card-body p-4">
            <h5 className="card-title text-primary fw-semibold">{editId ? 'Modifier une Facture' : 'Ajouter une Facture'}</h5>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <select className="form-select border-0 shadow-sm" name="client_id" value={formData.client_id} onChange={handleChange} required>
                    <option value="">Choisir un client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <select className="form-select border-0 shadow-sm" name="devis_id" value={formData.devis_id} onChange={handleChange}>
                    <option value="">Aucun devis</option>
                    {devis.map((d) => (
                      <option key={d.id} value={d.id}>{d.description} - {d.amount} TND</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control border-0 shadow-sm"
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleChange}
                    placeholder="Numéro de facture"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <select className="form-select border-0 shadow-sm" name="status" value={formData.status} onChange={handleChange}>
                    <option value="unpaid">Impayée</option>
                    <option value="paid">Payée</option>
                    <option value="overdue">En retard</option>
                  </select>
                </div>

                {/* Section pour ajouter des lignes de produits */}
                <div className="col-12 mt-4">
                  <h6 className="text-primary fw-semibold">Ajouter des produits</h6>
                  <div className="row g-3 mb-3">
                    <div className="col-md-3">
                      <input
                        type="text"
                        className="form-control border-0 shadow-sm"
                        name="designation"
                        value={newLigne.designation}
                        onChange={handleLigneChange}
                        placeholder="Désignation"
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control border-0 shadow-sm"
                        name="prix_unitaire"
                        value={newLigne.prix_unitaire} // Corrigé ici
                        onChange={handleLigneChange}
                        placeholder="Prix unitaire (DT)"
                        step="0.001"
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control border-0 shadow-sm"
                        name="quantite"
                        value={newLigne.quantite}
                        onChange={handleLigneChange}
                        placeholder="Quantité"
                      />
                    </div>
                    <div className="col-md-3">
                      <button type="button" className="btn btn-success px-4 py-2 fw-semibold rounded-3" onClick={addLigne}>
                        Ajouter Ligne
                      </button>
                    </div>
                  </div>

                  {/* Liste des lignes ajoutées */}
                  {lignes.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th>Désignation</th>
                            <th>Prix unitaire (DT)</th>
                            <th>Quantité</th>
                            <th>Total (DT)</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lignes.map((ligne, index) => (
                            <tr key={index}>
                              <td>{ligne.designation}</td>
                              <td>{Number(ligne.prix_unitaire).toFixed(3)}</td>
                              <td>{ligne.quantite}</td>
                              <td>{Number(ligne.total).toFixed(3)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm rounded-3"
                                  onClick={() => removeLigne(index)}
                                >
                                  Supprimer
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="col-12">
                  <button type="submit" className="btn btn-primary px-4 py-2 fw-semibold rounded-3">
                    {editId ? 'Modifier' : 'Ajouter'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Formulaire OCR */}
        <div className="card mb-5 shadow-lg border-0 rounded-3">
          <div className="card-body p-4">
            <h5 className="card-title text-primary fw-semibold">Importer une Facture via OCR</h5>
            <form onSubmit={handleOCRSubmit}>
              <div className="mb-3">
                <input type="file" className="form-control border-0 shadow-sm" onChange={handleFileChange} accept="image/*,.pdf" />
              </div>
              {ocrError && <div className="alert alert-danger">{ocrError}</div>}
              <button type="submit" className="btn btn-success px-4 py-2 fw-semibold rounded-3">Analyser et Ajouter</button>
            </form>
          </div>
        </div>

        {/* Liste */}
        <div className="card shadow-lg border-0 rounded-3">
          <div className="card-body p-4">
            <h5 className="card-title text-primary fw-semibold mb-4">Liste des Factures</h5>
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Numéro</th>
                    <th>Client</th>
                    <th>Devis</th>
                    <th>Montant (TND)</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((f) => (
                    <tr key={f.id}>
                      <td>{f.invoice_number}</td>
                      <td>{f.client.name}</td>
                      <td>{f.devis ? `${f.devis.description} (${f.devis.amount} TND)` : 'Aucun'}</td>
                      <td>{f.amount} TND</td>
                      <td>
                        <span className={`badge ${f.status === 'paid' ? 'bg-success' : f.status === 'overdue' ? 'bg-danger' : 'bg-warning'}`}>
                          {f.status === 'unpaid' ? 'Impayée' : f.status === 'paid' ? 'Payée' : 'En retard'}
                        </span>
                      </td>
                      <td>{new Date(f.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-outline-warning btn-sm me-2 rounded-3" onClick={() => handleEdit(f)}>Modifier</button>
                        <button className="btn btn-outline-danger btn-sm me-2 rounded-3" onClick={() => handleDelete(f.id)}>Supprimer</button>
                        <button className="btn btn-outline-primary btn-sm rounded-3" onClick={() => handleDownloadPDF(f.id)}>PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Factures;