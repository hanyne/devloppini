import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const DevisForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    project_type: '',
    budget: '',
    timeline: '',
    type_site: 'vitrine',
    fonctionnalites: '',
    design_personnalise: false,
    integration_seo: false,
    autre_details: '',
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!formData.project_type || !formData.budget || !formData.timeline || !formData.type_site) {
      setErrorMessage('Veuillez remplir tous les champs requis.');
      return;
    }

    const budget = parseFloat(formData.budget);
    if (isNaN(budget) || budget <= 0) {
      setErrorMessage('Le budget doit être un nombre positif.');
      return;
    }

    const submissionData = {
      project_type: formData.project_type.trim(),
      budget: budget,
      details: formData.timeline || '',
      type_site: formData.type_site,
      fonctionnalites: formData.fonctionnalites || '',
      design_personnalise: formData.design_personnalise || false,
      integration_seo: formData.integration_seo || false,
      autre_details: formData.autre_details || '',
    };

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setErrorMessage('Vous devez être connecté pour soumettre un devis.');
        navigate('/login');
        return;
      }

      console.log('Soumission de la demande de devis:', submissionData);
      console.log('Token envoyé:', token);
      let decodedToken;
      try {
        decodedToken = jwtDecode(token);
        console.log('Token décodé:', decodedToken);
        if (!decodedToken.client_id) {
          console.error('client_id manquant dans le token:', decodedToken);
          setErrorMessage('Session invalide : client_id manquant. Veuillez vous reconnecter.');
          navigate('/login');
          return;
        }
      } catch (error) {
        console.error('Erreur lors du décodage du token:', error);
        setErrorMessage('Token invalide. Veuillez vous reconnecter.');
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:8000/api/public/devis/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(submissionData),
      });
      console.log('Statut de la réponse:', response.status);
      const data = await response.json();
      console.log('Réponse complète du serveur:', data);

      if (response.ok) {
        setSuccessMessage('Demande de devis soumise avec succès ! Nous vous contacterons bientôt.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          project_type: '',
          budget: '',
          timeline: '',
          type_site: 'vitrine',
          fonctionnalites: '',
          design_personnalise: false,
          integration_seo: false,
          autre_details: '',
        });
      } else {
        let errorMsg = data.error || 'Erreur lors de la soumission de la demande.';
        if (data.details) {
          errorMsg += ' Détails : ' + JSON.stringify(data.details);
        }
        setErrorMessage(errorMsg);
        console.error('Erreurs de validation:', data.details || data);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      setErrorMessage('Erreur réseau ou serveur indisponible.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-12 animate-fade-in">Demander un Devis</h2>
        {successMessage && <div className="alert alert-success mb-8">{successMessage}</div>}
        {errorMessage && <div className="alert alert-danger mb-8">{errorMessage}</div>}
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-2xl animate-fade-in-delayed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Votre nom</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Entrez votre nom"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Votre email</label>
              <input
                type="email"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Entrez votre email"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Votre téléphone</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Entrez votre numéro de téléphone"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Type de projet</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400"
                name="project_type"
                value={formData.project_type}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionnez un type de projet</option>
                <option value="Création de site web">Création de site web</option>
                <option value="Développement d'application mobile">Développement d'application mobile</option>
                <option value="Design graphique">Design graphique</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Budget estimé (TND)</label>
              <input
                type="number"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Entrez votre budget"
                min="1"
                step="1"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Délai souhaité</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400"
                name="timeline"
                value={formData.timeline}
                onChange={handleChange}
                placeholder="Ex. 1 mois"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Type de site</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400"
                name="type_site"
                value={formData.type_site}
                onChange={handleChange}
                required
              >
                <option value="vitrine">Site Vitrine</option>
                <option value="ecommerce">Site E-commerce</option>
                <option value="blog">Blog</option>
                <option value="portfolio">Portfolio</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-semibold mb-2">Fonctionnalités souhaitées</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400"
                name="fonctionnalites"
                value={formData.fonctionnalites}
                onChange={handleChange}
                placeholder="Ex. formulaire de contact, panier, blog"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  name="design_personnalise"
                  checked={formData.design_personnalise}
                  onChange={handleChange}
                />
                <span className="ml-2 text-gray-700 font-semibold">Design personnalisé</span>
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  name="integration_seo"
                  checked={formData.integration_seo}
                  onChange={handleChange}
                />
                <span className="ml-2 text-gray-700 font-semibold">Intégration SEO</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-semibold mb-2">Autres détails</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400"
                name="autre_details"
                value={formData.autre_details}
                onChange={handleChange}
                placeholder="Autres détails ou spécifications (facultatif)"
                rows="4"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
              >
                Soumettre la demande
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevisForm;