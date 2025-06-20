import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import axios from 'axios';
import '../App.css';

// Register Chart.js components
ChartJS.register(ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [filter, setFilter] = useState('month'); // Default to monthly view

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Veuillez vous connecter.');
        setLoading(false);
        return;
      }
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        const [clientsResponse, devisResponse, facturesResponse, testimonialsResponse] = await Promise.all([
          fetch('http://localhost:8000/api/clients/', { headers }),
          fetch('http://localhost:8000/api/devis/', { headers }),
          fetch('http://localhost:8000/api/factures/', { headers }),
          fetch('http://localhost:8000/api/admin/testimonials/', { headers }),
        ]);

        if (!clientsResponse.ok) throw new Error('Erreur lors du chargement des clients');
        if (!devisResponse.ok) throw new Error('Erreur lors du chargement des devis');
        if (!facturesResponse.ok) throw new Error('Erreur lors du chargement des factures');
        if (!testimonialsResponse.ok) throw new Error('Erreur lors du chargement des avis');

        const [clientsData, devisData, facturesData, testimonialsData] = await Promise.all([
          clientsResponse.json(),
          devisResponse.json(),
          facturesResponse.json(),
          testimonialsResponse.json(),
        ]);

        setClients(Array.isArray(clientsData) ? clientsData : []);
        setDevis(Array.isArray(devisData) ? devisData : []);
        setFactures(Array.isArray(facturesData) ? facturesData : []);
        setTestimonials(Array.isArray(testimonialsData) ? testimonialsData : []);
        setLoading(false);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors du chargement des données.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Toggle approval for testimonials
  const handleToggleApproval = async (testimonialId, isApproved) => {
    const token = localStorage.getItem('access_token');
    try {
      await axios.put(
        `http://localhost:8000/api/admin/testimonials/${testimonialId}/update/`,
        { is_approved: !isApproved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTestimonials((prev) =>
        prev.map((testimonial) =>
          testimonial.id === testimonialId ? { ...testimonial, is_approved: !isApproved } : testimonial
        )
      );
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l’avis:', err);
      setError('Erreur lors de la mise à jour de l’avis.');
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark');
  };

  // Metrics
  const activeClientsCount = clients.length;
  const pendingDevisCount = devis.filter(d => d.status === 'pending').length;
  const unpaidFacturesCount = factures.filter(f => f.status === 'unpaid').length;
  const totalPaidAmount = factures
    .filter(f => f.status === 'paid')
    .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0)
    .toFixed(2);

  // Dynamic revenue data by time period
  const revenueData = () => {
    const now = new Date();
    const labels = [];
    const data = [];

    if (filter === 'day') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        labels.push(date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
        data.push(
          factures
            .filter(f => {
              const fDate = new Date(f.created_at);
              return fDate.toDateString() === date.toDateString() && f.status === 'paid';
            })
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0)
        );
      }
    } else if (filter === 'month') {
      for (let i = 0; i < 12; i++) {
        const date = new Date(2025, i, 1);
        labels.push(date.toLocaleString('fr-FR', { month: 'short' }));
        data.push(
          factures
            .filter(f => {
              const fDate = new Date(f.created_at);
              return fDate.getFullYear() === 2025 && fDate.getMonth() === i && f.status === 'paid';
            })
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0)
        );
      }
    } else if (filter === 'year') {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        labels.push(year.toString());
        data.push(
          factures
            .filter(f => {
              const fDate = new Date(f.created_at);
              return fDate.getFullYear() === year && f.status === 'paid';
            })
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0)
        );
      }
    }

    return {
      labels,
      datasets: [{
        label: 'Revenus (TND)',
        data,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        fill: true,
        tension: 0.4,
      }],
    };
  };

  // Dynamic facture status data by time period
  const factureStatusData = () => {
    const now = new Date();
    const labels = [];
    const paidData = [];
    const unpaidData = [];
    const overdueData = [];

    if (filter === 'day') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        labels.push(date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
        const filtered = factures.filter(f => {
          const fDate = new Date(f.created_at);
          return fDate.toDateString() === date.toDateString();
        });
        paidData.push(filtered.filter(f => f.status === 'paid').length);
        unpaidData.push(filtered.filter(f => f.status === 'unpaid').length);
        overdueData.push(filtered.filter(f => f.status === 'overdue').length);
      }
    } else if (filter === 'month') {
      for (let i = 0; i < 12; i++) {
        const date = new Date(2025, i, 1);
        labels.push(date.toLocaleString('fr-FR', { month: 'short' }));
        const filtered = factures.filter(f => {
          const fDate = new Date(f.created_at);
          return fDate.getFullYear() === 2025 && fDate.getMonth() === i;
        });
        paidData.push(filtered.filter(f => f.status === 'paid').length);
        unpaidData.push(filtered.filter(f => f.status === 'unpaid').length);
        overdueData.push(filtered.filter(f => f.status === 'overdue').length);
      }
    } else if (filter === 'year') {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        labels.push(year.toString());
        const filtered = factures.filter(f => {
          const fDate = new Date(f.created_at);
          return fDate.getFullYear() === year;
        });
        paidData.push(filtered.filter(f => f.status === 'paid').length);
        unpaidData.push(filtered.filter(f => f.status === 'unpaid').length);
        overdueData.push(filtered.filter(f => f.status === 'overdue').length);
      }
    }

    return {
      labels,
      datasets: [
        { label: 'Payées', data: paidData, backgroundColor: '#10b981' },
        { label: 'Impayées', data: unpaidData, backgroundColor: '#f59e0b' },
        { label: 'En retard', data: overdueData, backgroundColor: '#ef4444' },
      ],
    };
  };

  // Dynamic devis status data by time period
  const devisStatusData = () => {
    const now = new Date();
    const labels = [];
    const pendingData = [];
    const approvedData = [];
    const rejectedData = [];

    if (filter === 'day') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        labels.push(date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
        const filtered = devis.filter(d => {
          const dDate = new Date(d.created_at);
          return dDate.toDateString() === date.toDateString();
        });
        pendingData.push(filtered.filter(d => d.status === 'pending').length);
        approvedData.push(filtered.filter(d => d.status === 'approved').length);
        rejectedData.push(filtered.filter(d => d.status === 'rejected').length);
      }
    } else if (filter === 'month') {
      for (let i = 0; i < 12; i++) {
        const date = new Date(2025, i, 1);
        labels.push(date.toLocaleString('fr-FR', { month: 'short' }));
        const filtered = devis.filter(d => {
          const dDate = new Date(d.created_at);
          return dDate.getFullYear() === 2025 && dDate.getMonth() === i;
        });
        pendingData.push(filtered.filter(d => d.status === 'pending').length);
        approvedData.push(filtered.filter(d => d.status === 'approved').length);
        rejectedData.push(filtered.filter(d => d.status === 'rejected').length);
      }
    } else if (filter === 'year') {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        labels.push(year.toString());
        const filtered = devis.filter(d => {
          const dDate = new Date(d.created_at);
          return dDate.getFullYear() === year;
        });
        pendingData.push(filtered.filter(d => d.status === 'pending').length);
        approvedData.push(filtered.filter(d => d.status === 'approved').length);
        rejectedData.push(filtered.filter(d => d.status === 'rejected').length);
      }
    }

    return {
      labels,
      datasets: [
        { label: 'En attente', data: pendingData, backgroundColor: '#3b82f6' },
        { label: 'Approuvés', data: approvedData, backgroundColor: '#22c55e' },
        { label: 'Rejetés', data: rejectedData, backgroundColor: '#ef4444' },
      ],
    };
  };

  // Recent Activities (unchanged)
  const recentActivities = [
    { action: 'Nouveau devis soumis', time: '10:45 AM', date: new Date() },
    { action: 'Facture #1234 payée', time: 'Hier', date: new Date(Date.now() - 86400000) },
    { action: 'Anomalie détectée', time: '15/03/2025', date: new Date('2025-03-15') },
  ].filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'today') return activity.date.toDateString() === new Date().toDateString();
    if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return activity.date >= weekAgo;
    }
    return true;
  });

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <div className="flex">
        {/* Sidebar (unchanged) */}
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg h-screen fixed transition-all duration-300">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Devloppini</h2>
            <nav className="mt-6">
              <ul>
                <li className="mb-2"><a href="/dashboard" className="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-700 rounded"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>Tableau de bord</a></li>
                <li className="mb-2"><a href="/clients" className="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-700 rounded"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>Clients</a></li>
                <li className="mb-2"><a href="/devis" className="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-700 rounded"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01"></path></svg>Devis</a></li>
                <li className="mb-2"><a href="/factures" className="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-700 rounded"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Factures</a></li>
                <li className="mb-2"><a href="/paid-clients" className="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-700 rounded"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>clients paye</a></li>
              </ul>
            </nav>
            <button
              onClick={toggleDarkMode}
              className="mt-4 w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
              {darkMode ? 'Mode Clair' : 'Mode Sombre'}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Tableau de Bord</h1>
              <span className="text-gray-500 dark:text-gray-300">Dernière mise à jour : {new Date().toLocaleString('fr-FR', { hour12: false })}</span>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
                <p>{error}</p>
              </div>
            ) : (
              <>
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition">
                    <h3 className="text-lg font-semibold">Clients Actifs</h3>
                    <p className="text-4xl mt-2">{activeClientsCount}</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition">
                    <h3 className="text-lg font-semibold">Devis en attente</h3>
                    <p className="text-4xl mt-2">{pendingDevisCount}</p>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-700 text-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition">
                    <h3 className="text-lg font-semibold">Factures impayées</h3>
                    <p className="text-4xl mt-2">{unpaidFacturesCount}</p>
                  </div>
                  <div className="bg-gradient-to-r from-teal-500 to-teal-700 text-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition">
                    <h3 className="text-lg font-semibold">Montant Total Payé</h3>
                    <p className="text-4xl mt-2">{totalPaidAmount} TND</p>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Statut des Factures</h3>
                    </div>
                    <div className="h-64">
                      <Bar
                        data={factureStatusData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom' } },
                        }}
                      />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Statut des Devis</h3>
                    </div>
                    <div className="h-64">
                      <Pie
                        data={devisStatusData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom' } },
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Revenus</h3>
                    <select
                      className="p-2 border rounded dark:bg-gray-700 dark:text-white"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="day">Jour</option>
                      <option value="month">Mois</option>
                      <option value="year">Année</option>
                    </select>
                  </div>
                  <div className="h-80">
                    <Line
                      data={revenueData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: true },
                          tooltip: { callbacks: { label: ctx => `${ctx.raw} TND` } },
                        },
                        scales: { y: { beginAtZero: true } },
                      }}
                    />
                  </div>
                </div>

                {/* Testimonials and Recent Activities (unchanged) */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Gestion des Avis</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-gray-600 dark:text-gray-300">
                          <th className="p-2">Client</th>
                          <th className="p-2">Contenu</th>
                          <th className="p-2">Note</th>
                          <th className="p-2">Statut</th>
                          <th className="p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testimonials.map((testimonial) => (
                          <tr key={testimonial.id} className="border-t dark:border-gray-700">
                            <td className="p-2 text-gray-800 dark:text-white">{testimonial.client.name}</td>
                            <td className="p-2 text-gray-800 dark:text-white">{testimonial.content}</td>
                            <td className="p-2 text-gray-800 dark:text-white">{testimonial.rating}/5</td>
                            <td className="p-2 text-gray-800 dark:text-white">
                              {testimonial.is_approved ? 'Approuvé' : 'En attente'}
                            </td>
                            <td className="p-2">
                              <button
                                onClick={() => handleToggleApproval(testimonial.id, testimonial.is_approved)}
                                className={`px-4 py-2 rounded text-white ${
                                  testimonial.is_approved
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-green-500 hover:bg-green-600'
                                }`}
                              >
                                {testimonial.is_approved ? 'Désapprouver' : 'Approuver'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Activité Récente</h3>
                    <select
                      className="p-2 border rounded dark:bg-gray-700 dark:text-white"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">Tout</option>
                      <option value="today">Aujourd'hui</option>
                      <option value="week">Cette semaine</option>
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-gray-600 dark:text-gray-300">
                          <th className="p-2">Action</th>
                          <th className="p-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivities.map((activity, index) => (
                          <tr key={index} className="border-t dark:border-gray-700">
                            <td className="p-2 text-gray-800 dark:text-white">{activity.action}</td>
                            <td className="p-2 text-gray-600 dark:text-gray-300">{activity.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;