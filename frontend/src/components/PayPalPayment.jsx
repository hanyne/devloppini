import React from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const PayPalPayment = ({ facture }) => {
  const navigate = useNavigate();

  if (!facture || !facture.id) {
    console.error('Facture invalide ou manquante:', facture);
    toast.error('Erreur : Facture invalide. Veuillez recharger la page.');
    return null;
  }

  const createOrder = async () => {
    try {
      console.log('Création de la commande PayPal pour facture ID:', facture.id);
      const response = await axios.post(
        `http://localhost:8000/api/payment/paypal/${facture.id}/create/`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      console.log('Commande PayPal créée avec succès:', response.data);
      return response.data.order_id;
    } catch (err) {
      console.error('Erreur lors de la création de la commande PayPal:', err.response?.data || err.message);
      toast.error('Erreur lors de la création de la commande PayPal : ' + (err.response?.data?.error || err.message));
      throw new Error('Erreur lors de la création de la commande');
    }
  };

  const onApprove = async (data) => {
    try {
      console.log('Approbation du paiement PayPal, orderID:', data.orderID);
      await axios.post(
        `http://localhost:8000/api/payment/paypal/${facture.id}/execute/`,
        { order_id: data.orderID },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      toast.success('Paiement PayPal réussi !');
      navigate(`/payment/success/${facture.id}`);
    } catch (err) {
      console.error('Erreur lors de la capture du paiement PayPal:', err.response?.data || err.message);
      toast.error('Erreur lors du paiement PayPal : ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="mt-4">
      <p className="text-gray-600 dark:text-gray-300 mb-2">
        Note: Utilisez un compte PayPal sandbox pour tester (voir developer.paypal.com).
      </p>
      <PayPalButtons
        style={{ layout: 'vertical' }}
        createOrder={createOrder}
        onApprove={onApprove}
        onCancel={() => {
          console.log('Paiement PayPal annulé par l’utilisateur');
          toast.error('Paiement annulé.');
        }}
        onError={(err) => {
          console.error('Erreur générale PayPal:', err);
          toast.error('Erreur PayPal : ' + err.message);
        }}
      />
    </div>
  );
};

export default PayPalPayment;