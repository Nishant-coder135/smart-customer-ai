const { useState, useEffect } = React;

// Simple icons as SVG components
const IconDashboard = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
const IconUsers = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconInsight = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m10 15 5 5 9-9"/><path d="m4 15 5 5 9-9"/><path d="m4 10 5 5"/></svg>;
const IconTheme = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;

// API Base URL - auto-detects local vs cloud deployment
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isDev = window.location.port === '8001' || window.location.port === '8080';
const API_BASE = (isLocal && isDev)
  ? `http://${window.location.hostname}:8000/api`   // Local dev: point to separate backend
  : `${window.location.protocol}//${window.location.host}/api`; // Production: same-origin API

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(true);
  
  // Dashboard Data State
  const [kpis, setKpis] = useState(null);
  const [insights, setInsights] = useState(null);
  const [clusters, setClusters] = useState(null);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    // Initial fetch
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [kpiRes, insightsRes, clusterRes] = await Promise.all([
          fetch(`${API_BASE}/dashboard/kpis`),
          fetch(`${API_BASE}/advisor/insights`),
          fetch(`${API_BASE}/dashboard/clusters`)
        ]);
        
        if(kpiRes.ok) setKpis(await kpiRes.json());
        if(insightsRes.ok) setInsights(await insightsRes.json());
        if(clusterRes.ok) setClusters(await clusterRes.json());
        
      } catch (err) {
        console.error("Failed to connect to backend", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 }).format(val);
  const formatNumber = (val) => new Intl.NumberFormat('en-US').format(val);

  return (
    <div className="app-container">
      {/* Sidebar - Desktop Only */}
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
            <span>SmartCustomer</span>AI
          </div>
          
          <nav className="nav-menu">
            <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <IconDashboard /> <span>Dashboard</span>
            </div>
            <div className={`nav-item ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')}>
              <IconUsers /> <span>Real-time Predictor</span>
            </div>
            <div className={`nav-item ${activeTab === 'advisor' ? 'active' : ''}`} onClick={() => setActiveTab('advisor')}>
              <IconInsight /> <span>AI Business Advisor</span>
            </div>
          </nav>
        </div>
        
        <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {installPrompt && (
            <button className="btn btn-primary" onClick={handleInstallClick} style={{margin: '0 16px 8px 16px'}}>
              Install App
            </button>
          )}
          <div className="nav-item" onClick={toggleTheme}>
            <IconTheme /> <span>Theme: {theme}</span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        <div className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <IconDashboard /> <span>Dashboard</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')}>
          <IconUsers /> <span>Predict</span>
        </div>
        {installPrompt ? (
          <div className="mobile-nav-item" onClick={handleInstallClick} style={{color: 'var(--accent-primary)'}}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             <span>Install</span>
          </div>
        ) : (
          <div className={`mobile-nav-item ${activeTab === 'advisor' ? 'active' : ''}`} onClick={() => setActiveTab('advisor')}>
            <IconInsight /> <span>AI Advisor</span>
          </div>
        )}
        <div className="mobile-nav-item" onClick={toggleTheme}>
          <IconTheme /> <span>Theme</span>
        </div>
      </nav>

      {/* Installation Guide Modal */}
      {showInstallGuide && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
          <div className="glass-card" style={{maxWidth: '400px', width: '100%', background: 'var(--bg-surface)'}}>
             <h2 style={{marginBottom: '16px'}}>Get the "Native" App Icon</h2>
             <p style={{color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem'}}>To remove the browser logo from the icon, follow these steps:</p>
             
             <div style={{marginBottom: '20px'}}>
               <strong style={{display: 'block', marginBottom: '8px'}}>iPhone (Safari)</strong>
               <p style={{fontSize: '0.85rem', color: 'var(--text-tertiary)'}}>Tap the <strong>Share</strong> button, then scroll down and select <strong>"Add to Home Screen"</strong>.</p>
             </div>
             
             <div style={{marginBottom: '24px'}}>
               <strong style={{display: 'block', marginBottom: '8px'}}>Android (Chrome)</strong>
               <p style={{fontSize: '0.85rem', color: 'var(--text-tertiary)'}}>Tap the <strong>30-Dots Menu</strong> and look for <strong>"Install App"</strong>. If you only see "Add to Shortcut", you'll need a secure (HTTPS) link to remove the badge.</p>
             </div>
             
             <button className="btn btn-primary" onClick={() => setShowInstallGuide(false)} style={{width: '100%'}}>Got it!</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {loading ? (
          <div className="animate-fade-in">
            <h1 className="page-title skeleton" style={{width: '300px', height: '40px', marginBottom: '40px'}}></h1>
            <div className="kpi-grid">
               {[1,2,3,4].map(i => <div key={i} className="glass-card skeleton" style={{height: '120px'}}></div>)}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* View Switcher */}
            {activeTab === 'dashboard' && <DashboardView kpis={kpis} clusters={clusters} fCurrency={formatCurrency} fNum={formatNumber} />}
            {activeTab === 'advisor' && <AdvisorView insights={insights} fCurrency={formatCurrency} />}
            {activeTab === 'simulator' && <SimulatorView fCurrency={formatCurrency} />}
          </div>
        )}
      </main>
    </div>
  );
};

// --- Sub-Views ---

const DashboardView = ({ kpis, clusters, fCurrency, fNum }) => {
  if (!kpis) return <div>Data not available. Make sure Backend is running.</div>;
  
  return (
             <div className="animate-fade-in">
                <header className="page-header">
                <div>
                   <h1 className="page-title">Executive Dashboard</h1>
                   <p className="page-subtitle">Real-time intelligence on your customer base</p>
                </div>
               </header>
               
               <div className="kpi-grid">
                  <div className="glass-card">
                     <div className="kpi-label">Total Revenue</div>
                     <div className="kpi-stat">{fCurrency(kpis.TotalRevenue)}</div>
                     <span className="kpi-trend positive">+12.5% M/M</span>
                  </div>
                  <div className="glass-card">
                     <div className="kpi-label">Active Customers</div>
                     <div className="kpi-stat">{fNum(kpis.ActiveCustomers)}</div>
                  </div>
                  <div className="glass-card">
                     <div className="kpi-label">Avg Lifetime Value</div>
                     <div className="kpi-stat">{fCurrency(kpis.AvgLifetimeValue)}</div>
                  </div>
                  <div className="glass-card" style={{borderLeft: "3px solid var(--danger)"}}>
                     <div className="kpi-label">High Churn Risk</div>
                     <div className="kpi-stat">{kpis.HighChurnRiskPct.toFixed(1)}%</div>
                     <span className="kpi-trend negative">Urgent Attention</span>
                  </div>
               </div>
               
               <div className="dashboard-grid mt-4">
                  <div className="glass-card">
                    <h3 style={{marginBottom: '16px'}}>Customer Segments (PCA Projection)</h3>
                    <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>Since we can't use Recharts via CDN easily, imagine a beautiful interactive Scatter chart here comparing clusters based on latent features.</p>
                    <div style={{background: 'var(--bg-main)', height: '300px', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                         [ Dimensionality Reduction Plot Area ]
                    </div>
                  </div>
                  
                  <div className="glass-card">
                     <h3 style={{marginBottom: '16px'}}>Segment Distribution</h3>
                     <ul style={{listStyle: 'none', padding: 0}}>
                        {clusters?.pieData?.map((item, i) => (
                           <li key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)'}}>
                             <span>{item.name}</span>
                             <strong>{item.value} customers</strong>
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>
             </div>
  );
};


const AdvisorView = ({ insights, fCurrency }) => {
  if (!insights) return <div>Data not available.</div>;
  
  return (
    <div className="animate-fade-in">
       <header className="page-header">
          <div>
             <h1 className="page-title">AI Business Advisor</h1>
             <p className="page-subtitle">Automated insights and smart budget allocation strategies</p>
          </div>
       </header>

       <div className="dashboard-grid">
           <div>
               <div className="glass-card mb-4">
                  <h3 style={{marginBottom: '24px'}}>Key Operating Insights</h3>
                  {insights.insights.map((msg, i) => (
                     <div key={i} className="advisor-item">
                        <div className="advisor-icon">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <div className="advisor-text">
                           {msg}
                        </div>
                     </div>
                  ))}
               </div>
           </div>
           
           <div>
              <div className="glass-card">
                  <h3 style={{marginBottom: '24px'}}>Smart Budget Allocation</h3>
                  <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>AI-recommended distribution for a $10,000 monthly marketing budget.</p>
                  
                  {insights.budgetAllocation.map((item, i) => (
                      <div key={i} style={{marginBottom: '24px'}}>
                         <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                            <strong>{item.Label}</strong>
                            <span style={{color: 'var(--accent-primary)', fontWeight: 'bold'}}>{fCurrency(item.SuggestedBudget)}</span>
                         </div>
                         <div style={{width: '100%', height: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden'}}>
                            <div style={{width: `${(item.SuggestedBudget / 10000) * 100}%`, height: '100%', backgroundColor: 'var(--accent-primary)'}}></div>
                         </div>
                         <div style={{fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px'}}>
                            Strategy: {item.Strategy} | {item.CustomerCount} Customers
                         </div>
                      </div>
                  ))}
              </div>
           </div>
       </div>
    </div>
  );
}


const SimulatorView = ({ fCurrency }) => {
   const [rfm, setRfm] = useState({ r: 15, f: 5, m: 150 });
   const [prediction, setPrediction] = useState(null);
   const [loading, setLoading] = useState(false);
   
   const handlePredict = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
         const res = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ recency: rfm.r, frequency: rfm.f, monetary: rfm.m })
         });
         const data = await res.json();
         setPrediction(data);
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
   };

   return (
       <div className="animate-fade-in">
           <header className="page-header">
             <div>
                <h1 className="page-title">Real-time Predictor</h1>
                <p className="page-subtitle">Simulate RFM scenarios and get AI-generated campaigns</p>
             </div>
          </header>
          
          <div className="dashboard-grid">
               <div className="glass-card">
                  <h3 style={{marginBottom: '24px'}}>Customer Profile Input</h3>
                  <form onSubmit={handlePredict}>
                     <div className="input-group">
                        <label className="input-label">Recency: {rfm.r} days since last purchase</label>
                        <input type="range" min="1" max="365" value={rfm.r} onChange={e => setRfm({...rfm, r: parseInt(e.target.value)})} />
                     </div>
                     <div className="input-group">
                        <label className="input-label">Frequency: {rfm.f} total purchases</label>
                        <input type="range" min="1" max="50" value={rfm.f} onChange={e => setRfm({...rfm, f: parseInt(e.target.value)})} />
                     </div>
                     <div className="input-group">
                        <label className="input-label">Monetary: {fCurrency(rfm.m)} total spend</label>
                        <input type="range" min="5" max="2000" step="5" value={rfm.m} onChange={e => setRfm({...rfm, m: parseInt(e.target.value)})} />
                     </div>
                     <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '16px'}}>
                        {loading ? 'Analyzing...' : 'Generate Prediction'}
                     </button>
                  </form>
               </div>
               
               <div>
                  {prediction ? (
                     <div className="glass-card animate-fade-in" style={{borderTop: `4px solid ${prediction.ChurnProbability > 0.7 ? 'var(--danger)' : 'var(--success)'}`}}>
                         <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                            <div>
                               <div className="kpi-label">Predicted Segment</div>
                               <h2 style={{fontSize: '1.5rem', color: 'var(--text-primary)'}}>{prediction.SegmentLabel}</h2>
                            </div>
                            <div style={{textAlign: 'right'}}>
                                <div className="kpi-label">Churn Risk</div>
                                <h2 style={{fontSize: '1.5rem', color: prediction.ChurnProbability > 0.7 ? 'var(--danger)' : 'var(--success)'}}>
                                   {(prediction.ChurnProbability * 100).toFixed(0)}%
                                </h2>
                            </div>
                         </div>
                         
                         <div style={{padding: '16px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '24px', borderLeft: '3px solid var(--accent-secondary)'}}>
                            <h4 style={{marginBottom: '8px', color: 'var(--text-primary)'}}>AI Recommendation</h4>
                            <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px'}}>
                               <strong>Action:</strong> {prediction.Recommendation.Action}<br/>
                               <strong>Why:</strong> {prediction.Recommendation.Reason}
                            </div>
                            <div style={{display:'inline-block', padding: '4px 8px', background: 'var(--bg-surface-hover)', borderRadius: '4px', fontSize: '0.8rem'}}>
                               Expected Result: {prediction.Recommendation.ExpectedOutcome}
                            </div>
                         </div>
                         
                         <div>
                            <h4 style={{marginBottom: '12px'}}>Auto-Generated Campaign</h4>
                            <div style={{border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px'}}>
                                <div style={{fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px'}}>Subject:</div>
                                <div style={{fontWeight: 'bold', marginBottom: '16px'}}>{prediction.CampaignSuggest.email_subject}</div>
                                <div style={{fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px'}}>Channel & Offer:</div>
                                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                   <span style={{padding: '4px 8px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', borderRadius: '4px', fontSize: '0.8rem'}}>{prediction.CampaignSuggest.channel}</span>
                                   <span style={{padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '4px', fontSize: '0.8rem'}}>{prediction.CampaignSuggest.offer}</span>
                                </div>
                            </div>
                         </div>
                     </div>
                  ) : (
                     <div className="glass-card" style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)'}}>
                        Input RFM values to see AI prediction
                     </div>
                  )}
               </div>
          </div>
       </div>
   );
}

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
