const API_BASE_URL = 'http://localhost:5000/api';

// Simple Alert notification helper
const notify = (msg, type = 'info') => {
    const container = document.getElementById('notification-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white border-0 show mb-2 glass-card`;
    toast.style.background = type === 'success' ? 'rgba(0, 184, 148, 0.9)' : type === 'danger' ? 'rgba(255, 118, 117, 0.9)' : 'rgba(9, 132, 227, 0.9)';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body"><i class="bi bi-info-circle-fill me-2"></i>${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};

// --- APP COMPONENT ---
function App() {
    const [page, setPage] = React.useState('landing');
    const [selectedStock, setSelectedStock] = React.useState('RELIANCE');
    const [token, setToken] = React.useState(localStorage.getItem('token') || '');
    const [user, setUser] = React.useState(null);
    const [theme, setTheme] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
    const [indices, setIndices] = React.useState({});
    const [notifications, setNotifications] = React.useState([
        { id: 1, text: "Welcome to ZenTrade! Get ₹10,00,000 virtual balance.", time: "Just now" }
    ]);
    const [sidebarActive, setSidebarActive] = React.useState(false);

    // Call API Helper
    const apiCall = React.useCallback(async (endpoint, method = 'GET', body = null) => {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const config = { method, headers };
        if (body) {
            config.body = JSON.stringify(body);
        }
        
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }
            return data;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }, [token]);

    // Check auth on startup
    React.useEffect(() => {
        if (token) {
            apiCall('/auth/profile')
                .then(userData => {
                    setUser(userData);
                    if (page === 'landing' || page === 'login' || page === 'register') {
                        setPage('dashboard');
                    }
                })
                .catch(err => {
                    console.error("Session expired:", err.message);
                    setToken('');
                    localStorage.removeItem('token');
                    setUser(null);
                    setPage('landing');
                });
        }
    }, [token, apiCall]);

    // Fetch market indices periodically
    React.useEffect(() => {
        const fetchIndices = () => {
            fetch(`${API_BASE_URL}/stocks/indices`)
                .then(res => res.json())
                .then(data => setIndices(data))
                .catch(err => console.error("Indices error:", err));
        };
        fetchIndices();
        const interval = setInterval(fetchIndices, 5000); // 5 sec live feed
        return () => clearInterval(interval);
    }, []);

    // Check alerts periodically if logged in
    React.useEffect(() => {
        if (!token) return;
        const checkAlerts = () => {
            apiCall('/alerts/check', 'POST')
                .then(data => {
                    if (data.triggered && data.triggered.length > 0) {
                        data.triggered.forEach(alert => {
                            notify(alert.message, 'info');
                            setNotifications(prev => [
                                { id: Date.now(), text: alert.message, time: "Just now" },
                                ...prev
                            ]);
                            // Trigger browser notification if allowed
                            if (Notification.permission === 'granted') {
                                new Notification("ZenTrade Price Alert", { body: alert.message });
                            }
                        });
                    }
                })
                .catch(err => console.error("Alerts check error:", err));
        };
        checkAlerts();
        const interval = setInterval(checkAlerts, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, [token, apiCall]);

    // Request Notification permission
    React.useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
    };

    const handleLogin = (jwtToken, userData) => {
        setToken(jwtToken);
        localStorage.setItem('token', jwtToken);
        setUser(userData);
        notify("Logged in successfully!", "success");
        setPage('dashboard');
    };

    const handleLogout = () => {
        apiCall('/auth/logout', 'POST')
            .finally(() => {
                setToken('');
                localStorage.removeItem('token');
                setUser(null);
                notify("Logged out successfully!", "info");
                setPage('landing');
            });
    };

    // Routing Render Selector
    const renderPage = () => {
        switch (page) {
            case 'landing':
                return <LandingPage setPage={setPage} indices={indices} />;
            case 'login':
                return <LoginView setPage={setPage} handleLogin={handleLogin} apiCall={apiCall} />;
            case 'register':
                return <RegisterView setPage={setPage} handleLogin={handleLogin} apiCall={apiCall} />;
            case 'forgot-password':
                return <ForgotPasswordView setPage={setPage} apiCall={apiCall} />;
            case 'dashboard':
                return <DashboardView setPage={setPage} setSelectedStock={setSelectedStock} apiCall={apiCall} user={user} />;
            case 'portfolio':
                return <PortfolioView apiCall={apiCall} token={token} />;
            case 'watchlist':
                return <WatchlistView setSelectedStock={setSelectedStock} setPage={setPage} apiCall={apiCall} />;
            case 'market':
                return <MarketView setSelectedStock={setSelectedStock} setPage={setPage} apiCall={apiCall} indices={indices} />;
            case 'news':
                return <NewsView apiCall={apiCall} token={token} />;
            case 'calculators':
                return <CalculatorsView apiCall={apiCall} />;
            case 'admin':
                return <AdminView apiCall={apiCall} />;
            case 'profile':
                return <ProfileView apiCall={apiCall} user={user} setUser={setUser} />;
            case 'stock-details':
                return <StockDetailsView symbol={selectedStock} apiCall={apiCall} user={user} setUser={setUser} setPage={setPage} />;
            default:
                return <LandingPage setPage={setPage} indices={indices} />;
        }
    };

    const isAuthPage = ['landing', 'login', 'register', 'forgot-password'].includes(page);

    return (
        <div className="app-container">
            {/* Notification Toast Container */}
            <div id="notification-toast-container" className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100 }}></div>

            {/* Live Index Marquee */}
            {isAuthPage && <Marquee indices={indices} />}

            <div className="d-flex">
                {/* Responsive Sidebar for Logged-In Users */}
                {!isAuthPage && (
                    <Sidebar 
                        active={sidebarActive} 
                        setActive={setSidebarActive} 
                        page={page} 
                        setPage={setPage} 
                        user={user} 
                        handleLogout={handleLogout} 
                    />
                )}

                {/* Main View Area */}
                <div className={`flex-grow-1 ${isAuthPage ? '' : 'main-content'}`}>
                    {/* Top navigation for logged-in users */}
                    {!isAuthPage && (
                        <Topbar 
                            toggleTheme={toggleTheme} 
                            theme={theme} 
                            user={user} 
                            setSidebarActive={setSidebarActive} 
                            setPage={setPage}
                            setSelectedStock={setSelectedStock}
                            apiCall={apiCall}
                            notifications={notifications}
                        />
                    )}

                    {renderPage()}
                </div>
            </div>
        </div>
    );
}

// --- SHARED COMPONENTS ---

// 1. Live Marquee
function Marquee({ indices }) {
    const indexList = Object.entries(indices);
    if (indexList.length === 0) return null;
    return (
        <div className="marquee-container glass-nav">
            <div className="marquee-content">
                {indexList.map(([key, idx]) => {
                    const isUp = idx.change_pct >= 0;
                    return (
                        <span key={key} className="marquee-item">
                            <span className="text-secondary">{key}:</span>
                            <span className="fw-bold">{Number(idx.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            <span className={isUp ? 'text-up' : 'text-down'}>
                                <i className={`bi bi-caret-${isUp ? 'up' : 'down'}-fill`}></i> 
                                {isUp ? '+' : ''}{idx.change_pct}%
                            </span>
                        </span>
                    );
                })}
                {/* Repeat elements for seamless marquee slider */}
                {indexList.map(([key, idx]) => {
                    const isUp = idx.change_pct >= 0;
                    return (
                        <span key={`${key}-repeat`} className="marquee-item">
                            <span className="text-secondary">{key}:</span>
                            <span className="fw-bold">{Number(idx.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            <span className={isUp ? 'text-up' : 'text-down'}>
                                <i className={`bi bi-caret-${isUp ? 'up' : 'down'}-fill`}></i> 
                                {isUp ? '+' : ''}{idx.change_pct}%
                            </span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

// 2. Sidebar Component
function Sidebar({ active, setActive, page, setPage, user, handleLogout }) {
    const handleNavigation = (p) => {
        setPage(p);
        setActive(false); // Close sidebar on mobile
    };

    return (
        <>
            {/* Mobile overlay */}
            {active && <div className="modal-backdrop fade show d-lg-none" onClick={() => setActive(false)}></div>}
            
            <div className={`sidebar-container ${active ? 'active' : ''}`}>
                <a href="#" className="sidebar-logo" onClick={() => handleNavigation('dashboard')}>
                    <i className="bi bi-graph-up-arrow"></i> ZenTrade
                </a>
                <ul className="sidebar-menu">
                    <li className={`sidebar-item ${page === 'dashboard' ? 'active' : ''}`}>
                        <a href="#" onClick={() => handleNavigation('dashboard')}>
                            <i className="bi bi-speedometer2"></i> Dashboard
                        </a>
                    </li>
                    <li className={`sidebar-item ${page === 'portfolio' ? 'active' : ''}`}>
                        <a href="#" onClick={() => handleNavigation('portfolio')}>
                            <i className="bi bi-briefcase"></i> Portfolio
                        </a>
                    </li>
                    <li className={`sidebar-item ${page === 'watchlist' ? 'active' : ''}`}>
                        <a href="#" onClick={() => handleNavigation('watchlist')}>
                            <i className="bi bi-bookmark-star"></i> Watchlist
                        </a>
                    </li>
                    <li className={`sidebar-item ${page === 'market' ? 'active' : ''}`}>
                        <a href="#" onClick={() => handleNavigation('market')}>
                            <i className="bi bi-globe"></i> Markets
                        </a>
                    </li>
                    <li className={`sidebar-item ${page === 'news' ? 'active' : ''}`}>
                        <a href="#" onClick={() => handleNavigation('news')}>
                            <i className="bi bi-newspaper"></i> News Feed
                        </a>
                    </li>
                    <li className={`sidebar-item ${page === 'calculators' ? 'active' : ''}`}>
                        <a href="#" onClick={() => handleNavigation('calculators')}>
                            <i className="bi bi-calculator"></i> Calculators
                        </a>
                    </li>
                    <li className={`sidebar-item ${page === 'profile' ? 'active' : ''}`}>
                        <a href="#" onClick={() => handleNavigation('profile')}>
                            <i className="bi bi-person-circle"></i> Profile
                        </a>
                    </li>
                    {user && user.role === 'admin' && (
                        <li className={`sidebar-item ${page === 'admin' ? 'active' : ''}`}>
                            <a href="#" onClick={() => handleNavigation('admin')}>
                                <i className="bi bi-shield-lock"></i> Admin Panel
                            </a>
                        </li>
                    )}
                </ul>

                <div className="position-absolute bottom-0 start-0 w-100 p-3">
                    <button className="btn btn-outline-danger w-100 border-0 rounded-3 d-flex align-items-center justify-content-center gap-2" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-left"></i> Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}

// 3. Topbar Component
function Topbar({ toggleTheme, theme, user, setSidebarActive, setPage, setSelectedStock, apiCall, notifications }) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [suggestions, setSuggestions] = React.useState([]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);

    React.useEffect(() => {
        if (!searchQuery) {
            setSuggestions([]);
            return;
        }
        const timer = setTimeout(() => {
            fetch(`${API_BASE_URL}/stocks/search?q=${searchQuery}`)
                .then(res => res.json())
                .then(data => setSuggestions(data))
                .catch(err => console.error("Search error:", err));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const selectStock = (sym) => {
        setSelectedStock(sym);
        setPage('stock-details');
        setSearchQuery('');
        setShowSuggestions(false);
    };

    return (
        <nav className="navbar navbar-expand-lg glass-nav sticky-top px-3 mb-4 rounded-4" style={{ zIndex: 900 }}>
            <div className="container-fluid gap-3">
                <button className="btn btn-outline-secondary d-lg-none" onClick={() => setSidebarActive(true)}>
                    <i className="bi bi-list"></i>
                </button>
                
                {/* Search Bar */}
                <div className="position-relative flex-grow-1 max-w-400">
                    <div className="input-group">
                        <span className="input-group-text bg-transparent border-end-0 border-color"><i className="bi bi-search text-muted"></i></span>
                        <input 
                            type="text" 
                            className="form-control border-start-0 border-color glass-input text-white" 
                            placeholder="Search stock (e.g. RELIANCE, AAPL)..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                            onFocus={() => setShowSuggestions(true)}
                        />
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="position-absolute w-100 glass-card mt-2 shadow-premium overflow-hidden" style={{ zIndex: 1200 }}>
                            <ul className="list-group list-group-flush bg-transparent">
                                {suggestions.map(s => (
                                    <li 
                                        key={s.symbol} 
                                        className="list-group-item bg-transparent text-white border-color list-group-item-action d-flex justify-content-between align-items-center cursor-pointer p-3"
                                        onClick={() => selectStock(s.symbol)}
                                    >
                                        <div>
                                            <span className="fw-bold text-success me-2">{s.symbol}</span>
                                            <span className="text-secondary small">{s.name}</span>
                                        </div>
                                        <span className="badge bg-secondary rounded-pill">{s.sector}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="d-flex align-items-center gap-3">
                    {/* Theme Toggle */}
                    <button className="btn btn-outline-secondary border-color rounded-circle p-2" onClick={toggleTheme} style={{ width: '40px', height: '40px' }}>
                        <i className={`bi bi-${theme === 'dark' ? 'sun' : 'moon'}`}></i>
                    </button>

                    {/* Notifications Dropdown */}
                    <div className="dropdown">
                        <button className="btn btn-outline-secondary border-color rounded-circle p-2 position-relative" data-bs-toggle="dropdown" style={{ width: '40px', height: '40px' }}>
                            <i className="bi bi-bell"></i>
                            {notifications.length > 0 && <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>}
                        </button>
                        <div className="dropdown-menu dropdown-menu-end glass-card p-3 shadow-premium width-300">
                            <h6 className="fw-bold mb-3 border-bottom border-color pb-2">Notifications</h6>
                            {notifications.length === 0 ? (
                                <p className="text-muted small text-center mb-0">No new notifications</p>
                            ) : (
                                <div className="d-flex flex-column gap-2 max-h-200 overflow-y-auto">
                                    {notifications.map(n => (
                                        <div key={n.id} className="p-2 border-bottom border-color-5">
                                            <p className="small mb-1">{n.text}</p>
                                            <span className="text-muted text-10">{n.time}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Avatar */}
                    <div className="d-none d-md-flex align-items-center gap-2 cursor-pointer" onClick={() => setPage('profile')}>
                        <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px' }}>
                            {user ? user.username[0].toUpperCase() : 'U'}
                        </div>
                        <div className="text-start">
                            <div className="fw-semibold text-14">{user ? user.username : 'User'}</div>
                            <div className="text-muted text-12">{user && user.role === 'admin' ? 'Admin' : 'Trader'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

// 4. Landing Page
function LandingPage({ setPage, indices }) {
    return (
        <div className="min-vh-100 bg-dark text-white">
            {/* Header / Nav */}
            <nav className="navbar navbar-expand-lg glass-nav fixed-top px-4 py-3">
                <div className="container">
                    <a className="navbar-brand fw-bold text-success fs-3" href="#"><i className="bi bi-graph-up-arrow"></i> ZenTrade</a>
                    <div className="d-flex gap-3">
                        <button className="btn btn-outline-success border-2 fw-semibold px-4 rounded-3" onClick={() => setPage('login')}>Sign In</button>
                        <button className="btn btn-premium-primary px-4 rounded-3" onClick={() => setPage('register')}>Get Started</button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero-section text-center">
                <div className="container py-5">
                    <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-3 py-2 rounded-pill fw-semibold mb-4">🚀 India's Premier Virtual Trading Platform</span>
                    <h1 className="display-4 fw-extrabold mb-3">Master the Stock Markets <br /><span className="text-success text-gradient">Without Capital Risk</span></h1>
                    <p className="lead text-secondary max-w-600 mx-auto mb-5">
                        Experience Zerodha-like lightning execution combined with TradingView charts. Trade, learn, and test your strategy with ₹10,00,000 virtual balance.
                    </p>
                    <div className="d-flex justify-content-center gap-3 mb-5">
                        <button className="btn btn-premium-primary btn-lg px-5 py-3 rounded-3" onClick={() => setPage('register')}>Start Virtual Trading Now</button>
                    </div>
                    
                    {/* Landing Index ticker cards */}
                    <div className="row justify-content-center mt-5 g-4">
                        {Object.entries(indices).slice(0, 3).map(([key, idx]) => {
                            const isUp = idx.change_pct >= 0;
                            return (
                                <div key={key} className="col-md-4 col-lg-3">
                                    <div className="glass-card p-3 text-start">
                                        <span className="text-secondary small">{idx.name}</span>
                                        <h4 className="fw-bold mt-1 mb-2">{Number(idx.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                                        <span className={isUp ? 'price-badge-up' : 'price-badge-down'}>
                                            <i className={`bi bi-arrow-${isUp ? 'up' : 'down'}-short`}></i>
                                            {isUp ? '+' : ''}{idx.change_pct}% Today
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Features Section */}
            <section className="py-5 bg-secondary bg-opacity-25 border-top border-bottom border-color">
                <div className="container py-5 text-center">
                    <h2 className="fw-bold mb-5">Supercharged Features For Investors</h2>
                    <div className="row g-4 text-start">
                        <div className="col-md-4">
                            <div className="glass-card p-4 h-100">
                                <div className="text-success mb-3 fs-1"><i className="bi bi-bar-chart-steps"></i></div>
                                <h4 className="fw-bold">Virtual Portfolio</h4>
                                <p className="text-muted">Start with ₹10,00,000 virtual INR. Practice buying, selling, and track detailed profit/loss analytics in real-time.</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="glass-card p-4 h-100">
                                <div className="text-success mb-3 fs-1"><i className="bi bi-clock-history"></i></div>
                                <h4 className="fw-bold">Dynamic Watchlists</h4>
                                <p className="text-muted">Create multiple custom watchlists with live price feeds. Set alerts and get instant browser notifications.</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="glass-card p-4 h-100">
                                <div className="text-success mb-3 fs-1"><i className="bi bi-cpu"></i></div>
                                <h4 className="fw-bold">AI Portfolio Insights</h4>
                                <p className="text-muted">Get smart automated ratings on your portfolio concentration, asset allocations, and custom suggestions.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-5">
                <div className="container py-5 max-w-800 mx-auto">
                    <h2 className="fw-bold text-center mb-5">Frequently Asked Questions</h2>
                    <div className="accordion accordion-dark" id="faqAccordion">
                        <div className="accordion-item glass-card mb-3 border-0 overflow-hidden">
                            <h2 className="accordion-header">
                                <button className="accordion-button bg-transparent text-white collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">
                                    Is this real-money trading?
                                </button>
                            </h2>
                            <div id="faq1" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                                <div className="accordion-body text-muted">
                                    No, ZenTrade is entirely a virtual trading simulation. You start with paper capital of ₹10,00,000 to practice and learn strategies risk-free.
                                </div>
                            </div>
                        </div>
                        <div className="accordion-item glass-card mb-3 border-0 overflow-hidden">
                            <h2 className="accordion-header">
                                <button className="accordion-button bg-transparent text-white collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">
                                    Are stock prices live?
                                </button>
                            </h2>
                            <div id="faq2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                                <div className="accordion-body text-muted">
                                    Yes! The system integrates keyless Yahoo Finance API queries, supported by an advanced real-time price tick simulation engine for high-fidelity movements.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-dark border-top border-color py-5 text-center text-secondary">
                <div className="container">
                    <p className="mb-2">© {new Date().getFullYear()} ZenTrade. Made with <i className="bi bi-heart-fill text-danger"></i> for modern traders.</p>
                    <p className="small text-muted">Trading stocks carries market risk. Paper trading accounts do not constitute commercial investment advisors.</p>
                </div>
            </footer>
        </div>
    );
}

// --- AUTHENTICATION VIEWS ---

// 1. Login View
function LoginView({ setPage, handleLogin, apiCall }) {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await apiCall('/auth/login', 'POST', { email, password });
            handleLogin(data.token, data.user);
        } catch (err) {
            notify(err.message, 'danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vh-100 d-flex align-items-center justify-content-center bg-dark text-white p-3">
            <div className="glass-card p-5 w-100 max-w-450">
                <h3 className="fw-bold text-center mb-1 text-success">Welcome Back</h3>
                <p className="text-center text-muted small mb-4">Enter credentials to access your trading desk</p>
                
                <form onSubmit={onSubmit}>
                    <div className="mb-3">
                        <label className="form-label text-secondary small">Email or Username</label>
                        <input type="text" required className="form-control glass-input" value={email} onChange={e=>setEmail(e.target.value)} />
                    </div>
                    <div className="mb-4">
                        <div className="d-flex justify-content-between mb-1">
                            <label className="form-label text-secondary small mb-0">Password</label>
                            <a href="#" onClick={() => setPage('forgot-password')} className="text-success text-12 text-decoration-none">Forgot Password?</a>
                        </div>
                        <input type="password" required className="form-control glass-input" value={password} onChange={e=>setPassword(e.target.value)} />
                    </div>
                    
                    <button type="submit" className="btn btn-premium-primary w-100 py-3 mb-3 d-flex justify-content-center align-items-center" disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null} Sign In
                    </button>
                </form>
                
                <p className="text-center text-secondary small mb-0">
                    New to ZenTrade? <a href="#" onClick={() => setPage('register')} className="text-success text-decoration-none fw-semibold">Create Account</a>
                </p>
            </div>
        </div>
    );
}

// 2. Register View
function RegisterView({ setPage, handleLogin, apiCall }) {
    const [username, setUsername] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await apiCall('/auth/register', 'POST', { username, email, password });
            handleLogin(data.token, data.user);
        } catch (err) {
            notify(err.message, 'danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vh-100 d-flex align-items-center justify-content-center bg-dark text-white p-3">
            <div className="glass-card p-5 w-100 max-w-450">
                <h3 className="fw-bold text-center mb-1 text-success">Create Account</h3>
                <p className="text-center text-muted small mb-4">Start trading with ₹10,00,000 paper balance</p>
                
                <form onSubmit={onSubmit}>
                    <div className="mb-3">
                        <label className="form-label text-secondary small">Username</label>
                        <input type="text" required className="form-control glass-input" value={username} onChange={e=>setUsername(e.target.value)} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label text-secondary small">Email Address</label>
                        <input type="email" required className="form-control glass-input" value={email} onChange={e=>setEmail(e.target.value)} />
                    </div>
                    <div className="mb-4">
                        <label className="form-label text-secondary small">Password</label>
                        <input type="password" required className="form-control glass-input" value={password} onChange={e=>setPassword(e.target.value)} />
                    </div>
                    
                    <button type="submit" className="btn btn-premium-primary w-100 py-3 mb-3 d-flex justify-content-center align-items-center" disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null} Register
                    </button>
                </form>
                
                <p className="text-center text-secondary small mb-0">
                    Already have an account? <a href="#" onClick={() => setPage('login')} className="text-success text-decoration-none fw-semibold">Sign In</a>
                </p>
            </div>
        </div>
    );
}

// 3. Forgot Password View
function ForgotPasswordView({ setPage, apiCall }) {
    const [email, setEmail] = React.useState('');
    const [token, setToken] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [codeSent, setCodeSent] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    const onSendCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await apiCall('/auth/forgot-password', 'POST', { email });
            setCodeSent(true);
            setToken(data.reset_token);
            notify("Mock reset code generated! Code loaded into form.", "success");
        } catch (err) {
            notify(err.message, 'danger');
        } finally {
            setLoading(false);
        }
    };

    const onReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiCall('/auth/reset-password', 'POST', { email, token, password });
            notify("Password reset successfully! Log in now.", "success");
            setPage('login');
        } catch (err) {
            notify(err.message, 'danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vh-100 d-flex align-items-center justify-content-center bg-dark text-white p-3">
            <div className="glass-card p-5 w-100 max-w-450">
                <h3 className="fw-bold text-center mb-1 text-success">Reset Password</h3>
                <p className="text-center text-muted small mb-4">Recover access to your account details</p>
                
                {!codeSent ? (
                    <form onSubmit={onSendCode}>
                        <div className="mb-4">
                            <label className="form-label text-secondary small">Register Email Address</label>
                            <input type="email" required className="form-control glass-input" value={email} onChange={e=>setEmail(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-premium-primary w-100 py-3 mb-3 d-flex justify-content-center align-items-center" disabled={loading}>
                            {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null} Send Reset Code
                        </button>
                    </form>
                ) : (
                    <form onSubmit={onReset}>
                        <div className="mb-3">
                            <label className="form-label text-secondary small">Reset Token (Autofilled for ease)</label>
                            <input type="text" required className="form-control glass-input" value={token} onChange={e=>setToken(e.target.value)} />
                        </div>
                        <div className="mb-4">
                            <label className="form-label text-secondary small">New Password</label>
                            <input type="password" required className="form-control glass-input" value={password} onChange={e=>setPassword(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-premium-primary w-100 py-3 mb-3 d-flex justify-content-center align-items-center" disabled={loading}>
                            {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null} Reset Password
                        </button>
                    </form>
                )}
                
                <p className="text-center text-secondary small mb-0">
                    Remember password? <a href="#" onClick={() => setPage('login')} className="text-success text-decoration-none fw-semibold">Sign In</a>
                </p>
            </div>
        </div>
    );
}

// --- CORE APP MODULE VIEWS ---

// 1. Dashboard View
function DashboardView({ setPage, setSelectedStock, apiCall, user }) {
    const [portfolioData, setPortfolioData] = React.useState(null);
    const [movers, setMovers] = React.useState({ gainers: [], losers: [], most_active: [] });
    const [news, setNews] = React.useState([]);
    const [recommendations, setRecommendations] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const loadDashboardData = React.useCallback(() => {
        Promise.all([
            apiCall('/trade/portfolio').catch(() => null),
            apiCall('/stocks/market-movers').catch(() => ({ gainers: [], losers: [], most_active: [] })),
            apiCall('/news').catch(() => []),
            apiCall('/insights/recommendations').catch(() => [])
        ]).then(([pData, moversData, newsData, recsData]) => {
            setPortfolioData(pData);
            setMovers(moversData);
            setNews(newsData);
            setRecommendations(recsData);
            setLoading(false);
        });
    }, [apiCall]);

    React.useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 8000); // refresh tickers
        return () => clearInterval(interval);
    }, [loadDashboardData]);

    const viewDetails = (sym) => {
        setSelectedStock(sym);
        setPage('stock-details');
    };

    if (loading) {
        return (
            <div className="container py-4">
                <div className="row g-4">
                    <div className="col-md-8"><div className="glass-card skeleton p-5 mb-4" style={{ height: '220px' }}></div></div>
                    <div className="col-md-4"><div className="glass-card skeleton p-5 mb-4" style={{ height: '220px' }}></div></div>
                    <div className="col-md-6"><div className="glass-card skeleton p-5 mb-4" style={{ height: '350px' }}></div></div>
                    <div className="col-md-6"><div className="glass-card skeleton p-5 mb-4" style={{ height: '350px' }}></div></div>
                </div>
            </div>
        );
    }

    const pnl = portfolioData ? portfolioData.today_pnl : 0.0;
    const portfolioVal = portfolioData ? portfolioData.portfolio_value : 1000000.0;
    const isUp = pnl >= 0;

    return (
        <div className="container-fluid py-2">
            {/* Upper stats row */}
            <div className="row g-4 mb-4">
                <div className="col-md-8">
                    <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between position-relative overflow-hidden">
                        <div className="position-absolute end-0 top-0 p-3 text-success opacity-10 fs-1"><i className="bi bi-wallet2"></i></div>
                        <div>
                            <span className="text-secondary small fw-bold text-uppercase">Account Portfolio Valuation</span>
                            <h1 className="fw-extrabold mt-1 mb-2">₹{portfolioVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h1>
                        </div>
                        <div className="d-flex gap-4 border-top border-color pt-3 mt-3">
                            <div>
                                <span className="text-muted small">Today's P&L</span>
                                <h5 className={`fw-bold mt-1 ${isUp ? 'text-up' : 'text-down'}`}>
                                    {isUp ? '+' : ''}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </h5>
                            </div>
                            <div>
                                <span className="text-muted small">Invested Value</span>
                                <h5 className="fw-bold mt-1">₹{portfolioData ? portfolioData.total_investment.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</h5>
                            </div>
                            <div>
                                <span className="text-muted small">Available Margin</span>
                                <h5 className="fw-bold mt-1 text-info">₹{portfolioData ? portfolioData.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '1,00,000.00'}</h5>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI concentration quick view */}
                <div className="col-md-4">
                    <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between">
                        <div>
                            <span className="text-secondary small fw-bold text-uppercase">Diversification Score</span>
                            <div className="d-flex align-items-center gap-3 mt-2">
                                <h2 className="fw-extrabold text-success mb-0">{portfolioData ? portfolioData.diversification_score : 0}/100</h2>
                                <span className="badge bg-success bg-opacity-25 text-success">Good Stand</span>
                            </div>
                        </div>
                        <p className="small text-muted mb-0 border-top border-color pt-3 mt-3">
                            {portfolioData && portfolioData.holdings.length > 0 
                                ? "Your portfolio looks stable. Expand to alternate sectors to increase security." 
                                : "Empty holdings. Allocate cash to active stock positions to get security ratings."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Markets movers / hot lists */}
            <div className="row g-4 mb-4">
                <div className="col-lg-8">
                    <div className="glass-card p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold mb-0"><i className="bi bi-lightning-charge text-warning"></i> Market Performance Highlights</h5>
                            <button className="btn btn-outline-secondary border-0 btn-sm rounded-pill" onClick={() => setPage('market')}>View Full Hub</button>
                        </div>
                        
                        <ul className="nav nav-tabs border-color mb-3" role="tablist">
                            <li className="nav-item"><button className="nav-link text-white active border-0 bg-transparent fw-semibold" data-bs-toggle="tab" data-bs-target="#gainers-tab">Top Gainers</button></li>
                            <li className="nav-item"><button className="nav-link text-white border-0 bg-transparent fw-semibold" data-bs-toggle="tab" data-bs-target="#losers-tab">Top Losers</button></li>
                            <li className="nav-item"><button className="nav-link text-white border-0 bg-transparent fw-semibold" data-bs-toggle="tab" data-bs-target="#active-tab">Most Active</button></li>
                        </ul>
                        
                        <div className="tab-content">
                            <div className="tab-pane fade show active" id="gainers-tab">
                                <div className="table-responsive">
                                    <table className="table table-dark table-hover align-middle border-color-5">
                                        <thead><tr className="text-secondary small"><th>Symbol</th><th>Price</th><th>% Change</th><th>Action</th></tr></thead>
                                        <tbody>
                                            {movers.gainers.map(m => (
                                                <tr key={m.symbol}>
                                                    <td className="fw-bold text-success cursor-pointer" onClick={() => viewDetails(m.symbol)}>{m.symbol}</td>
                                                    <td>₹{m.price.toLocaleString('en-IN')}</td>
                                                    <td className="text-up"><i className="bi bi-caret-up-fill me-1"></i>+{m.change_pct}%</td>
                                                    <td><button className="btn btn-outline-success btn-sm border-0 rounded-pill px-3" onClick={() => viewDetails(m.symbol)}>Trade</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="tab-pane fade" id="losers-tab">
                                <div className="table-responsive">
                                    <table className="table table-dark table-hover align-middle border-color-5">
                                        <thead><tr className="text-secondary small"><th>Symbol</th><th>Price</th><th>% Change</th><th>Action</th></tr></thead>
                                        <tbody>
                                            {movers.losers.map(m => (
                                                <tr key={m.symbol}>
                                                    <td className="fw-bold text-danger cursor-pointer" onClick={() => viewDetails(m.symbol)}>{m.symbol}</td>
                                                    <td>₹{m.price.toLocaleString('en-IN')}</td>
                                                    <td className="text-down"><i className="bi bi-caret-down-fill me-1"></i>{m.change_pct}%</td>
                                                    <td><button className="btn btn-outline-danger btn-sm border-0 rounded-pill px-3" onClick={() => viewDetails(m.symbol)}>Trade</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="tab-pane fade" id="active-tab">
                                <div className="table-responsive">
                                    <table className="table table-dark table-hover align-middle border-color-5">
                                        <thead><tr className="text-secondary small"><th>Symbol</th><th>Price</th><th>% Change</th><th>Action</th></tr></thead>
                                        <tbody>
                                            {movers.most_active.map(m => {
                                                const isUp = m.change_pct >= 0;
                                                return (
                                                    <tr key={m.symbol}>
                                                        <td className="fw-bold cursor-pointer" onClick={() => viewDetails(m.symbol)}>{m.symbol}</td>
                                                        <td>₹{m.price.toLocaleString('en-IN')}</td>
                                                        <td className={isUp ? 'text-up' : 'text-down'}><i className={`bi bi-caret-${isUp ? 'up' : 'down'}-fill me-1`}></i>{isUp ? '+' : ''}{m.change_pct}%</td>
                                                        <td><button className="btn btn-outline-secondary btn-sm border-0 rounded-pill px-3" onClick={() => viewDetails(m.symbol)}>Trade</button></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    {/* Recommendations / Ratings panel */}
                    <div className="glass-card p-4 h-100">
                        <h5 className="fw-bold mb-3"><i className="bi bi-award text-success"></i> Premium Recommendations</h5>
                        <div className="d-flex flex-column gap-3">
                            {recommendations.map(r => (
                                <div key={r.symbol} className="p-3 border border-color rounded-3 cursor-pointer glass-card-hover" onClick={() => viewDetails(r.symbol)}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <span className="fw-bold text-success">{r.symbol}</span>
                                            <span className="text-muted small ms-2">{r.rating}</span>
                                        </div>
                                        <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1">{r.score}</span>
                                    </div>
                                    <p className="small text-secondary mb-0">{r.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial News quick row */}
            <div className="glass-card p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0"><i className="bi bi-newspaper text-info"></i> Financial Broadcasts</h5>
                    <button className="btn btn-outline-secondary border-0 btn-sm rounded-pill" onClick={() => setPage('news')}>News Room</button>
                </div>
                <div className="row g-4">
                    {news.slice(0, 3).map(n => (
                        <div key={n.id} className="col-md-4">
                            <div className="card bg-transparent border-0 h-100">
                                <img src={n.image_url} className="card-img-top rounded-4 mb-3" style={{ height: '180px', objectFit: 'cover' }} alt={n.title} />
                                <div className="card-body p-0">
                                    <span className="badge bg-secondary mb-2">{n.category}</span>
                                    <h6 className="fw-bold card-title mb-2 text-white">{n.title}</h6>
                                    <p className="card-text text-secondary small">{n.summary.slice(0, 100)}...</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 2. Portfolio & Holdings View
function PortfolioView({ apiCall, token }) {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    
    // Chart References
    const allocationChartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    const loadPortfolio = React.useCallback(() => {
        apiCall('/trade/portfolio')
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(err => notify(err.message, 'danger'));
    }, [apiCall]);

    React.useEffect(() => {
        loadPortfolio();
        const interval = setInterval(loadPortfolio, 10000); // 10s updates
        return () => clearInterval(interval);
    }, [loadPortfolio]);

    // Render Asset Allocation Pie Chart
    React.useEffect(() => {
        if (!data || !data.allocations || !allocationChartRef.current) return;
        
        const labels = Object.keys(data.allocations.symbol);
        const values = Object.values(data.allocations.symbol);
        
        if (labels.length === 0) return;

        // Destroy previous chart instance if exists
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = allocationChartRef.current.getContext('2d');
        chartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#d63031', '#9b59b6', '#34495e'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Plus Jakarta Sans', size: 12 }
                        }
                    }
                },
                cutout: '65%'
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    const handleExport = (format) => {
        window.open(`${API_BASE_URL}/trade/export/${format}?token=${token}`);
    };

    if (loading) {
        return (
            <div className="container py-4">
                <div className="glass-card skeleton mb-4" style={{ height: '180px' }}></div>
                <div className="glass-card skeleton" style={{ height: '400px' }}></div>
            </div>
        );
    }

    const isUp = data.overall_pnl >= 0;

    return (
        <div className="container-fluid py-2">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold mb-0">Investment Portfolio</h4>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary border-color rounded-3 btn-sm px-3" onClick={() => handleExport('csv')}><i className="bi bi-filetype-csv me-1"></i> CSV Report</button>
                    <button className="btn btn-outline-secondary border-color rounded-3 btn-sm px-3" onClick={() => handleExport('pdf')}><i className="bi bi-file-earmark-pdf me-1"></i> Text Summary</button>
                </div>
            </div>

            {/* Performance Cards Grid */}
            <div className="row g-4 mb-4">
                <div className="col-md-3">
                    <div className="glass-card p-4">
                        <span className="text-secondary small fw-semibold">TOTAL INVESTMENT</span>
                        <h4 className="fw-bold mt-1">₹{data.total_investment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="glass-card p-4">
                        <span className="text-secondary small fw-semibold">CURRENT VALUE</span>
                        <h4 className="fw-bold mt-1">₹{data.current_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="glass-card p-4">
                        <span className="text-secondary small fw-semibold">OVERALL RETURN %</span>
                        <h4 className={`fw-bold mt-1 ${isUp ? 'text-up' : 'text-down'}`}>
                            {isUp ? '+' : ''}{data.overall_pnl_pct.toFixed(2)}%
                        </h4>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="glass-card p-4">
                        <span className="text-secondary small fw-semibold">NET VALUE + MARGIN</span>
                        <h4 className="fw-bold mt-1 text-info">₹{data.portfolio_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                    </div>
                </div>
            </div>

            {/* Allocation Chart + Summary layout */}
            <div className="row g-4 mb-4">
                <div className="col-lg-5 col-md-12">
                    <div className="glass-card p-4 h-100 d-flex flex-column align-items-center justify-content-center">
                        <h5 className="fw-bold mb-4 text-start w-100">Asset Allocation</h5>
                        {data.holdings.length === 0 ? (
                            <p className="text-muted small">No active holdings to chart.</p>
                        ) : (
                            <div style={{ width: '100%', maxWidth: '300px' }}>
                                <canvas ref={allocationChartRef}></canvas>
                            </div>
                        )}
                    </div>
                </div>
                <div className="col-lg-7 col-md-12">
                    {/* Holdings Table */}
                    <div className="glass-card p-4 h-100">
                        <h5 className="fw-bold mb-4">Active Stock Holdings</h5>
                        {data.holdings.length === 0 ? (
                            <p className="text-muted text-center py-5">You hold no stocks. Search tickers in the top bar to make trades.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-dark table-hover align-middle border-color-5">
                                    <thead>
                                        <tr className="text-secondary small">
                                            <th>Symbol</th>
                                            <th>Shares</th>
                                            <th>Avg Price</th>
                                            <th>Live Price</th>
                                            <th>Total Return</th>
                                            <th>Today's Gain</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.holdings.map(h => {
                                            const hUp = h.total_pnl >= 0;
                                            const tUp = h.today_pnl >= 0;
                                            return (
                                                <tr key={h.symbol}>
                                                    <td className="fw-bold text-white">{h.symbol}</td>
                                                    <td>{h.quantity}</td>
                                                    <td>₹{h.avg_buy_price.toLocaleString('en-IN')}</td>
                                                    <td>₹{h.current_price.toLocaleString('en-IN')}</td>
                                                    <td className={hUp ? 'text-up' : 'text-down'}>
                                                        {hUp ? '+' : ''}{h.total_pnl_pct.toFixed(2)}%
                                                    </td>
                                                    <td className={tUp ? 'text-up' : 'text-down'}>
                                                        {tUp ? '+' : ''}₹{h.today_pnl.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 3. Watchlists View
function WatchlistView({ setSelectedStock, setPage, apiCall }) {
    const [watchlists, setWatchlists] = React.useState([]);
    const [activeWlIndex, setActiveWlIndex] = React.useState(0);
    const [wlPrices, setWlPrices] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [newWlName, setNewWlName] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);

    const loadWatchlists = React.useCallback(() => {
        apiCall('/watchlists')
            .then(data => {
                setWatchlists(data);
                setLoading(false);
            })
            .catch(err => notify(err.message, 'danger'));
    }, [apiCall]);

    React.useEffect(() => {
        loadWatchlists();
    }, [loadWatchlists]);

    // Live update prices for active watchlist
    React.useEffect(() => {
        if (watchlists.length === 0 || !watchlists[activeWlIndex]) return;
        const items = watchlists[activeWlIndex].items;
        if (items.length === 0) return;

        const updatePrices = () => {
            Promise.all(
                items.map(sym => 
                    fetch(`${API_BASE_URL}/stocks/details/${sym}`)
                        .then(res => res.json())
                        .catch(() => null)
                )
            ).then(results => {
                const pricesMap = {};
                results.forEach(res => {
                    if (res) {
                        pricesMap[res.symbol] = {
                            price: res.price,
                            change_pct: res.change_pct
                        };
                    }
                });
                setWlPrices(pricesMap);
            });
        };

        updatePrices();
        const interval = setInterval(updatePrices, 5000); // live every 5s
        return () => clearInterval(interval);
    }, [watchlists, activeWlIndex]);

    const handleCreateWl = (e) => {
        e.preventDefault();
        if (!newWlName.trim()) return;
        apiCall('/watchlists', 'POST', { name: newWlName })
            .then(newWl => {
                setWatchlists(prev => [...prev, newWl]);
                setNewWlName('');
                setActiveWlIndex(watchlists.length);
                notify("Watchlist created!", "success");
            })
            .catch(err => notify(err.message, 'danger'));
    };

    const handleDeleteWl = (id) => {
        if (!confirm("Are you sure you want to delete this watchlist?")) return;
        apiCall(`/watchlists/${id}`, 'DELETE')
            .then(() => {
                notify("Watchlist deleted", "info");
                loadWatchlists();
                setActiveWlIndex(0);
            })
            .catch(err => notify(err.message, 'danger'));
    };

    // Watchlist Tickers Add search logic
    React.useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(() => {
            fetch(`${API_BASE_URL}/stocks/search?q=${searchQuery}`)
                .then(res => res.json())
                .then(data => setSearchResults(data))
                .catch(err => console.error(err));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const addStockToActiveWl = (symbol) => {
        const activeWl = watchlists[activeWlIndex];
        if (!activeWl) return;
        apiCall(`/watchlists/${activeWl.id}/items`, 'POST', { symbol })
            .then(() => {
                notify(`${symbol} added to watchlist!`, "success");
                loadWatchlists();
                setSearchQuery('');
            })
            .catch(err => notify(err.message, 'danger'));
    };

    const removeStockFromActiveWl = (symbol) => {
        const activeWl = watchlists[activeWlIndex];
        if (!activeWl) return;
        apiCall(`/watchlists/${activeWl.id}/items/${symbol}`, 'DELETE')
            .then(() => {
                notify(`${symbol} removed`, "info");
                loadWatchlists();
            })
            .catch(err => notify(err.message, 'danger'));
    };

    const viewDetails = (sym) => {
        setSelectedStock(sym);
        setPage('stock-details');
    };

    if (loading) {
        return <div className="container py-5 text-center"><div className="spinner-border text-success"></div></div>;
    }

    const currentWl = watchlists[activeWlIndex];

    return (
        <div className="container-fluid py-2">
            <h4 className="fw-bold mb-4">My Watchlists</h4>

            <div className="row g-4">
                {/* Left select panel */}
                <div className="col-lg-4">
                    <div className="glass-card p-4 mb-4">
                        <h6 className="fw-bold text-secondary mb-3 text-uppercase">Select Watchlist</h6>
                        <div className="d-flex flex-column gap-2 mb-4">
                            {watchlists.map((wl, idx) => (
                                <div 
                                    key={wl.id} 
                                    className={`wl-badge d-flex justify-content-between align-items-center ${idx === activeWlIndex ? 'active' : ''}`}
                                    onClick={() => setActiveWlIndex(idx)}
                                >
                                    <span className="fw-semibold text-white">{wl.name}</span>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="badge bg-secondary rounded-pill">{wl.items.length} stocks</span>
                                        {watchlists.length > 1 && (
                                            <button className="btn btn-outline-danger btn-sm border-0 p-1" onClick={(e) => { e.stopPropagation(); handleDeleteWl(wl.id); }}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Create Watchlist Form */}
                        <form onSubmit={handleCreateWl}>
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    required 
                                    className="form-control glass-input" 
                                    placeholder="Watchlist Name..." 
                                    value={newWlName}
                                    onChange={e=>setNewWlName(e.target.value)}
                                />
                                <button type="submit" className="btn btn-premium-primary"><i className="bi bi-plus-lg"></i></button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right listings details panel */}
                <div className="col-lg-8">
                    {currentWl && (
                        <div className="glass-card p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="fw-bold text-success mb-0">{currentWl.name}</h5>
                                
                                {/* Search overlay inside watchlist to add stocks */}
                                <div className="position-relative width-250">
                                    <input 
                                        type="text" 
                                        className="form-control form-control-sm glass-input" 
                                        placeholder="Add Ticker..." 
                                        value={searchQuery}
                                        onChange={e=>setSearchQuery(e.target.value)}
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="position-absolute w-100 glass-card mt-2 shadow-premium" style={{ zIndex: 1100 }}>
                                            <ul className="list-group list-group-flush bg-transparent">
                                                {searchResults.map(s => (
                                                    <li 
                                                        key={s.symbol} 
                                                        className="list-group-item bg-transparent text-white border-color list-group-item-action d-flex justify-content-between align-items-center p-2 cursor-pointer small"
                                                        onClick={() => addStockToActiveWl(s.symbol)}
                                                    >
                                                        <span>{s.symbol}</span>
                                                        <i className="bi bi-plus-circle-fill text-success"></i>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {currentWl.items.length === 0 ? (
                                <p className="text-muted text-center py-5">No stocks in this watchlist. Search above to add stocks.</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-dark table-hover align-middle border-color-5 mb-0">
                                        <thead>
                                            <tr className="text-secondary small">
                                                <th>Symbol</th>
                                                <th>Price</th>
                                                <th>Today's Change</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentWl.items.map(sym => {
                                                const live = wlPrices[sym];
                                                const isUp = live ? live.change_pct >= 0 : true;
                                                return (
                                                    <tr key={sym}>
                                                        <td className="fw-bold text-white cursor-pointer" onClick={() => viewDetails(sym)}>{sym}</td>
                                                        <td>{live ? `₹${live.price.toLocaleString('en-IN')}` : <span className="skeleton px-4 d-inline-block"></span>}</td>
                                                        <td className={isUp ? 'text-up' : 'text-down'}>
                                                            {live ? (
                                                                <>
                                                                    <i className={`bi bi-caret-${isUp ? 'up' : 'down'}-fill me-1`}></i>
                                                                    {isUp ? '+' : ''}{live.change_pct}%
                                                                </>
                                                            ) : (
                                                                <span className="skeleton px-3 d-inline-block"></span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="d-flex justify-content-end gap-2">
                                                                <button className="btn btn-outline-success btn-sm border-0 rounded-pill px-3" onClick={() => viewDetails(sym)}>Trade</button>
                                                                <button className="btn btn-outline-danger btn-sm border-0 p-1" onClick={() => removeStockFromActiveWl(sym)}>
                                                                    <i className="bi bi-x-lg"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 4. Market View
function MarketView({ setSelectedStock, setPage, apiCall, indices }) {
    const [movers, setMovers] = React.useState({ gainers: [], losers: [], most_active: [] });
    const [comparisonQuery, setComparisonQuery] = React.useState('');
    const [comparisonData, setComparisonData] = React.useState([]);

    React.useEffect(() => {
        apiCall('/stocks/market-movers')
            .then(data => setMovers(data))
            .catch(err => console.error(err));
    }, [apiCall]);

    const viewDetails = (sym) => {
        setSelectedStock(sym);
        setPage('stock-details');
    };

    const handleCompare = (e) => {
        e.preventDefault();
        if (!comparisonQuery) return;
        apiCall(`/stocks/comparison?symbols=${comparisonQuery}`)
            .then(data => setComparisonData(data))
            .catch(err => notify(err.message, 'danger'));
    };

    return (
        <div className="container-fluid py-2">
            <h4 className="fw-bold mb-4">Market Overview</h4>

            {/* Indices Row */}
            <div className="row g-4 mb-4">
                {Object.entries(indices).map(([key, idx]) => {
                    const isUp = idx.change_pct >= 0;
                    return (
                        <div key={key} className="col-md-4 col-lg-2.4">
                            <div className="glass-card p-3">
                                <span className="text-secondary small fw-bold">{key}</span>
                                <h4 className="fw-extrabold mt-1 mb-2">₹{Number(idx.value).toLocaleString('en-IN', { minimumFractionDigits: 1 })}</h4>
                                <span className={isUp ? 'price-badge-up' : 'price-badge-down'}>
                                    <i className={`bi bi-caret-${isUp ? 'up' : 'down'}-fill`}></i>
                                    {isUp ? '+' : ''}{idx.change_pct}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stock Comparison Tool */}
            <div className="glass-card p-4 mb-4">
                <h5 className="fw-bold mb-3"><i className="bi bi-sliders text-success"></i> Stock Comparison</h5>
                <form onSubmit={handleCompare} className="mb-4">
                    <div className="input-group">
                        <input 
                            type="text" 
                            className="form-control glass-input" 
                            placeholder="Enter symbols to compare (comma-separated, e.g. RELIANCE, TCS, AAPL)..."
                            value={comparisonQuery}
                            onChange={e=>setComparisonQuery(e.target.value)}
                        />
                        <button type="submit" className="btn btn-premium-primary px-4">Compare</button>
                    </div>
                </form>

                {comparisonData.length > 0 && (
                    <div className="table-responsive">
                        <table className="table table-dark table-hover align-middle border-color-5 text-center">
                            <thead>
                                <tr className="text-secondary small">
                                    <th>Attribute</th>
                                    {comparisonData.map(c => <th key={c.symbol}>{c.symbol}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="fw-bold text-start">Company Name</td>
                                    {comparisonData.map(c => <td key={c.symbol} className="text-muted">{c.name}</td>)}
                                </tr>
                                <tr>
                                    <td className="fw-bold text-start">Price (INR)</td>
                                    {comparisonData.map(c => <td key={c.symbol}>₹{c.price.toLocaleString('en-IN')}</td>)}
                                </tr>
                                <tr>
                                    <td className="fw-bold text-start">Daily Change</td>
                                    {comparisonData.map(c => {
                                        const up = c.change_pct >= 0;
                                        return <td key={c.symbol} className={up ? 'text-up' : 'text-down'}>{up ? '+' : ''}{c.change_pct}%</td>;
                                    })}
                                </tr>
                                <tr>
                                    <td className="fw-bold text-start">Market Cap</td>
                                    {comparisonData.map(c => <td key={c.symbol}>{c.market_cap}</td>)}
                                </tr>
                                <tr>
                                    <td className="fw-bold text-start">PE Ratio</td>
                                    {comparisonData.map(c => <td key={c.symbol}>{c.pe_ratio}</td>)}
                                </tr>
                                <tr>
                                    <td className="fw-bold text-start">Dividend Yield</td>
                                    {comparisonData.map(c => <td key={c.symbol}>{c.div_yield}%</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="row g-4 mb-4">
                <div className="col-md-6">
                    <div className="glass-card p-4 h-100">
                        <h5 className="fw-bold mb-3">Gainers vs Losers</h5>
                        <div className="row">
                            <div className="col-6 border-end border-color">
                                <h6 className="text-success small fw-bold text-uppercase mb-3">Top Gainers</h6>
                                {movers.gainers.slice(0, 3).map(m => (
                                    <div key={m.symbol} className="d-flex justify-content-between align-items-center mb-2 cursor-pointer" onClick={() => viewDetails(m.symbol)}>
                                        <span className="fw-bold text-white small">{m.symbol}</span>
                                        <span className="text-up font-monospace small">+{m.change_pct}%</span>
                                    </div>
                                ))}
                            </div>
                            <div className="col-6">
                                <h6 className="text-danger small fw-bold text-uppercase mb-3">Top Losers</h6>
                                {movers.losers.slice(0, 3).map(m => (
                                    <div key={m.symbol} className="d-flex justify-content-between align-items-center mb-2 cursor-pointer" onClick={() => viewDetails(m.symbol)}>
                                        <span className="fw-bold text-white small">{m.symbol}</span>
                                        <span className="text-down font-monospace small">{m.change_pct}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upcoming IPO listings */}
                <div className="col-md-6">
                    <div className="glass-card p-4 h-100">
                        <h5 className="fw-bold mb-3"><i className="bi bi-activity text-info"></i> Upcoming Initial Public Offerings (IPOs)</h5>
                        <div className="d-flex flex-column gap-3">
                            <div className="d-flex justify-content-between align-items-center border-bottom border-color pb-2">
                                <div>
                                    <span className="fw-bold text-white">AquaTech Systems Ltd</span>
                                    <div className="text-muted small">Target Lot Size: 45 shares | Min Bid: ₹14,500</div>
                                </div>
                                <span className="badge bg-success bg-opacity-25 text-success">Open 15 July</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="fw-bold text-white">Starlight Energy Solutions</span>
                                    <div className="text-muted small">Target Lot Size: 20 shares | Min Bid: ₹13,800</div>
                                </div>
                                <span className="badge bg-secondary bg-opacity-25 text-white">Open 28 July</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 5. News View
function NewsView({ apiCall, token }) {
    const [news, setNews] = React.useState([]);
    const [bookmarks, setBookmarks] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('all'); // 'all' or 'bookmarked'

    const loadNews = React.useCallback(() => {
        const queryStr = searchQuery ? `?q=${searchQuery}` : '';
        Promise.all([
            apiCall(`/news${queryStr}`).catch(() => []),
            apiCall('/news/bookmarks').catch(() => [])
        ]).then(([newsData, bookmarkedData]) => {
            setNews(newsData);
            setBookmarks(bookmarkedData);
            setLoading(false);
        });
    }, [apiCall, searchQuery]);

    React.useEffect(() => {
        loadNews();
    }, [loadNews]);

    const handleSearch = (e) => {
        e.preventDefault();
        loadNews();
    };

    const toggleBookmark = (item) => {
        apiCall('/news/bookmark', 'POST', item)
            .then(res => {
                notify(res.message, 'success');
                loadNews();
            })
            .catch(err => notify(err.message, 'danger'));
    };

    const isBookmarked = (url) => {
        return bookmarks.some(b => b.url === url);
    };

    return (
        <div className="container-fluid py-2">
            <h4 className="fw-bold mb-4">News Room</h4>

            {/* Tabs for filtered views */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <ul className="nav nav-pills gap-2" role="tablist">
                    <li className="nav-item">
                        <button className={`nav-link rounded-pill px-4 ${activeTab === 'all' ? 'active bg-success' : 'text-white border border-color'}`} onClick={() => setActiveTab('all')}>Latest News</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link rounded-pill px-4 ${activeTab === 'bookmarked' ? 'active bg-success' : 'text-white border border-color'}`} onClick={() => setActiveTab('bookmarked')}>Bookmarked</button>
                    </li>
                </ul>

                <form onSubmit={handleSearch} className="d-flex gap-2 width-280">
                    <input 
                        type="text" 
                        className="form-control glass-input form-control-sm" 
                        placeholder="Search articles..." 
                        value={searchQuery}
                        onChange={e=>setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-premium-primary btn-sm"><i className="bi bi-search"></i></button>
                </form>
            </div>

            {loading ? (
                <div className="row g-4">
                    <div className="col-md-4"><div className="glass-card skeleton p-5 mb-4" style={{ height: '280px' }}></div></div>
                    <div className="col-md-4"><div className="glass-card skeleton p-5 mb-4" style={{ height: '280px' }}></div></div>
                </div>
            ) : (
                <div className="row g-4">
                    {/* Render according to active selection */}
                    {(activeTab === 'all' ? news : bookmarks).length === 0 ? (
                        <div className="col-12 py-5 text-center text-muted">No news stories found. Try a different query.</div>
                    ) : (
                        (activeTab === 'all' ? news : bookmarks).map((n, idx) => (
                            <div key={idx} className="col-md-6 col-lg-4">
                                <div className="glass-card p-3 h-100 d-flex flex-column justify-content-between glass-card-hover">
                                    <div>
                                        <img src={n.image_url || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40'} className="rounded-4 mb-3 w-100" style={{ height: '180px', objectFit: 'cover' }} alt="" />
                                        <span className="badge bg-success bg-opacity-20 text-success mb-2 px-3 py-1 rounded-pill">{n.category || 'Financials'}</span>
                                        <h6 className="fw-bold mb-2 text-white">{n.title}</h6>
                                        <p className="small text-secondary mb-3">{n.summary}</p>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center border-top border-color pt-3">
                                        <div className="small text-muted">{n.source} • {n.published_at}</div>
                                        <div className="d-flex gap-2">
                                            <button className="btn btn-outline-secondary border-0 btn-sm rounded-circle p-1" onClick={() => toggleBookmark(n)}>
                                                <i className={`bi bi-bookmark${isBookmarked(n.url) ? '-fill text-success' : ''}`}></i>
                                            </button>
                                            <a href={n.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary border-0 btn-sm rounded-circle p-1">
                                                <i className="bi bi-box-arrow-up-right"></i>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// 6. Calculators View
function CalculatorsView({ apiCall }) {
    const [activeCalc, setActiveCalc] = React.useState('sip');
    
    // SIP Inputs/Outputs
    const [sipInputs, setSipInputs] = React.useState({ monthly_investment: 5000, annual_rate: 12, years: 10 });
    const [sipResult, setSipResult] = React.useState(null);
    
    // Brokerage Inputs/Outputs
    const [brokerageInputs, setBrokerageInputs] = React.useState({ buy_price: 1500, sell_price: 1550, quantity: 100, type: 'delivery' });
    const [brokerageResult, setBrokerageResult] = React.useState(null);

    // Goal Tracker state
    const [goals, setGoals] = React.useState([]);
    const [newGoal, setNewGoal] = React.useState({ name: '', target_amount: '', current_investment: '', target_date: '' });

    const handleSipCalc = (e) => {
        if(e) e.preventDefault();
        apiCall('/calculators/sip', 'POST', sipInputs)
            .then(res => setSipResult(res))
            .catch(err => notify(err.message, 'danger'));
    };

    const handleBrokerageCalc = (e) => {
        if(e) e.preventDefault();
        apiCall('/calculators/brokerage', 'POST', brokerageInputs)
            .then(res => setBrokerageResult(res))
            .catch(err => notify(err.message, 'danger'));
    };

    // Goals CRUD Logic
    const loadGoals = React.useCallback(() => {
        apiCall('/calculators/goals')
            .then(data => setGoals(data))
            .catch(err => console.error(err));
    }, [apiCall]);

    React.useEffect(() => {
        loadGoals();
    }, [loadGoals]);

    const handleCreateGoal = (e) => {
        e.preventDefault();
        apiCall('/calculators/goals', 'POST', newGoal)
            .then(() => {
                notify("Goal added successfully!", "success");
                loadGoals();
                setNewGoal({ name: '', target_amount: '', current_investment: '', target_date: '' });
            })
            .catch(err => notify(err.message, 'danger'));
    };

    const handleDeleteGoal = (id) => {
        if (!confirm("Remove goal target?")) return;
        apiCall(`/calculators/goals/${id}`, 'DELETE')
            .then(() => {
                notify("Goal removed", "info");
                loadGoals();
            })
            .catch(err => notify(err.message, 'danger'));
    };

    return (
        <div className="container-fluid py-2">
            <h4 className="fw-bold mb-4">Financial Calculators</h4>

            <div className="row g-4">
                {/* Side switcher */}
                <div className="col-md-3">
                    <div className="glass-card p-4">
                        <ul className="nav nav-pills flex-column gap-2">
                            <li className="nav-item">
                                <button className={`nav-link text-start w-100 rounded-3 ${activeCalc === 'sip' ? 'active bg-success' : 'text-white'}`} onClick={() => setActiveCalc('sip')}>
                                    <i className="bi bi-graph-up me-2"></i> SIP Wealth Estimator
                                </button>
                            </li>
                            <li className="nav-item">
                                <button className={`nav-link text-start w-100 rounded-3 ${activeCalc === 'brokerage' ? 'active bg-success' : 'text-white'}`} onClick={() => setActiveCalc('brokerage')}>
                                    <i className="bi bi-tag me-2"></i> Brokerage & Tax Fee
                                </button>
                            </li>
                            <li className="nav-item">
                                <button className={`nav-link text-start w-100 rounded-3 ${activeCalc === 'goals' ? 'active bg-success' : 'text-white'}`} onClick={() => setActiveCalc('goals')}>
                                    <i className="bi bi-bullseye me-2"></i> Goal Progress Tracker
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Main panel displays */}
                <div className="col-md-9">
                    {activeCalc === 'sip' && (
                        <div className="glass-card p-4">
                            <h5 className="fw-bold mb-4">Systematic Investment Plan (SIP) Calculator</h5>
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <form onSubmit={handleSipCalc}>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small">Monthly Investment Amount (₹)</label>
                                            <input type="number" className="form-control glass-input" value={sipInputs.monthly_investment} onChange={e=>setSipInputs(prev=>({...prev, monthly_investment: Number(e.target.value)}))} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small">Expected Annual Returns Rate (%)</label>
                                            <input type="number" className="form-control glass-input" value={sipInputs.annual_rate} onChange={e=>setSipInputs(prev=>({...prev, annual_rate: Number(e.target.value)}))} />
                                        </div>
                                        <div className="mb-4">
                                            <label className="form-label text-secondary small">Duration Period (Years)</label>
                                            <input type="number" className="form-control glass-input" value={sipInputs.years} onChange={e=>setSipInputs(prev=>({...prev, years: Number(e.target.value)}))} />
                                        </div>
                                        <button type="submit" className="btn btn-premium-primary w-100">Calculate SIP</button>
                                    </form>
                                </div>
                                <div className="col-md-6 d-flex align-items-center justify-content-center">
                                    {sipResult ? (
                                        <div className="p-4 border border-color rounded-4 w-100 text-center">
                                            <span className="text-secondary small">ESTIMATED WEALTH ACCUMULATED</span>
                                            <h2 className="fw-bold text-success my-3">₹{sipResult.future_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h2>
                                            <div className="d-flex justify-content-between border-top border-color pt-3 small">
                                                <div>
                                                    <span className="text-muted">Total Invested</span>
                                                    <div className="fw-bold text-white mt-1">₹{sipResult.total_invested.toLocaleString('en-IN')}</div>
                                                </div>
                                                <div>
                                                    <span className="text-muted">Wealth Gain</span>
                                                    <div className="fw-bold text-success mt-1">₹{sipResult.wealth_gain.toLocaleString('en-IN')}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-muted small">Input parameters and click calculate to estimate wealth returns.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeCalc === 'brokerage' && (
                        <div className="glass-card p-4">
                            <h5 className="fw-bold mb-4">Brokerage, Taxes & STT Calculator</h5>
                            <div className="row g-4">
                                <div className="col-md-5">
                                    <form onSubmit={handleBrokerageCalc}>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small">Buy Price (₹)</label>
                                            <input type="number" className="form-control glass-input" value={brokerageInputs.buy_price} onChange={e=>setBrokerageInputs(prev=>({...prev, buy_price: Number(e.target.value)}))} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small">Sell Price (₹)</label>
                                            <input type="number" className="form-control glass-input" value={brokerageInputs.sell_price} onChange={e=>setBrokerageInputs(prev=>({...prev, sell_price: Number(e.target.value)}))} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small">Quantity</label>
                                            <input type="number" className="form-control glass-input" value={brokerageInputs.quantity} onChange={e=>setBrokerageInputs(prev=>({...prev, quantity: Number(e.target.value)}))} />
                                        </div>
                                        <div className="mb-4">
                                            <label className="form-label text-secondary small">Transaction Type</label>
                                            <select className="form-select glass-input text-white" value={brokerageInputs.type} onChange={e=>setBrokerageInputs(prev=>({...prev, type: e.target.value}))}>
                                                <option value="delivery" className="bg-dark text-white">Equity Delivery (Long Term)</option>
                                                <option value="intraday" className="bg-dark text-white">Equity Intraday (Same Day)</option>
                                            </select>
                                        </div>
                                        <button type="submit" className="btn btn-premium-primary w-100">Calculate Charges</button>
                                    </form>
                                </div>
                                <div className="col-md-7">
                                    {brokerageResult ? (
                                        <div className="p-3 border border-color rounded-4">
                                            <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">Turnover Value</span><span className="text-white">₹{brokerageResult.turnover.toLocaleString('en-IN')}</span></div>
                                            <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">Brokerage Fees</span><span className="text-white">₹{brokerageResult.brokerage.toFixed(2)}</span></div>
                                            <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">STT Tax</span><span className="text-white">₹{brokerageResult.stt.toFixed(2)}</span></div>
                                            <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">Stamp Duty Charges</span><span className="text-white">₹{brokerageResult.stamp_duty.toFixed(2)}</span></div>
                                            <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">GST Tax (18% of broker/txn)</span><span className="text-white">₹{brokerageResult.gst.toFixed(2)}</span></div>
                                            <div className="d-flex justify-content-between mb-3 border-bottom border-color pb-2 small"><span className="text-muted">Exchange Transactions</span><span className="text-white">₹{brokerageResult.exchange_txn.toFixed(2)}</span></div>
                                            
                                            <div className="d-flex justify-content-between mb-2"><span className="fw-semibold">Total Tax & Charges</span><span className="fw-bold text-danger">₹{brokerageResult.total_charges.toFixed(2)}</span></div>
                                            <div className="d-flex justify-content-between mb-2"><span className="fw-semibold">Break-Even Sale Price</span><span className="fw-bold text-info">₹{brokerageResult.breakeven_price.toFixed(2)}</span></div>
                                            
                                            <div className="d-flex justify-content-between border-top border-color pt-3 mt-2">
                                                <span className="fw-bold">Net P&L Return</span>
                                                <span className={`fw-extrabold ${brokerageResult.net_pnl >= 0 ? 'text-up' : 'text-down'}`}>
                                                    ₹{brokerageResult.net_pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-100 d-flex align-items-center justify-content-center text-muted small">Provide details to preview tax structures.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeCalc === 'goals' && (
                        <div className="glass-card p-4">
                            <h5 className="fw-bold mb-4">Investment Goal Progress</h5>
                            <div className="row g-4">
                                <div className="col-md-5">
                                    <form onSubmit={handleCreateGoal} className="p-3 border border-color rounded-4">
                                        <h6 className="fw-bold text-success mb-3">Add New Goal</h6>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small">Goal Name (e.g. Retirement, Car)</label>
                                            <input type="text" required className="form-control glass-input" value={newGoal.name} onChange={e=>setNewGoal(prev=>({...prev, name: e.target.value}))} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small">Target Amount (₹)</label>
                                            <input type="number" required className="form-control glass-input" value={newGoal.target_amount} onChange={e=>setNewGoal(prev=>({...prev, target_amount: e.target.value}))} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small">Initial Fund Saved (₹)</label>
                                            <input type="number" required className="form-control glass-input" value={newGoal.current_investment} onChange={e=>setNewGoal(prev=>({...prev, current_investment: e.target.value}))} />
                                        </div>
                                        <div className="mb-4">
                                            <label className="form-label text-secondary small">Target Achieved Date</label>
                                            <input type="date" required className="form-control glass-input text-white" value={newGoal.target_date} onChange={e=>setNewGoal(prev=>({...prev, target_date: e.target.value}))} />
                                        </div>
                                        <button type="submit" className="btn btn-premium-primary w-100">Add Goal</button>
                                    </form>
                                </div>
                                <div className="col-md-7">
                                    {goals.length === 0 ? (
                                        <p className="text-muted text-center py-5">No goals created yet. Use the side panel to add goals.</p>
                                    ) : (
                                        <div className="d-flex flex-column gap-3">
                                            {goals.map(g => {
                                                const progress = Math.min(100, (g.current_investment / g.target_amount) * 100);
                                                return (
                                                    <div key={g.id} className="p-3 border border-color rounded-4">
                                                        <div className="d-flex justify-content-between mb-2">
                                                            <span className="fw-bold text-white">{g.name}</span>
                                                            <button className="btn btn-outline-danger btn-sm border-0 p-0" onClick={() => handleDeleteGoal(g.id)}><i className="bi bi-trash"></i></button>
                                                        </div>
                                                        <div className="d-flex justify-content-between small text-muted mb-2">
                                                            <span>Target: ₹{g.target_amount.toLocaleString('en-IN')}</span>
                                                            <span>Saved: ₹{g.current_investment.toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="progress glass-input p-0 bg-secondary bg-opacity-25" style={{ height: '8px' }}>
                                                            <div className="progress-bar bg-success rounded-pill" role="progressbar" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                        <div className="text-end small text-secondary mt-2">Target Date: {g.target_date} ({progress.toFixed(0)}%)</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 7. Profile View
function ProfileView({ apiCall, user, setUser }) {
    const [username, setUsername] = React.useState(user ? user.username : '');
    const [email, setEmail] = React.useState(user ? user.email : '');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleUpdate = (e) => {
        e.preventDefault();
        setLoading(true);
        apiCall('/auth/profile', 'PUT', { username, email, password })
            .then(res => {
                setUser(res.user);
                setPassword('');
                notify("Profile updated successfully!", "success");
            })
            .catch(err => notify(err.message, 'danger'))
            .finally(() => setLoading(false));
    };

    const handleResetBalance = () => {
        if (!confirm("Are you sure you want to reset your virtual balance to ₹10,00,000? All active holdings will remain, but cash balance will be updated.")) return;
        apiCall('/auth/profile', 'PUT', { balance: 1000000.0 })
            .then(res => {
                setUser(res.user);
                notify("Balance reset to ₹10,00,000!", "success");
            })
            .catch(err => notify(err.message, 'danger'));
    };

    return (
        <div className="container py-2 max-w-600 mx-auto">
            <div className="glass-card p-5">
                <h4 className="fw-bold mb-1">User Settings</h4>
                <p className="text-muted small mb-4">Edit profile parameters and reset account margins</p>

                <form onSubmit={handleUpdate} className="mb-4">
                    <div className="mb-3">
                        <label className="form-label text-secondary small">Username</label>
                        <input type="text" required className="form-control glass-input" value={username} onChange={e=>setUsername(e.target.value)} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label text-secondary small">Email Address</label>
                        <input type="email" required className="form-control glass-input" value={email} onChange={e=>setEmail(e.target.value)} />
                    </div>
                    <div className="mb-4">
                        <label className="form-label text-secondary small">New Password (Leave blank to keep current)</label>
                        <input type="password" className="form-control glass-input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <button type="submit" className="btn btn-premium-primary w-100 py-3 d-flex justify-content-center align-items-center" disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null} Update Credentials
                    </button>
                </form>

                <div className="border-top border-color pt-4 text-center">
                    <h6 className="fw-bold text-white mb-3">Margins Reset Control</h6>
                    <button className="btn btn-premium-danger px-4" onClick={handleResetBalance}>
                        <i className="bi bi-arrow-counterclockwise me-1"></i> Reset Balance to ₹10,00,000
                    </button>
                </div>
            </div>
        </div>
    );
}

// 8. Admin View
function AdminView({ apiCall }) {
    const [stats, setStats] = React.useState(null);
    const [users, setUsers] = React.useState([]);
    const [transactions, setTransactions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        Promise.all([
            apiCall('/admin/stats').catch(() => null),
            apiCall('/admin/users').catch(() => []),
            apiCall('/admin/transactions').catch(() => [])
        ]).then(([statsData, usersData, txsData]) => {
            setStats(statsData);
            setUsers(usersData);
            setTransactions(txsData);
            setLoading(false);
        });
    }, [apiCall]);

    const handleRoleToggle = (userId, currentRole) => {
        const nextRole = currentRole === 'admin' ? 'user' : 'admin';
        if (!confirm(`Change user privileges to ${nextRole.toUpperCase()}?`)) return;
        apiCall(`/admin/users/${userId}/role`, 'PUT', { role: nextRole })
            .then(res => {
                notify(res.message, 'success');
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole } : u));
            })
            .catch(err => notify(err.message, 'danger'));
    };

    if (loading) return <div className="container py-5 text-center"><div className="spinner-border text-success"></div></div>;

    return (
        <div className="container-fluid py-2">
            <h4 className="fw-bold mb-4">Admin Control Center</h4>

            {/* Stats board */}
            {stats && (
                <div className="row g-4 mb-4">
                    <div className="col-md-3">
                        <div className="glass-card p-4">
                            <span className="text-secondary small fw-semibold">TOTAL REGISTRATIONS</span>
                            <h4 className="fw-bold mt-1 text-success">{stats.total_users} Users</h4>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="glass-card p-4">
                            <span className="text-secondary small fw-semibold">SYSTEM TRANSATIONS</span>
                            <h4 className="fw-bold mt-1 text-info">{stats.total_transactions} Logs</h4>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="glass-card p-4">
                            <span className="text-secondary small fw-semibold">TRADING VOLUME (INR)</span>
                            <h4 className="fw-bold mt-1">₹{stats.transaction_volume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="glass-card p-4">
                            <span className="text-secondary small fw-semibold">BUY/SELL SPLITS</span>
                            <h4 className="fw-bold mt-1 text-warning">{stats.buy_orders}B / {stats.sell_orders}S</h4>
                        </div>
                    </div>
                </div>
            )}

            {/* Users list audit table */}
            <div className="glass-card p-4 mb-4">
                <h5 className="fw-bold mb-3">User Registrations Database</h5>
                <div className="table-responsive">
                    <table className="table table-dark table-hover align-middle border-color-5">
                        <thead>
                            <tr className="text-secondary small">
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Margin Cash</th>
                                <th>Holdings Count</th>
                                <th>System Privilege</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>#{u.id}</td>
                                    <td className="fw-bold text-white">{u.username}</td>
                                    <td>{u.email}</td>
                                    <td>₹{u.balance.toLocaleString('en-IN')}</td>
                                    <td>{u.holdings_count} assets</td>
                                    <td><span className={`badge ${u.role === 'admin' ? 'bg-danger bg-opacity-20 text-danger' : 'bg-secondary bg-opacity-20 text-white'}`}>{u.role.toUpperCase()}</span></td>
                                    <td>
                                        <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => handleRoleToggle(u.id, u.role)}>
                                            Toggle Privilege
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transactions audit logs */}
            <div className="glass-card p-4">
                <h5 className="fw-bold mb-3">System-wide Transaction Logs</h5>
                <div className="table-responsive">
                    <table className="table table-dark table-hover align-middle border-color-5">
                        <thead>
                            <tr className="text-secondary small">
                                <th>ID</th>
                                <th>User</th>
                                <th>Symbol</th>
                                <th>Type</th>
                                <th>Shares</th>
                                <th>Price</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.id}>
                                    <td>#{t.id}</td>
                                    <td className="fw-bold text-white">{t.username}</td>
                                    <td className="text-success">{t.symbol}</td>
                                    <td><span className={`badge ${t.type === 'BUY' ? 'bg-success' : 'bg-danger'}`}>{t.type}</span></td>
                                    <td>{t.quantity}</td>
                                    <td>₹{t.price.toLocaleString('en-IN')}</td>
                                    <td className="small text-muted">{new Date(t.timestamp).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// 9. Stock Details View (with dynamic Chart.js details and orders form)
function StockDetailsView({ symbol, apiCall, user, setUser, setPage }) {
    const [details, setDetails] = React.useState(null);
    const [range, setRange] = React.useState('5D');
    const [loading, setLoading] = React.useState(true);
    
    // Trading forms state
    const [quantity, setQuantity] = React.useState(1);
    const [tradeType, setTradeType] = React.useState('BUY');
    const [tradingLoading, setTradingLoading] = React.useState(false);

    // Alert setting inputs
    const [alertPrice, setAlertPrice] = React.useState('');
    const [alertCondition, setAlertCondition] = React.useState('ABOVE');

    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    const loadStockDetails = React.useCallback(() => {
        Promise.all([
            apiCall(`/stocks/details/${symbol}`),
            apiCall(`/stocks/history/${symbol}?range=${range}`)
        ]).then(([det, hist]) => {
            setDetails(det);
            setLoading(false);
            
            // Draw Chart.js Line/Candlestick chart
            if (chartRef.current && hist.length > 0) {
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }
                const ctx = chartRef.current.getContext('2d');
                chartInstance.current = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: hist.map(h => h.time),
                        datasets: [{
                            label: `${symbol} Valuation`,
                            data: hist.map(h => h.close),
                            borderColor: '#00b894',
                            borderWidth: 2,
                            backgroundColor: 'rgba(0, 184, 148, 0.1)',
                            fill: true,
                            tension: 0.1,
                            pointRadius: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: '#64748b' } },
                            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }
                        }
                    }
                });
            }
        }).catch(err => notify(err.message, 'danger'));
    }, [symbol, range, apiCall]);

    React.useEffect(() => {
        loadStockDetails();
    }, [loadStockDetails]);

    const handleTradeSubmit = (e) => {
        e.preventDefault();
        if (quantity <= 0) return;
        setTradingLoading(true);
        
        const endpoint = tradeType === 'BUY' ? '/trade/buy' : '/trade/sell';
        apiCall(endpoint, 'POST', { symbol, quantity })
            .then(res => {
                notify(res.message, 'success');
                // Refresh profile / balance
                apiCall('/auth/profile').then(profile => setUser(profile));
                setPage('portfolio');
            })
            .catch(err => notify(err.message, 'danger'))
            .finally(() => setTradingLoading(false));
    };

    const handleCreateAlert = (e) => {
        e.preventDefault();
        if (!alertPrice) return;
        apiCall('/alerts', 'POST', { symbol, target_price: alertPrice, condition: alertCondition })
            .then(() => {
                notify(`Alert set for ${symbol} when ${alertCondition.toLowerCase()} ₹${alertPrice}!`, 'success');
                setAlertPrice('');
            })
            .catch(err => notify(err.message, 'danger'));
    };

    if (loading || !details) return <div className="container py-5 text-center"><div className="spinner-border text-success"></div></div>;

    const isUp = details.change_pct >= 0;
    const currentPrice = details.price;
    const totalOrderCost = currentPrice * quantity;

    return (
        <div className="container-fluid py-2">
            {/* Header info */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h2 className="fw-extrabold mb-1 text-white">{details.symbol}</h2>
                    <h5 className="text-secondary mb-0">{details.name} • {details.sector}</h5>
                </div>
                <div className="text-end">
                    <h2 className="fw-extrabold mb-1">₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                    <span className={isUp ? 'price-badge-up' : 'price-badge-down'}>
                        <i className={`bi bi-caret-${isUp ? 'up' : 'down'}-fill me-1`}></i>
                        {isUp ? '+' : ''}{details.change_pct}% Today
                    </span>
                </div>
            </div>

            <div className="row g-4">
                {/* Left chart section */}
                <div className="col-lg-8">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold mb-0">Market Charts</h5>
                            <div className="btn-group gap-1">
                                {['1D', '5D', '1M', '1Y'].map(r => (
                                    <button key={r} className={`btn btn-sm rounded-pill px-3 ${range === r ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setRange(r)}>{r}</button>
                                ))}
                            </div>
                        </div>

                        {/* Chart area */}
                        <div style={{ height: '350px' }}>
                            <canvas ref={chartRef}></canvas>
                        </div>
                    </div>

                    {/* Analyst ratings + details */}
                    <div className="row g-4 mb-4">
                        <div className="col-md-6">
                            <div className="glass-card p-4 h-100">
                                <h5 className="fw-bold mb-4">Analyst Consensus</h5>
                                <div className="d-flex align-items-center gap-4">
                                    <div className="text-center">
                                        <h1 className="fw-extrabold text-success mb-0">{details.buy_rating}%</h1>
                                        <span className="text-muted small">BUY Rating</span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between mb-1 small"><span>Buy</span><span>{details.buy_rating}%</span></div>
                                        <div className="progress mb-2" style={{ height: '6px' }}><div className="progress-bar bg-success" style={{ width: `${details.buy_rating}%` }}></div></div>
                                        <div className="d-flex justify-content-between mb-1 small"><span>Hold</span><span>{details.hold_rating}%</span></div>
                                        <div className="progress mb-2" style={{ height: '6px' }}><div className="progress-bar bg-warning" style={{ width: `${details.hold_rating}%` }}></div></div>
                                        <div className="d-flex justify-content-between mb-1 small"><span>Sell</span><span>{details.sell_rating}%</span></div>
                                        <div className="progress" style={{ height: '6px' }}><div className="progress-bar bg-danger" style={{ width: `${details.sell_rating}%` }}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="glass-card p-4 h-100">
                                <h5 className="fw-bold mb-4">Company Overview</h5>
                                <p className="small text-secondary mb-0 line-height-1.6">{details.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stock Key statistics details */}
                    <div className="glass-card p-4">
                        <h5 className="fw-bold mb-4">Key Financial Statistics</h5>
                        <div className="row g-3">
                            <div className="col-6 col-md-3 border-end border-color pb-2"><div className="text-muted small">Open Price</div><div className="fw-bold mt-1 text-white">₹{details.open.toLocaleString('en-IN')}</div></div>
                            <div className="col-6 col-md-3 border-end border-color pb-2"><div className="text-muted small">High</div><div className="fw-bold mt-1 text-white">₹{details.high.toLocaleString('en-IN')}</div></div>
                            <div className="col-6 col-md-3 border-end border-color pb-2"><div className="text-muted small">Low</div><div className="fw-bold mt-1 text-white">₹{details.low.toLocaleString('en-IN')}</div></div>
                            <div className="col-6 col-md-3 pb-2"><div className="text-muted small">Volume</div><div className="fw-bold mt-1 text-white">{details.volume.toLocaleString()}</div></div>
                            
                            <div className="col-6 col-md-3 border-end border-color pt-2"><div className="text-muted small">Market Cap</div><div className="fw-bold mt-1 text-white">₹{details.market_cap}</div></div>
                            <div className="col-6 col-md-3 border-end border-color pt-2"><div className="text-muted small">P/E Ratio</div><div className="fw-bold mt-1 text-white">{details.pe_ratio}</div></div>
                            <div className="col-6 col-md-3 border-end border-color pt-2"><div className="text-muted small">52 Week High</div><div className="fw-bold mt-1 text-white">₹{details.high_52w.toLocaleString('en-IN')}</div></div>
                            <div className="col-6 col-md-3 pt-2"><div className="text-muted small">52 Week Low</div><div className="fw-bold mt-1 text-white">₹{details.low_52w.toLocaleString('en-IN')}</div></div>
                        </div>
                    </div>
                </div>

                {/* Right trading order entry pane */}
                <div className="col-lg-4">
                    {/* Trade Panel */}
                    <div className="glass-card p-4 mb-4">
                        <h5 className="fw-bold mb-4">Place Virtual Order</h5>
                        <ul className="nav nav-pills border-color gap-1 mb-4" role="tablist">
                            <li className="nav-item flex-fill">
                                <button className={`nav-link w-100 rounded-3 ${tradeType === 'BUY' ? 'active bg-success text-white' : 'text-white'}`} onClick={() => setTradeType('BUY')}>BUY Side</button>
                            </li>
                            <li className="nav-item flex-fill">
                                <button className={`nav-link w-100 rounded-3 ${tradeType === 'SELL' ? 'active bg-danger text-white' : 'text-white'}`} onClick={() => setTradeType('SELL')}>SELL Side</button>
                            </li>
                        </ul>

                        <form onSubmit={handleTradeSubmit}>
                            <div className="mb-3">
                                <label className="form-label text-secondary small">Order Price Type</label>
                                <input type="text" readOnly className="form-control glass-input text-muted" value="Market Order" />
                            </div>
                            <div className="mb-3">
                                <label className="form-label text-secondary small">Shares Quantity</label>
                                <input type="number" required min="1" className="form-control glass-input" value={quantity} onChange={e=>setQuantity(Math.max(1, Number(e.target.value)))} />
                            </div>
                            
                            <div className="p-3 border border-color rounded-4 mb-4">
                                <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">Virtual Margin Account Cash</span><span className="text-white">₹{user ? user.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</span></div>
                                <div className="d-flex justify-content-between border-top border-color pt-2"><span className="fw-bold">Total Estimated Cost</span><span className="fw-extrabold text-success">₹{totalOrderCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            </div>

                            <button type="submit" className={`btn w-100 py-3 ${tradeType === 'BUY' ? 'btn-premium-primary' : 'btn-premium-danger'} d-flex justify-content-center align-items-center`} disabled={tradingLoading}>
                                {tradingLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : null} Confirm {tradeType}
                            </button>
                        </form>
                    </div>

                    {/* Price alert setup panel */}
                    <div className="glass-card p-4">
                        <h5 className="fw-bold mb-4">Set Price Alerts</h5>
                        <form onSubmit={handleCreateAlert}>
                            <div className="mb-3">
                                <label className="form-label text-secondary small">Trigger Price Alert (₹)</label>
                                <input type="number" required className="form-control glass-input" value={alertPrice} onChange={e=>setAlertPrice(e.target.value)} placeholder="Price target..." />
                            </div>
                            <div className="mb-4">
                                <label className="form-label text-secondary small">Trigger Condition</label>
                                <select className="form-select glass-input text-white" value={alertCondition} onChange={e=>setAlertCondition(e.target.value)}>
                                    <option value="ABOVE" className="bg-dark text-white">Goes ABOVE Target</option>
                                    <option value="BELOW" className="bg-dark text-white">Goes BELOW Target</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-outline-success border-color rounded-3 w-100">Establish Price Alert</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Render React App
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
