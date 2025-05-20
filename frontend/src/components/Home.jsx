import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaCommentDots, FaLaptopCode, FaCloud, FaMobileAlt, FaLock, FaStar } from 'react-icons/fa';
import {jwtDecode} from 'jwt-decode';

// Default images
const defaultAboutImage = "https://www.actian.com/wp-content/uploads/2023/11/data-management-aspects-for-your-it-team.jpg";
const defaultServiceImage = "https://img.freepik.com/vecteurs-libre/concept-programmeurs-design-plat_23-2147861677.jpg?t=st=1745446045~exp=1745449645~hmac=14f9d0090bf53a34a4c5bab7482573cc4a9087e4f14b7a5834025551012c78e8&w=826";

// Carousel images
const carouselImages = [
  { url: "https://img.freepik.com/photos-gratuite/concept-collage-html-css-personne_23-2150062008.jpg?t=st=1745445487~exp=1745449087~hmac=6846c6d5c0010bfc19e29927823e85d3d8d9e95fb0bf5171c9ef294bdc404e57&w=1380", caption: "Transformez vos idées en réalité" },
  { url: "https://img.freepik.com/photos-gratuite/bouchent-concept-entreprise-mains_23-2149151165.jpg?t=st=1745445524~exp=1745449124~hmac=de96c7495b21cd45d7b2e8a38b350507a0023711b3da582ab74e1a651d93111a&w=1380", caption: "Solutions digitales modernes" },
  { url: "https://img.freepik.com/photos-gratuite/personne-travaillant-html-ordinateur_23-2150038841.jpg?t=st=1745445568~exp=1745449168~hmac=6aa6d931a1475f4850ca71d22a6c9a0297c5296ce7acadaf5e61e6087cb53d38&w=1380", caption: "Votre partenaire technologique" },
];

const Home = () => {
  const [services, setServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Bonjour ! Je suis un assistant automatique. Tapez 'paiement', 'facture', 'devis', 'aide' ou autre pour commencer.", sender: 'bot' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState(null);
  const [testimonialInput, setTestimonialInput] = useState('');
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [isClient, setIsClient] = useState(false);
  const [testimonialError, setTestimonialError] = useState(null);
  const messagesEndRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est authentifié et a le rôle "client"
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsClient(decoded.role === 'client');
      } catch (e) {
        console.error('Erreur lors du décodage du token:', e);
      }
    }

    // Récupérer les services
    const fetchServices = async () => {
      try {
        console.log('Récupération des services depuis /api/services/');
        const response = await fetch('http://localhost:8000/api/services/');
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des services:', error);
        setErrorMessage('Impossible de charger les services. Veuillez réessayer plus tard.');
      }
    };

    // Récupérer les avis approuvés
    const fetchTestimonials = async () => {
      try {
        console.log('Récupération des avis depuis /api/testimonials/');
        const response = await fetch('http://localhost:8000/api/testimonials/');
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        const data = await response.json();
        setTestimonials(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des avis:', error);
        setErrorMessage('Impossible de charger les avis. Veuillez réessayer plus tard.');
      }
    };

    fetchServices();
    fetchTestimonials();

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const handleMessage = useCallback((message) => {
    return new Promise((resolve) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        try {
          console.log('Sending message to /api/chat/:', message);
          const response = await axios.post(
            'http://localhost:8000/api/chat/',
            { message },
            { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
          );
          setChatError(null);
          resolve(response.data.reply);
        } catch (err) {
          console.error('Error fetching chatbot response:', err);
          if (err.response?.status === 404) {
            setChatError('Endpoint de chat introuvable. Contactez l’administrateur.');
          } else if (err.response?.status === 401) {
            setChatError('Session expirée. Veuillez vous reconnecter.');
          } else {
            setChatError('Erreur de communication avec le serveur. Vérifiez votre connexion ou réessayez.');
          }
          resolve('Désolé, une erreur s\'est produite. Essayez à nouveau.');
        }
      }, 500);
    });
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setMessages((prev) => {
      const newMessages = [...prev, { text: userMessage, sender: 'user' }];
      if (newMessages.length > 50) newMessages.shift();
      return newMessages;
    });
    setChatInput('');

    const botReply = await handleMessage(userMessage);
    setMessages((prev) => {
      const newMessages = [...prev, { text: botReply, sender: 'bot' }];
      if (newMessages.length > 50) newMessages.shift();
      return newMessages;
    });
  };

  const handleSubmitTestimonial = async (e) => {
    e.preventDefault();
    if (!testimonialInput.trim()) {
      setTestimonialError('L’avis ne peut pas être vide.');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:8000/api/testimonials/create/',
        { content: testimonialInput, rating: testimonialRating },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      setTestimonialError(null);
      setTestimonialInput('');
      setTestimonialRating(5);
      alert('Avis soumis avec succès. En attente d’approbation.');
    } catch (err) {
      console.error('Erreur lors de la soumission de l’avis:', err);
      setTestimonialError(err.response?.data?.error || 'Erreur lors de la soumission de l’avis. Veuillez réessayer.');
    }
  };

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Default services
  const defaultServices = [
    {
      id: 1,
      name: 'Développement Web',
      category: 'Informatique',
      description: 'Création de sites web sur mesure adaptés à vos besoins.',
      price_range: '500 - 2000 TND',
      features: 'Responsive, SEO optimisé, CMS intégré',
      icon: defaultServiceImage,
    },
    {
      id: 2,
      name: 'Développement Mobile',
      category: 'Informatique',
      description: 'Applications mobiles personnalisées pour iOS et Android.',
      price_range: '1000 - 3000 TND',
      features: 'UI/UX design, API intégration, notifications push',
      icon: defaultServiceImage,
    },
    {
      id: 3,
      name: 'Solutions Cloud',
      category: 'Informatique',
      description: 'Hébergement et gestion de données dans le cloud.',
      price_range: '300 - 1500 TND',
      features: 'Sécurité avancée, stockage évolutif, sauvegarde automatisée',
      icon: defaultServiceImage,
    },
    {
      id: 4,
      name: 'Sécurité Informatique',
      category: 'Informatique',
      description: 'Protection de vos systèmes contre les cybermenaces.',
      price_range: '400 - 1200 TND',
      features: 'Pare-feu, cryptage, audits de sécurité',
      icon: defaultServiceImage,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      {/* Carousel Section */}
      <section className="relative h-[80vh] overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <img
              src={carouselImages[currentSlide].url}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            <div className="absolute inset-0 flex items-center justify-center text-center text-white">
              <div>
                <motion.h1
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-4xl md:text-6xl font-extrabold mb-6"
                >
                  {carouselImages[currentSlide].caption}
                </motion.h1>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <Link
                    to="/devis-form"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold text-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 hover:shadow-lg"
                  >
                    Demander un Devis
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full ${currentSlide === index ? 'bg-indigo-600' : 'bg-gray-400'} hover:bg-indigo-500 transition-all duration-300`}
            ></button>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center text-gray-800 dark:text-gray-100 mb-12"
          >
            À Propos de UNIO LAB
          </motion.h2>
          <div className="flex flex-col md:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="md:w-1/2"
            >
              <img
                src={defaultAboutImage}
                alt="À Propos de UNIO LAB"
                className="rounded-xl shadow-2xl hover:shadow-xl transition-shadow duration-300"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="md:w-1/2"
            >
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                UNIO LAB, enregistrée sous le numéro B01280932019, est une entreprise tunisienne basée au Bâtiment Express A3-8, Centre Urbain Nord, EL MENZAH. Spécialisée dans les activités informatiques, nous offrons des solutions innovantes pour transformer vos idées en projets concrets.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Notre équipe d’experts utilise des technologies de pointe pour développer des sites web, applications mobiles, solutions cloud et systèmes sécurisés, adaptés aux besoins des startups comme des grandes entreprises.
              </p>
              <p className="text-md text-gray-500 mt-4">
                <strong>Adresse :</strong> Bâtiment Express A3-8, Centre Urbain Nord, EL MENZAH, Tunisie
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-100 dark:bg-gray-700">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center text-gray-800 dark:text-gray-100 mb-12"
          >
            Nos Services
          </motion.h2>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-100 text-red-800 p-3 rounded-lg mb-8 text-center"
            >
              {errorMessage}
            </motion.div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {(services.length > 0 ? services : defaultServices).map((service) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="relative">
                  <img
                    src={service.icon || defaultServiceImage}
                    alt={service.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => (e.target.src = defaultServiceImage)}
                  />
                  <div className="absolute top-4 left-4 bg-indigo-600 text-white px-2 py-1 rounded-full text-sm">
                    {service.category}
                  </div>
                </div>
                <div className="p-6">
                  <h5 className="text-xl font-semibold text-indigo-800 dark:text-indigo-300 mb-3">{service.name}</h5>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">{service.description}</p>
                  <p className="text-gray-500 mb-2"><strong>Prix :</strong> {service.price_range}</p>
                  <p className="text-gray-500"><strong>Fonctionnalités :</strong> {service.features}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center text-gray-800 dark:text-gray-100 mb-12"
          >
            Ce que disent nos clients
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.length > 0 ? (
              testimonials.map((testimonial) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FaStar key={i} className="text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 italic mb-4">{`"${testimonial.content}"`}</p>
                  <p className="text-indigo-800 dark:text-indigo-300 font-semibold">
                    - {testimonial.client.name}
                  </p>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-300 col-span-3">
                Aucun avis disponible pour le moment.
              </p>
            )}
          </div>

          {/* Formulaire pour ajouter un avis (clients authentifiés uniquement) */}
          {isClient && (
            <div className="mt-12">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-2xl font-semibold text-center text-gray-800 dark:text-gray-100 mb-6"
              >
                Laissez votre avis
              </motion.h3>
              <form onSubmit={handleSubmitTestimonial} className="max-w-lg mx-auto">
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Votre avis</label>
                  <textarea
                    value={testimonialInput}
                    onChange={(e) => setTestimonialInput(e.target.value)}
                    placeholder="Partagez votre expérience avec UNIO LAB..."
                    className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="4"
                  ></textarea>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Note (1 à 5)</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setTestimonialRating(star)}
                        className={`text-2xl ${testimonialRating >= star ? 'text-yellow-400' : 'text-gray-400'}`}
                      >
                        <FaStar />
                      </button>
                    ))}
                  </div>
                </div>
                {testimonialError && (
                  <p className="text-red-500 text-sm mb-4">{testimonialError}</p>
                )}
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700 transition-all duration-300"
                >
                  Soumettre l’avis
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Chatbot Button and Window */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300"
        title={isChatOpen ? 'Fermer le Chat' : 'Ouvrir le Chat'}
      >
        <FaCommentDots className="text-2xl" />
      </motion.button>
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-20 right-6 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 flex flex-col h-96"
          >
            <div className="flex-1 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-2 p-2 rounded-lg ${
                    message.sender === 'user' ? 'bg-indigo-600 text-white ml-auto' : 'bg-gray-200 dark:bg-gray-600 text-gray-800'
                  } max-w-[80%]`}
                >
                  {message.sender === 'bot' && <strong>Assistant : </strong>}
                  {message.text}
                </motion.div>
              ))}
              {chatError && <div className="text-red-500 text-center text-sm">{chatError}</div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-2 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tapez votre message..."
                className="flex-1 p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Envoyer
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-800 to-indigo-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">UL</span>
                </div>
                <span className="text-2xl font-extrabold">UNIO LAB</span>
              </div>
              <p className="text-gray-300">
                UNIO LAB, enregistrée sous le numéro B01280932019, est votre partenaire informatique au Bâtiment Express A3-8, Centre Urbain Nord, EL MENZAH, Tunisie.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Liens Rapides</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/home" className="text-gray-300 hover:text-indigo-300 transition-colors duration-300">Accueil</Link>
                </li>
                <li>
                  <Link to="/devis-form" className="text-gray-300 hover:text-indigo-300 transition-colors duration-300">Demander un Devis</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-300 hover:text-indigo-300 transition-colors duration-300">Contact</Link>
                </li>
                <li>
                  <Link to="/login" className="text-gray-300 hover:text-indigo-300 transition-colors duration-300">Connexion</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Suivez-nous</h3>
              <div className="flex space-x-4">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-indigo-300 transition-colors duration-300">
                  <FaEnvelope className="text-2xl" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-700 pt-6 text-center">
            <p className="text-gray-400">© 2025 UNIO LAB. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;