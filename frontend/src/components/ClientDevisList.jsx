import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ClientDevisList = () => {
  const [devisList, setDevisList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();

  // Map English status to French
  const statusTranslation = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
  };

  useEffect(() => {
    const fetchDevis = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setErrorMessage('Vous devez être connecté pour voir vos devis.');
          navigate('/login');
          return;
        }

        const decodedToken = jwtDecode(token);
        if (!decodedToken.client_id) {
          setErrorMessage('Session invalide : client_id manquant. Veuillez vous reconnecter.');
          navigate('/login');
          return;
        }

        const response = await fetch('http://localhost:8000/api/devis/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setDevisList(data);
        } else {
          const errorData = await response.json();
          setErrorMessage(errorData.error || 'Erreur lors de la récupération des devis.');
        }
      } catch (error) {
        console.error('Erreur réseau:', error);
        setErrorMessage('Erreur réseau ou serveur indisponible.');
      } finally {
        setLoading(false);
      }
    };

    fetchDevis();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-12 animate-fade-in">
          Mes Devis
        </h2>
        {errorMessage && (
          <div className="alert alert-danger mb-8 max-w-3xl mx-auto bg-red-100 text-red-700 p-4 rounded-lg">
            {errorMessage}
          </div>
        )}
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <p className="text-gray-600 text-center">Chargement des devis...</p>
          ) : devisList.length === 0 ? (
            <p className="text-gray-600 text-center">Aucun devis trouvé.</p>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-2xl animate-fade-in-delayed">
              {devisList.map((devis) => (
                <div
                  key={devis.id}
                  className="border-b border-gray-200 py-4 hover:bg-gray-50 transition-all duration-300"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-800">
                        Devis #{devis.id} - {devis.description}
                      </p>
                      <p className="text-gray-600">Montant: {devis.amount} TND</p>
                      <p className="text-gray-600">
                        Statut: {statusTranslation[devis.status] || devis.status}
                      </p>
                      <p className="text-gray-600">
                        Créé le: {new Date(devis.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          devis.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : devis.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {statusTranslation[devis.status] || devis.status}
                      </span>
                    </div>
                  </div>
                  {devis.produit_details && devis.produit_details.length > 0 && (
                    <div className="mt-4 text-gray-600">
                      <p>Type de site: {devis.produit_details[0].type_site}</p>
                      <p>Fonctionnalités: {devis.produit_details[0].fonctionnalites || 'Aucune'}</p>
                      <p>Design personnalisé: {devis.produit_details[0].design_personnalise ? 'Oui' : 'Non'}</p>
                      <p>SEO: {devis.produit_details[0].integration_seo ? 'Oui' : 'Non'}</p>
                      <p>Détails: {devis.produit_details[0].autre_details || 'Aucun'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDevisList;