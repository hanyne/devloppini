import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:8000/api/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Compte client créé avec succès ! Redirection vers la connexion...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || 'Erreur lors de l’inscription.');
      }
    } catch (error) {
      console.error('Erreur lors de l’inscription:', error);
      setError('Erreur réseau ou serveur indisponible.');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-lg border-0 rounded-3 p-4" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center text-dark fw-bold mb-4">Inscription</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="text"
              className="form-control border-0 shadow-sm"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nom complet"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="email"
              className="form-control border-0 shadow-sm"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              className="form-control border-0 shadow-sm"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Téléphone"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              className="form-control border-0 shadow-sm"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mot de passe"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100 fw-semibold rounded-3">
            S'inscrire
          </button>
        </form>
        <div className="text-center mt-3">
          <p className="text-muted">Déjà un compte ? <Link to="/login">Se connecter</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;