import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import PayPalPayment from './PayPalPayment';
import CheckoutForm from './CheckoutForm';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

// Charger la clé Stripe depuis la variable d'environnement une seule fois
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
console.log('Stripe Publishable Key:', stripePublishableKey);
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const PaymentDevis = () => {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Bonjour ! Je suis votre assistant automatique. Tapez 'paiement', 'facture', 'devis', 'aide' pour commencer.", sender: 'bot' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState(null);
  const [activeTab, setActiveTab] = useState('card');
  const messagesEndRef = useRef(null);
  const timeoutRef = useRef(null);

  const fetchFactures = async () => {
    try {
      console.log('Récupération des factures...');
      const response = await axios.get('http://localhost:8000/api/factures/client/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      console.log('Factures reçues:', response.data);
      if (Array.isArray(response.data)) {
        setFactures(response.data);
      } else {
        console.warn('Données de factures invalides:', response.data);
        setFactures([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement des factures:', err);
      setError('Erreur lors du chargement des factures.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactures();
  }, []);

  const handleDownloadPDF = async (factureId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/facture/${factureId}/pdf/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      saveAs(blob, `facture_${factureId}.pdf`);
      toast.success('PDF téléchargé avec succès !');
    } catch (err) {
      console.error('Erreur téléchargement PDF:', err);
      toast.error('Erreur lors du téléchargement du PDF.');
    }
  };

  const handlePaymentSuccess = () => {
    fetchFactures();
  };

  const handleMessage = useCallback((message) => {
    return new Promise((resolve) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        try {
          const response = await axios.post(
            'http://localhost:8000/api/chat/',
            { message },
            { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
          );
          setChatError(null);
          resolve(response.data.reply);
        } catch (err) {
          setChatError('Erreur de communication avec le serveur. Réessayez.');
          resolve('Désolé, une erreur s’est produite. Essayez à nouveau.');
        }
      }, 500);
    });
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setMessages((prev) => [...prev, { text: userMessage, sender: 'user' }].slice(-50));
    setChatInput('');

    const botReply = await handleMessage(userMessage);
    setMessages((prev) => [...prev, { text: botReply, sender: 'bot' }].slice(-50));
  };

  useEffect(() => {
    if (isChatOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div></div>;
  if (error) return <p className="text-red-500 text-center mt-5">{error}</p>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Mes Factures</h2>
        <Link to="/chat" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">
          Ouvrir le Chatbot
        </Link>
      </div>
      {factures.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">Aucune facture disponible.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {factures.map((facture) => {
            console.log('Rendu facture:', facture);
            if (!facture || !facture.id) {
              console.error('Facture invalide ou manquante:', facture);
              return null;
            }
            return (
              <div key={facture.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Facture #{facture.invoice_number}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2"><strong>Montant :</strong> {facture.amount} TND (~{(facture.amount / 3.1).toFixed(2)} USD)</p>
                <p className="text-gray-600 dark:text-gray-300"><strong>Statut :</strong> {facture.status === 'unpaid' ? 'Impayée' : 'Payée'}</p>
                <p className="text-gray-600 dark:text-gray-300"><strong>Date :</strong> {new Date(facture.created_at).toLocaleDateString()}</p>
                {facture.devis && <p className="text-gray-600 dark:text-gray-300"><strong>Devis :</strong> {facture.devis.description}</p>}
                <button
                  onClick={() => handleDownloadPDF(facture.id)}
                  className="text-indigo-600 hover:underline mt-2"
                >
                  Télécharger PDF
                </button>
                {facture.status === 'unpaid' && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Options de Paiement</h4>
                    <div className="flex border-b border-gray-200">
                      <button
                        className={`flex-1 py-2 text-indigo-600 border-b-2 border-transparent hover:border-indigo-600 ${activeTab === 'card' ? 'border-indigo-600' : ''}`}
                        onClick={() => setActiveTab('card')}
                      >
                        Carte Bancaire
                      </button>
                      <button
                        className={`flex-1 py-2 text-indigo-600 border-b-2 border-transparent hover:border-indigo-600 ${activeTab === 'paypal' ? 'border-indigo-600' : ''}`}
                        onClick={() => setActiveTab('paypal')}
                      >
                        PayPal
                      </button>
                    </div>
                    {activeTab === 'card' && stripePromise && (
                      <Elements stripe={stripePromise}>
                        <CheckoutForm facture={facture} onSuccess={handlePaymentSuccess} />
                      </Elements>
                    )}
                    {activeTab === 'paypal' && (
                      <PayPalScriptProvider options={{ 'client-id': process.env.REACT_APP_PAYPAL_CLIENT_ID, currency: 'USD' }}>
                        <PayPalPayment facture={facture} />
                      </PayPalScriptProvider>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {isChatOpen && (
        <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Chatbot</h3>
            <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-gray-700">
              ×
            </button>
          </div>
          <div className="h-48 overflow-y-auto mb-2">
            {messages.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block p-2 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800'}`}>
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="flex">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 p-2 border rounded-l-md dark:bg-gray-700 dark:text-white"
              placeholder="Tapez votre message..."
            />
            <button type="submit" className="bg-indigo-600 text-white p-2 rounded-r-md hover:bg-indigo-700">
              Envoyer
            </button>
          </form>
          {chatError && <p className="text-red-500 text-sm mt-1">{chatError}</p>}
        </div>
      )}
    </div>
  );
};

export default PaymentDevis;