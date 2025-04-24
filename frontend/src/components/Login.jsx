
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '../App.css';

const Login = ({ setIsAuthenticated, setUserRole }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { email, password };
    console.log('Étape 1 - Données envoyées au serveur:', payload);

    try {
      console.log('Étape 2 - Envoi de la requête à /api/client/token/');
      const response = await fetch('http://localhost:8000/api/client/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('Étape 3 - Statut de la réponse:', response.status);
      const data = await response.json();
      console.log('Étape 4 - Réponse complète du serveur:', data);

      if (!response.ok) {
        console.log('Étape 5 - Erreur détectée dans la réponse:', data.error);
        throw new Error(data.error || 'Erreur d’authentification');
      }

      console.log('Étape 6 - Connexion réussie, stockage des tokens');
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      console.log('Étape 7 - Décodage du token');
      const decodedToken = jwtDecode(data.access);
      console.log('Token décodé:', decodedToken);
      const userRole = decodedToken.role || 'client';
      console.log('Étape 8 - Rôle de l’utilisateur:', userRole);

      setIsAuthenticated(true);
      setUserRole(userRole);

      console.log('Étape 9 - Redirection selon le rôle');
      if (userRole === 'admin') {
        console.log('Redirection vers /dashboard');
        navigate('/dashboard');
      } else {
        console.log('Redirection vers /home');
        navigate('/home');
      }
    } catch (err) {
      console.error('Étape 10 - Erreur lors de la connexion:', err);
      setError(err.message);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="card-title text-center">Connexion</h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mot de passe</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <button type="submit" className="btn btn-primary w-100">Se connecter</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
