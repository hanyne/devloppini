import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!formData.name || !formData.email || !formData.message) {
      setErrorMessage('Veuillez remplir tous les champs requis.');
      return;
    }

    // Simulate form submission (replace with actual API call)
    setTimeout(() => {
      setSuccessMessage('Votre message a été envoyé avec succès ! Nous vous répondrons bientôt.');
      setFormData({ name: '', email: '', message: '' });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-12 animate-fade-in">Contactez-nous</h2>

        {/* Contact Form and Map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white p-8 rounded-xl shadow-2xl animate-fade-in-delayed">
            {successMessage && <div className="alert alert-success mb-6">{successMessage}</div>}
            {errorMessage && <div className="alert alert-danger mb-6">{errorMessage}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Votre nom</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none transition-all duration-300 hover:border-blue-900"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Entrez votre nom"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Votre email</label>
                <input
                  type="email"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none transition-all duration-300 hover:border-blue-900"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Entrez votre email"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Votre message</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none transition-all duration-300 hover:border-blue-900"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Entrez votre message"
                  rows="5"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-gray-800 to-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-900 hover:to-gray-800 transition-all duration-300 transform hover:scale-105"
              >
                Envoyer
              </button>
            </form>
          </div>

          {/* Map and Contact Info */}
          <div className="space-y-8">
            {/* Map */}
            <div className="relative h-96 rounded-xl overflow-hidden shadow-2xl">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.086356677295!2d-122.41941568468101!3d37.77492977975966!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085808f5d3b2b45%3A0x4a2f7b8e8e1d2f4a!2sSan%20Francisco%2C%20CA%2C%20USA!5e0!3m2!1sen!2s!4v1630000000000!5m2!1sen!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                title="Location Map"
              ></iframe>
            </div>
            {/* Contact Info */}
            <div className="bg-white p-6 rounded-xl shadow-2xl">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Nos Coordonnées</h3>
              <p className="text-gray-600 mb-2"><strong>Adresse :</strong> Rue Salem Alaykom, Ariana, Tunisie</p>
              <p className="text-gray-600 mb-2"><strong>Téléphone :</strong> +216 XX XXX XXX</p>
              <p className="text-gray-600 mb-2"><strong>Email :</strong> contact@stebonjour.com</p>
              <p className="text-gray-600"><strong>Horaires :</strong> Lun-Ven, 9h-17h</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    
  );
};

export default Contact;