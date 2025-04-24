import React, { useState, useEffect } from 'react';
import '../App.css';

const Dashboard = () => {
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        const clientsResponse = await fetch('http://localhost:8000/api/clients/', { headers });
        if (!clientsResponse.ok) throw new Error('Erreur clients');
        const clientsData = await clientsResponse.json();
        setClients(Array.isArray(clientsData) ? clientsData : []);

        const devisResponse = await fetch('http://localhost:8000/api/devis/', { headers });
        if (!devisResponse.ok) throw new Error('Erreur devis');
        const devisData = await devisResponse.json();
        setDevis(Array.isArray(devisData) ? devisData : []);

        const facturesResponse = await fetch('http://localhost:8000/api/factures/', { headers });
        if (!facturesResponse.ok) throw new Error('Erreur factures');
        const facturesData = await facturesResponse.json();
        setFactures(Array.isArray(facturesData) ? facturesData : []);

        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeClientsCount = clients.length;
  const pendingDevisCount = devis.filter(d => d.status === 'pending').length;
  const unpaidFacturesCount = factures.filter(f => f.status === 'unpaid').length;
  const totalPaidAmount = factures
    .filter(f => f.status === 'paid')
    .reduce((sum, f) => sum + parseFloat(f.amount), 0)
    .toFixed(2);

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-3">
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title">Menu</h5>
              <ul className="list-group list-group-flush">
                <li className="list-group-item"><a href="/clients" className="text-primary text-decoration-none">Clients</a></li>
                <li className="list-group-item"><a href="/devis" className="text-primary text-decoration-none">Devis</a></li>
                <li className="list-group-item"><a href="/factures" className="text-primary text-decoration-none">Factures</a></li>
                <li className="list-group-item"><a href="#" className="text-primary text-decoration-none">Analyses</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-md-9">
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="card-title">Bienvenue, Admin</h2>
              <p className="card-text text-muted">Voici un aperçu de vos activités financières.</p>
            </div>
          </div>
          {loading ? (
            <p>Chargement des données...</p>
          ) : (
            <div className="row mb-4">
              <div className="col-sm-3">
                <div className="card text-white bg-primary shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">Clients Actifs</h5>
                    <p className="card-text display-6">{activeClientsCount}</p>
                  </div>
                </div>
              </div>
              <div className="col-sm-3">
                <div className="card text-white bg-success shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">Devis en attente</h5>
                    <p className="card-text display-6">{pendingDevisCount}</p>
                  </div>
                </div>
              </div>
              <div className="col-sm-3">
                <div className="card text-white bg-warning shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">Factures impayées</h5>
                    <p className="card-text display-6">{unpaidFacturesCount}</p>
                  </div>
                </div>
              </div>
              <div className="col-sm-3">
                <div className="card text-white bg-info shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">Montant Total Payé</h5>
                    <p className="card-text display-6">{totalPaidAmount} TND</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="card-title">Activité récente</h3>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between">
                  <span>Nouveau devis soumis</span>
                  <span>10:45 AM</span>
                </li>
                <li className="list-group-item d-flex justify-content-between">
                  <span>Facture #1234 payée</span>
                  <span>Hier</span>
                </li>
                <li className="list-group-item d-flex justify-content-between">
                  <span>Anomalie détectée</span>
                  <span>15/03/2025</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;