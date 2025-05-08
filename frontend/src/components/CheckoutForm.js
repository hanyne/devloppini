import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { toast } from 'react-toastify';

const CheckoutForm = ({ facture, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);

    if (!stripe || !elements) {
      setProcessing(false);
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:8000/api/payment/${facture.id}/intent/`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );

      const { client_secret, payment_id } = response.data;

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        setError(result.error.message);
        setProcessing(false);
      } else if (result.paymentIntent.status === 'succeeded') {
        await axios.post(
          `http://localhost:8000/api/payment/${payment_id}/confirm/`,
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
        );
        toast.success('Paiement par carte réussi !');
        setError(null);
        setProcessing(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError('Erreur lors du paiement par carte. Veuillez réessayer.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
        <CardElement
          className="p-2 border rounded-md bg-white dark:bg-gray-800 dark:text-white"
          options={{ style: { base: { fontSize: '16px', color: '#1f2937' } } }}
        />
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <button
        type="submit"
        className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition"
        disabled={!stripe || processing}
      >
        {processing ? 'Traitement...' : 'Payer avec Carte'}
      </button>
    </form>
  );
};

export default CheckoutForm;