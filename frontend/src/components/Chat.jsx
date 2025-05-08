import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const Chat = () => {
  const [messages, setMessages] = useState([
    { text: "Bonjour ! Je suis un assistant automatique. Tapez 'paiement', 'facture', 'devis', 'aide' ou autre pour commencer.", sender: 'bot' },
  ]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMessage = useCallback((message) => {
    return new Promise((resolve) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(async () => {
        try {
          console.log('Sending message to /api/chat/:', message);
          const response = await axios.post(
            'http://localhost:8000/api/chat/',
            { message },
            { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
          );
          console.log('Received response from /api/chat/:', response.data);
          setError(null);
          resolve(response.data.reply);
        } catch (err) {
          console.error('Error fetching chatbot response:', err);
          if (err.response?.status === 404) {
            setError('Endpoint de chat introuvable. Contactez l’administrateur.');
          } else if (err.response?.status === 401) {
            setError('Session expirée. Veuillez vous reconnecter.');
          } else {
            setError('Erreur de communication avec le serveur. Vérifiez votre connexion ou réessayez.');
          }
          resolve('Désolé, une erreur s\'est produite. Essayez à nouveau.');
        }
      }, 500);
    });
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    console.log('User input:', userMessage);
    setMessages((prev) => {
      const newMessages = [...prev, { text: userMessage, sender: 'user' }];
      if (newMessages.length > 50) newMessages.shift();
      return newMessages;
    });
    setInput('');

    const botReply = await handleMessage(userMessage);
    setMessages((prev) => {
      const newMessages = [...prev, { text: botReply, sender: 'bot' }];
      if (newMessages.length > 50) newMessages.shift();
      return newMessages;
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="container mt-5">
      <h2 className="mb-4 text-center">Chat avec l'Assistant</h2>
      <div
        className="card shadow-sm"
        style={{ width: '500px', margin: '0 auto', height: '600px', display: 'flex', flexDirection: 'column' }}
      >
        <div
          className="card-body"
          style={{ flex: '1 1 auto', overflowY: 'auto', padding: '20px', backgroundColor: '#f8f9fa' }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`d-flex mb-3 ${
                message.sender === 'user' ? 'justify-content-end' : 'justify-content-start'
              }`}
            >
              <div
                className="p-2 rounded"
                style={{
                  maxWidth: '70%',
                  backgroundColor: message.sender === 'user' ? '#007bff' : '#e6f3ff',
                  color: message.sender === 'user' ? 'white' : 'black',
                }}
              >
                {message.sender === 'bot' && <strong>Assistant Auto: </strong>}
                {message.text}
              </div>
            </div>
          ))}
          {error && <div className="text-danger text-center mb-3">{error}</div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="card-footer">
          <form onSubmit={handleSendMessage} className="d-flex">
            <input
              type="text"
              className="form-control me-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tapez votre message..."
            />
            <button type="submit" className="btn btn-primary">Envoyer</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;