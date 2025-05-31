// ClientDevisList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaFilePdf } from 'react-icons/fa';

const ClientDevisList = () => {
  const [devisList, setDevisList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState({}); // Track PDF loading state per devis
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();

  const statusTranslation = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
  };

  const counterOfferStatusTranslation = {
    pending: 'En attente',
    accepted: 'Acceptée',
    rejected: 'Rejetée',
  };

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
      if (decodedToken.role !== 'client' || !decodedToken.client_id) {
        setErrorMessage('Session invalide : rôle ou client_id manquant. Veuillez vous reconnecter.');
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:8000/api/devis/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}: Impossible de récupérer les devis.`);
      }

      const data = await response.json();
      setDevisList(data);
    } catch (error) {
      console.error('Erreur réseau:', error);
      setErrorMessage(error.message || 'Erreur réseau ou serveur indisponible.');
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCounterOfferResponse = async (devisId, action) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/client/devis/${devisId}/counter-offer-response/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}: Impossible de répondre à la contre-proposition.`);
      }

      const data = await response.json();
      setDevisList((prev) =>
        prev.map((devis) => (devis.id === devisId ? data : devis))
      );
      toast.success(`Contre-proposition ${action === 'accept' ? 'acceptée' : 'rejetée'} avec succès !`);
      fetchDevis();
    } catch (error) {
      console.error('Erreur lors de la réponse à la contre-proposition:', error);
      toast.error(error.message || 'Erreur lors de la réponse à la contre-proposition.');
    }
  };

  const handleDownloadPDF = async (id) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Veuillez vous connecter pour télécharger le PDF.');
      navigate('/login');
      return;
    }

    setPdfLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await axios.get(`http://localhost:8000/api/devis/${id}/specification-pdf/`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'];
      if (!contentType.includes('application/pdf')) {
        let errorMessage = 'La réponse n\'est pas un fichier PDF valide.';
        try {
          const text = await response.data.text();
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Non-JSON response, use default message
        }
        throw new Error(errorMessage);
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `devis_${id}_spec.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF téléchargé avec succès.');
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      let errorMessage = error.message || 'Impossible de télécharger le PDF.';
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'PDF ou devis non trouvé.';
        } else if (error.response.status === 403) {
          errorMessage = 'Accès interdit.';
        } else if (error.response.status === 401) {
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          navigate('/login');
        }
      }
      toast.error(errorMessage);
    } finally {
      setPdfLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  useEffect(() => {
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
                      <p className="text-lg font-semibold text-gray-900">
                        Devis #{devis.id} - {devis.description}
                      </p>
                      <p className="text-gray-600">Montant: {devis.amount} TND</p>
                      <p className="text-gray-600">
                        Statut: {statusTranslation[devis.status] || devis.status}
                      </p>
                      <p className="text-gray-600">
                        Créé le: {new Date(devis.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      {devis.counter_offer && (
                        <>
                          <p className="text-gray-600 font-semibold mt-2">
                            Contre-proposition: {devis.counter_offer}
                          </p>
                          <p className="text-gray-600">
                            Statut de la contre-proposition: {counterOfferStatusTranslation[devis.counter_offer_status] || devis.counter_offer_status}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          devis.status === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900'
                            : devis.status === 'rejected'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900'
                        }`}
                      >
                        {statusTranslation[devis.status] || devis.status}
                      </span>
                      {devis.counter_offer && devis.counter_offer_status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleCounterOfferResponse(devis.id, 'accept')}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                          >
                            Accepter
                          </button>
                          <button
                            onClick={() => handleCounterOfferResponse(devis.id, 'reject')}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                          >
                            Refuser
                          </button>
                        </div>
                      )}
                      {devis.specification_pdf && (
                        <button
                          onClick={() => handleDownloadPDF(devis.id)}
                          className={`px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 flex items-center ${
                            pdfLoading[devis.id] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Télécharger le PDF"
                          disabled={pdfLoading[devis.id]}
                        >
                          <FaFilePdf className="inline-block mr-1" />
                          {pdfLoading[devis.id] ? 'Chargement...' : 'Télécharger PDF'}
                        </button>
                      )}
                    </div>
                  </div>
                  {devis.produit_details && devis.produit_details.length > 0 && (
                    <div className="mt-4 text-gray-600 dark:text-gray-400">
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