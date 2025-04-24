import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Default images
const defaultAboutImage = "https://img.freepik.com/photos-gratuite/laboratoire-informatique-moderne-equipe_23-2149241221.jpg?t=st=1745445943~exp=1745449543~hmac=ea9048b4ca292e22ffdb7350cec880408c0b75e90e239df3a03482452ed615b0&w=1380";
const defaultServiceImage = "https://img.freepik.com/vecteurs-libre/concept-programmeurs-design-plat_23-2147861677.jpg?t=st=1745446045~exp=1745449645~hmac=14f9d0090bf53a34a4c5bab7482573cc4a9087e4f14b7a5834025551012c78e8&w=826";

// Carousel images (replace with actual image URLs)
const carouselImages = [
  { url: "https://img.freepik.com/photos-gratuite/concept-collage-html-css-personne_23-2150062008.jpg?t=st=1745445487~exp=1745449087~hmac=6846c6d5c0010bfc19e29927823e85d3d8d9e95fb0bf5171c9ef294bdc404e57&w=1380", caption: "Transformez vos idées en réalité" },
  { url: "https://img.freepik.com/photos-gratuite/bouchent-concept-entreprise-mains_23-2149151165.jpg?t=st=1745445524~exp=1745449124~hmac=de96c7495b21cd45d7b2e8a38b350507a0023711b3da582ab74e1a651d93111a&w=1380", caption: "Solutions digitales modernes" },
  { url: "https://img.freepik.com/photos-gratuite/personne-travaillant-html-ordinateur_23-2150038841.jpg?t=st=1745445568~exp=1745449168~hmac=6aa6d931a1475f4850ca71d22a6c9a0297c5296ce7acadaf5e61e6087cb53d38&w=1380", caption: "Votre partenaire technologique" },
];

const Home = () => {
  const [services, setServices] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        console.log('Récupération des services depuis /api/services/');
        const response = await fetch('http://localhost:8000/api/services/');
        console.log('Statut de la réponse:', response.status);
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        console.log('Données des services:', data);
        setServices(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des services:', error);
        setErrorMessage('Impossible de charger les services. Veuillez réessayer plus tard.');
      }
    };
    fetchServices();

    // Carousel auto-slide
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Carousel Section */}
      <section className="relative h-[80vh] overflow-hidden">
        <div className="absolute inset-0 flex transition-transform duration-1000" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {carouselImages.map((slide, index) => (
            <div key={index} className="min-w-full h-[80vh] relative">
              <img src={slide.url} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black opacity-50"></div>
              <div className="absolute inset-0 flex items-center justify-center text-center text-white">
                <div>
                  <h1 className="text-5xl md:text-7xl font-extrabold mb-4 animate-fade-in">{slide.caption}</h1>
                  <Link to="/devis-form" className="bg-gradient-to-r from-gold-400 to-yellow-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-yellow-500 hover:to-gold-400 transition-all duration-300 transform hover:scale-105">
                    Demander un Devis
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Carousel Dots */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-4 h-4 rounded-full ${currentSlide === index ? 'bg-gold-400' : 'bg-gray-400'} transition-all duration-300`}
            ></button>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-12 animate-fade-in">À Propos de Nous</h2>
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <img src={defaultAboutImage} alt="À Propos" className="rounded-xl shadow-2xl transform hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="md:w-1/2">
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Ste Bonjour est une entreprise innovante spécialisée dans la création de sites web, le développement d’applications mobiles et le design graphique. Depuis notre création, nous avons accompagné des centaines de clients à travers le monde pour réaliser leurs projets digitaux avec des solutions sur mesure.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Notre équipe d’experts est passionnée par l’innovation et utilise les dernières technologies pour offrir des services de qualité supérieure. Que vous soyez une startup ou une grande entreprise, nous sommes là pour transformer vos visions en réalité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-12 animate-fade-in">Nos Services</h2>
          {errorMessage && <div className="alert alert-danger mb-8">{errorMessage}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.length > 0 ? (
              services.map((service) => (
                <div key={service.id} className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-500">
                  <img
                    src={service.icon || defaultServiceImage}
                    alt={service.name}
                    className="w-full h-56 object-cover"
                    onError={(e) => (e.target.src = defaultServiceImage)} // Fallback on error
                  />
                  <div className="p-6">
                    <h5 className="text-xl font-semibold text-blue-900 mb-3">{service.name}</h5>
                    <p className="text-gray-600 mb-2"><strong>Catégorie :</strong> {service.category}</p>
                    <p className="text-gray-600 mb-2"><strong>Description :</strong> {service.description}</p>
                    <p className="text-gray-600 mb-2"><strong>Plage de prix :</strong> {service.price_range}</p>
                    <p className="text-gray-600"><strong>Fonctionnalités :</strong> {service.features}</p>
                  </div>
                </div>
              ))
            ) : (
              !errorMessage && <p className="text-center text-gray-600 col-span-3">Aucun service disponible pour le moment.</p>
            )}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-12 animate-fade-in">Ce que disent nos clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-500">
              <p className="text-gray-600 italic mb-4">"Ste Bonjour a transformé notre idée en un site web incroyable en un temps record !"</p>
              <p className="text-blue-900 font-semibold">- Ahmed, Entrepreneur</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-500">
              <p className="text-gray-600 italic mb-4">"Leur équipe est professionnelle et à l’écoute. Je recommande vivement leurs services."</p>
              <p className="text-blue-900 font-semibold">- Sarah, Designer</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-500">
              <p className="text-gray-600 italic mb-4">"Une application mobile parfaitement conçue pour notre entreprise. Merci Ste Bonjour !"</p>
              <p className="text-blue-900 font-semibold">- Karim, PDG</p>
            </div>
          </div>
        </div>
      </section>

   

      {/* Modernized Footer */}
      <footer className="bg-gradient-to-r from-gray-800 to-blue-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="https://via.placeholder.com/40x40.png?text=Logo" alt="Logo" className="h-8 w-8" />
                <span className="text-2xl font-extrabold">Gestion Intelligente</span>
              </div>
              <p className="text-gray-300">
                Ste Bonjour est votre partenaire pour des solutions digitales modernes et innovantes.
              </p>
            </div>
            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Liens Rapides</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/home" className="text-gray-300 hover:text-gold-400 transition-colors duration-300">Accueil</Link>
                </li>
                <li>
                  <Link to="/devis-form" className="text-gray-300 hover:text-gold-400 transition-colors duration-300">Demander un Devis</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-300 hover:text-gold-400 transition-colors duration-300">Contact</Link>
                </li>
                <li>
                  <Link to="/login" className="text-gray-300 hover:text-gold-400 transition-colors duration-300">Connexion</Link>
                </li>
              </ul>
            </div>
            {/* Social Media */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Suivez-nous</h3>
              <div className="flex space-x-4">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gold-400 transition-colors duration-300">
                  <i className="fab fa-facebook-f text-2xl"></i>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gold-400 transition-colors duration-300">
                  <i className="fab fa-twitter text-2xl"></i>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gold-400 transition-colors duration-300">
                  <i className="fab fa-linkedin-in text-2xl"></i>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gold-400 transition-colors duration-300">
                  <i className="fab fa-instagram text-2xl"></i>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-700 pt-6 text-center">
            <p className="text-gray-400">© 2025 Ste Bonjour. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;