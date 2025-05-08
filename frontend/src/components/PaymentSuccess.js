import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const PaymentSuccess = () => {
  const { factureId } = useParams();
  const [facture, setFacture] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacture = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/facture/${factureId}/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        setFacture(response.data);
        setLoading(false);
        toast.success('Paiement confirmé !');
      } catch (err) {
        console.error('Error fetching facture:', err);
        toast.error('Erreur lors du chargement des détails de la facture.');
        setLoading(false);
      }
    };
    fetchFacture();
  }, [factureId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-lg">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">Paiement Réussi !</h2>
        {facture && (
          <>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              <strong>Facture #{facture.invoice_number}</strong>
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              <strong>Montant :</strong> {facture.amount} TND (~{(facture.amount / 3.1).toFixed(2)} USD)
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              <strong>Statut :</strong> Payée
            </p>
          </>
        )}
        <Link
          to="/payment"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
        >
          Retour aux Factures
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;