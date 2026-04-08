// ── Purge stale festival caches (removes old Holi/Eid data from v3 and prior) ──
(function purgeStaleCache() {
    localStorage.removeItem('offline_dashboard_v3');
    localStorage.removeItem('offline_dashboard_v2');
    localStorage.removeItem('offline_dashboard_v1');
    localStorage.removeItem('offline_dashboard');
})();

// Apply saved theme on startup (before anything renders)
(function applyTheme() {
    const theme = localStorage.getItem('app_theme') || 'dark';
    const root = document.documentElement;
    if (theme === 'light') {
        root.style.setProperty('--bg-color', '#f0f2f7');
        root.style.setProperty('--surface-color', '#ffffff');
        root.style.setProperty('--card-bg', '#ffffff');
        root.style.setProperty('--text-primary', '#0f172a');
        root.style.setProperty('--text-secondary', '#64748b');
        root.style.setProperty('--border-color', 'rgba(0,0,0,0.08)');
        root.style.setProperty('--glass-bg', 'hsla(0, 0%, 100%, 0.85)');
        root.style.setProperty('--glass-border', 'hsla(0, 0%, 100%, 0.6)');
        document.body.style.background = '#f0f2f7';
    } else {
        // Dark mode (default)
        root.style.setProperty('--bg-color', 'hsl(222, 47%, 7%)');
        root.style.setProperty('--surface-color', 'hsl(222, 47%, 12%)');
        root.style.setProperty('--text-primary', 'hsl(210, 40%, 98%)');
        root.style.setProperty('--text-secondary', 'hsl(215, 20%, 65%)');
        root.style.setProperty('--border-color', 'hsl(222, 35%, 18%)');
        root.style.setProperty('--glass-bg', 'hsla(222, 47%, 12%, 0.82)');
        root.style.setProperty('--glass-border', 'hsla(0, 0%, 100%, 0.06)');
        document.body.style.background = 'hsl(222, 47%, 7%)';
    }
})();

// ── Handle deep-link shortcuts from manifest ──────────────────────────────────
(function handleShortcuts() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
        window._startTab = tab;
        // Clean the URL without reload
        window.history.replaceState({}, '', '/');
    }
})();

window.initApp = async function() {
    // ── Environment Safety Check ───────────────────────────────────────────
    if (window.location.protocol === 'file:') {
        const errorMsg = "CRITICAL: You are running SmartCustomer AI as a local file (file://). AI features will fail with 'Failed to fetch'.\n\nPlease ensure your backend is running before accessing.";
        console.error(errorMsg);
        alert(errorMsg);
    }

    const app = document.getElementById('app');
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        app.innerHTML = '<div id="auth-root" class="animate-fadeIn"></div>';
        LoginView.render('auth-root');
        return;
    }

    try {
        const user = await ApiClient.getCurrentUser();

        // ── User-Switch Detection ──────────────────────────────────────────────
        const prevPhone = localStorage.getItem('user_phone');
        const newPhone = user.phone || user.name || '';
        
        // If the user identity changed, or we have no phone, force a clean state
        if (prevPhone && prevPhone !== newPhone) {
            console.log("[App] User switch detected. Purging old session...");
            ApiClient.logout();
            localStorage.setItem('auth_token', token); // Restore the token we just validated
            localStorage.setItem('user_phone', newPhone);
            localStorage.setItem('sc_user_id', user.id);
            localStorage.setItem('user_name', user.name);
            
            // Fix: Correctly check for theme in user preferences if it exists
            if (user.preferences && user.preferences.theme) {
                localStorage.setItem('app_theme', user.preferences.theme);
            }
        }

        window._currentUser = user;
        localStorage.setItem('user_phone', newPhone);

        const dashData = await ApiClient.getDashboardData();
        localStorage.setItem('businessMode', dashData.mode);
        
        // ── Ingestion-First Navigation Guard ──────────────────────────────────
        let startTab = window._startTab || 'dashboard';
        window._appLocked = false;

        if (dashData.mode === 'urban' && dashData.has_data === false) {
            window._appLocked = true;
            startTab = 'data';
            // Show toast after shell renders
            setTimeout(() => {
                showToast("Action Required: Please upload your retail CSV to activate AI Dashboard.", "warning", 6000);
            }, 1000);
        }

        renderMainShell(dashData.mode, newPhone, dashData.kpis?.active_customers || 0);
        
        // Render initial view
        window.switchTab(startTab);
        // Reveal bottom nav — guarantee it always shows even if fonts.ready stalls or DOM is slow
        const revealBottomNav = () => {
            const nav = document.getElementById('app-bottom-nav');
            if (nav) {
                if (!nav.classList.contains('nav-ready')) {
                    nav.classList.add('nav-ready');
                    console.log("[Nav] Revealed bottom navigation.");
                }
                return true;
            }
            return false;
        };

        // Persistent polling (every 100ms for up to 1.5s) to handle slow DOM injection on mobile
        let navPollCount = 0;
        const navPollInterval = setInterval(() => {
            if (revealBottomNav() || navPollCount > 15) {
                clearInterval(navPollInterval);
                // Last ditch effort if polling failed
                if (navPollCount > 15) revealBottomNav();
            }
            navPollCount++;
        }, 100);

        // Also tie to font load as a secondary trigger
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(revealBottomNav).catch(revealBottomNav);
        }

        // ── PWA Install Button ─────────────────────────────────────────────────
        window._onInstallPromptReady = () => {
            const btn = document.getElementById('pwa-install-btn');
            if (btn) btn.style.display = 'flex';
        };
        // If prompt already captured before initApp ran
        if (window._pwaInstallPrompt) {
            window._onInstallPromptReady();
        }

        // ── Handle deep links / shortcuts ────────────────────────────────────
        window._startTab = null;

    } catch (error) {
        console.error("Session Validation Failed:", error);
        localStorage.removeItem('auth_token');
        
        const root = document.getElementById('auth-root') || document.getElementById('app');
        if (root) {
            root.innerHTML = '<div id="auth-root" class="animate-fadeIn"></div>';
            LoginView.render('auth-root');
        } else {
            // Fallback: if DOM is not ready, reload
            window.location.reload();
        }
    } finally {
        // Ensure loader is hidden after initialization attempt
        const loader = document.getElementById('app-loader');
        if (loader) loader.style.display = 'none';
        const shell = document.getElementById('app-shell');
        if (shell) shell.style.opacity = '1';
    }
}

window.unlockApp = async function() {
    window._appLocked = false;
    // Visually unlock all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('nav-locked');
    });
    console.log("[App] Intelligence Layer Unlocked. Refreshing state...");
    
    try {
        // Trigger fresh fetch in background to warm up cache
        await ApiClient.getDashboardData(true);
        console.log("[App] Dashboard data refreshed.");
    } catch (e) {
        console.warn("[App] Post-unlock background refresh failed", e);
    }
};

window.triggerPWAInstall = async function() {
    const prompt = window._pwaInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    if (outcome === 'accepted') {
        window._pwaInstallPrompt = null;
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'none';
    }
};

function renderMainShell(mode, userName, activeCustomers) {
    const app = document.getElementById('app');
    const isInstallable = !!window._pwaInstallPrompt;
    
    app.innerHTML = `
        <div class="app-shell animate-fadeIn" style="animation-duration: 0.5s;">
            <header class="glass-header" style="animation: slideDown 0.4s ease-out;">
                <div style="width: 100%; max-width: 650px; margin: 0 auto; padding: 0 1.5rem; display:flex; justify-content:space-between; align-items:center; height: 100%;">
                    <!-- Brand Logo -->
                    <div style="font-weight: 900; font-size: 1.2rem; letter-spacing: -0.03em; display:flex; align-items:center; gap: 0.55rem; flex-shrink: 0;">
                        <div style="background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); color:white; width: 36px; height: 36px; border-radius: 10px; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px hsla(var(--p-h), var(--p-s), var(--p-l), 0.35); flex-shrink:0;">
                            <i class='bx bxs-zap' style="font-size: 1.2rem;"></i>
                        </div>
                        <span>SmartCustomer <span style="font-weight: 500; opacity: 0.55;">AI</span></span>
                    </div>

                    <!-- Right: PWA install + Mode Badge + Avatar -->
                    <div id="user-profile" style="display: flex; align-items: center; gap: 0.55rem; flex-shrink: 0;">
                        <!-- PWA Install Button (hidden by default, shown when installable) -->
                        <button 
                            id="pwa-install-btn" 
                            class="pwa-install-btn"
                            onclick="triggerPWAInstall()"
                            style="display: ${isInstallable ? 'flex' : 'none'};"
                            title="Install as App"
                        >
                            <i class='bx bx-download' style="font-size: 0.9rem;"></i>
                            Install App
                        </button>
                        
                        <!-- Mode Badge -->
                        <span style="font-size: 0.65rem; font-weight: 800; padding: 0.35rem 0.65rem; border-radius: 30px; text-transform: uppercase; letter-spacing: 0.05em; background: ${mode === 'rural' ? 'rgba(16,185,129,0.12)' : 'var(--primary-light)'}; color: ${mode === 'rural' ? 'var(--success-color)' : 'var(--primary-color)'};">
                            ${mode === 'rural' ? '🌾 Rural' : '🏙️ Urban'}
                        </span>
                        <!-- Avatar / Settings -->
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 800; box-shadow: var(--shadow-sm); cursor: pointer;" onclick="switchTab('settings')" title="Settings">
                            <i class='bx bx-cog' style="font-size: 1.2rem;"></i>
                        </div>
                    </div>
                </div>
            </header>

            <main id="main-content" style="padding-top: 6.5rem; padding-bottom: 8rem; min-height: 100vh; position: relative;">
                <!-- Global View Loader Overlay -->
                <div id="view-loader" class="view-loader">
                    <div class="loader-spinner"></div>
                </div>
            </main>

            <nav class="bottom-nav" id="app-bottom-nav">
                <div class="nav-container">
                    <div class="nav-item active" data-tab="dashboard" onclick="switchTab('dashboard')" style="cursor:pointer;">
                        <i class='bx bx-grid-alt nav-icon'></i>
                        <span class="nav-label">Dash</span>
                    </div>
                    <div class="nav-item" data-tab="actions" onclick="switchTab('actions')" style="cursor:pointer;">
                        <i class='bx bx-rocket nav-icon'></i>
                        <span class="nav-label">Actions</span>
                    </div>
                    <div class="nav-item nav-center" data-tab="data" onclick="switchTab('data')" style="cursor:pointer;">
                        <div class="nav-plus-btn">
                            <i class='bx bx-data'></i>
                        </div>
                        <span class="nav-label">Data</span>
                    </div>
                    <div class="nav-item" data-tab="customers" onclick="switchTab('customers')" style="cursor:pointer;">
                        <i class='bx bx-group nav-icon'></i>
                        <span class="nav-label">Clients</span>
                    </div>
                    <div class="nav-item" data-tab="more" onclick="switchTab('more')" style="cursor:pointer;">
                        <i class='bx bx-menu-alt-right nav-icon'></i>
                        <span class="nav-label">Suite</span>
                    </div>
                </div>
            </nav>
        </div>
    `;
}

window.switchTab = function(tabName, forced = false) {
    // Normalize tab names
    let targetTab = tabName.toLowerCase();
    if (targetTab === 'dash') targetTab = 'dashboard';

    if (window._appLocked && targetTab !== 'data') {
        showToast("AI Layer Locked: Upload CSV data first", "error");
        return;
    }

    const navItems = document.querySelectorAll('.nav-item');
    const mainContent = document.getElementById('main-content');
    const mode = localStorage.getItem('businessMode') || 'urban';

    if (!mainContent) return;

    // Reset nav state
    navItems.forEach(item => {
        item.classList.remove('active');
        if (forced && item.getAttribute('data-tab') !== 'data') {
            item.classList.add('nav-locked');
        } else {
            item.classList.remove('nav-locked');
        }
    });
    
    const activeItem = document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
    if (activeItem) activeItem.classList.add('active');

    const viewLoader = document.getElementById('view-loader');
    
    // Smooth transition
    mainContent.style.opacity = '0';
    if (viewLoader) viewLoader.classList.add('active');
    
    mainContent.style.padding = '';
    mainContent.style.height = '';
    mainContent.style.display = '';
    mainContent.style.flexDirection = '';
    mainContent.style.overflow = '';
    mainContent.style.paddingTop = '6.5rem';
    mainContent.style.paddingBottom = 'calc(8rem + env(safe-area-inset-bottom))';
    mainContent.style.minHeight = '100vh';
    
    setTimeout(() => {
        try {
            switch(targetTab) {
                case 'dashboard':  DashboardView.render('main-content', mode); break;
                case 'actions':    ActionsView.render('main-content', mode); break;
                case 'data':       DataIngestView.render('main-content', mode); break;
                case 'customers':  CustomersView.render('main-content', mode); break;
                case 'more':       renderMenuGrid(); break;
                // Sub-modules
                case 'analytics':  AnalyticsView.render('main-content', mode); break;
                case 'predict':    PredictView.render('main-content', mode); break;
                case 'simulator':  SimulatorView.render('main-content', mode); break;
                case 'compare':    CompareView.render('main-content', mode); break;
                case 'anomaly':    AnomalyView.render('main-content', mode); break;
                case 'quality':    QualityView.render('main-content', mode); break;
                case 'export':     ExportView.render('main-content', mode); break;
                case 'settings':   SettingsView.render('main-content', mode); break;
                case 'advisor':    AdvisorView.render('main-content', mode); break;
            }
            
            // Re-hide loader and reveal content
            mainContent.style.opacity = '1';
            if (viewLoader) viewLoader.classList.remove('active');
            
            window.scrollTo(0, 0);
            // Apply translations
            if (window.I18n) window.I18n.apply();
            setTimeout(() => { if (window.I18n) window.I18n.apply(); }, 900);
        } catch (e) {
            console.error("Routing error:", e);
            mainContent.innerHTML = `<div class="container"><div class="card"><h3>Module Error</h3><p>${tabName} could not be initialized: ${e.message}</p></div></div>`;
            mainContent.style.opacity = '1';
            if (viewLoader) viewLoader.classList.remove('active');
        }
    }, 300); // 300ms for a more intentional native transition feel
}

function renderMenuGrid() {
    const mainContent = document.getElementById('main-content');
    const mode = localStorage.getItem('businessMode') || 'urban';
    
    if (mode === 'rural') {
        // RURAL SUITE: Only show tools relevant to manual rural operations
        mainContent.innerHTML = `
            <div class="container animate-fadeIn">
                <h1 style="margin-bottom: 0.5rem; font-weight: 900; letter-spacing: -0.05em; text-align: center;">Rural Suite</h1>
                <p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; margin-bottom: 2rem;">Tools built for your business</p>
                <div class="business-grid" style="gap: 1.25rem;">
                    <div class="card premium-card animate-fadeIn" style="animation-delay: 0.05s; animation-fill-mode: both;" onclick="switchTab('advisor')">
                        <div style="width: 48px; height: 48px; background: hsla(38, 92%, 50%, 0.1); color: #f59e0b; border-radius: 14px; display:flex; align-items:center; justify-content:center;">
                            <i class='bx bx-bot' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">AI Advisor</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Business Strategy Chat</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" style="animation-delay: 0.1s; animation-fill-mode: both;" onclick="switchTab('actions')">
                        <div style="width: 48px; height: 48px; background: hsla(var(--p-h), var(--p-s), var(--p-l), 0.1); color: var(--primary-color); border-radius: 14px; display:flex; align-items:center; justify-content:center;">
                            <i class='bx bx-rocket' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">Festival Actions</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Growth Opportunities</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" style="animation-delay: 0.15s; animation-fill-mode: both;" onclick="switchTab('customers')">
                        <div style="width: 48px; height: 48px; background: hsla(158, 77%, 42%, 0.1); color: #10b981; border-radius: 14px; display:flex; align-items:center; justify-content:center;">
                            <i class='bx bx-user-circle' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">Client Ledger</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Udhaar & Records</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" style="animation-delay: 0.2s; animation-fill-mode: both;" onclick="switchTab('settings')">
                        <div style="width: 48px; height: 48px; background: hsla(var(--p-h), var(--p-s), var(--p-l), 0.1); color: var(--primary-color); border-radius: 14px; display:flex; align-items:center; justify-content:center;">
                            <i class='bx bx-cog' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">Settings</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Theme & Language</p>
                    </div>
                </div>
                <div style="margin-top: 2rem; padding: 1.25rem; background: var(--bg-color); border-radius: 16px; border: 1px dashed var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <i class='bx bx-lock-alt' style="color: var(--text-secondary); font-size: 1.1rem;"></i>
                        <span style="font-size: 0.8rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em;">Urban-Only Tools</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${['ML Predictor', 'ROI Simulator', 'A/B Trends', 'Market Map', 'Anomaly Radar', 'Data Quality', 'Reports'].map(t => 
                            `<span style="font-size: 0.75rem; font-weight: 700; padding: 0.3rem 0.75rem; background: var(--surface-color); border-radius: 20px; color: var(--text-secondary); border: 1px solid var(--border-color);">${t}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    } else {
        // URBAN SUITE: Full intelligence tools
        mainContent.innerHTML = `
            <div class="container animate-fadeIn">
                <h1 style="margin-bottom: 2rem; font-weight: 900; letter-spacing: -0.05em; text-align: center;">Intelligence Suite</h1>
                <div class="business-grid" style="gap: 1.25rem;">
                    <div class="card premium-card animate-fadeIn" style="animation-duration: 0.3s; animation-delay: 0.05s; animation-fill-mode: both;" onclick="switchTab('analytics')">
                        <div style="width: 48px; height: 48px; background: hsla(var(--p-h), var(--p-s), var(--p-l), 0.1); color: var(--primary-color); border-radius: 14px; display:flex; align-items:center; justify-content:center; margin-bottom: 0.5rem;">
                            <i class='bx bx-pie-chart-alt-2' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">Market Map</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Visual Segmentation</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" style="animation-duration: 0.3s; animation-delay: 0.1s; animation-fill-mode: both;" onclick="switchTab('predict')">
                        <div style="width: 48px; height: 48px; background: hsla(259, 94%, 71%, 0.1); color: #8b5cf6; border-radius: 14px; display:flex; align-items:center; justify-content:center; margin-bottom: 0.5rem;">
                            <i class='bx bx-brain' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">ML Predictor</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Revenue Forecast</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" style="animation-duration: 0.3s; animation-delay: 0.15s; animation-fill-mode: both;" onclick="switchTab('simulator')">
                        <div style="width: 48px; height: 48px; background: hsla(38, 92%, 50%, 0.1); color: #f59e0b; border-radius: 14px; display:flex; align-items:center; justify-content:center; margin-bottom: 0.5rem;">
                            <i class='bx bx-test-tube' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">ROI Simulator</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Growth What-Ifs</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" style="animation-duration: 0.3s; animation-delay: 0.2s; animation-fill-mode: both;" onclick="switchTab('compare')">
                        <div style="width: 48px; height: 48px; background: hsla(188, 86%, 43%, 0.1); color: #06b6d4; border-radius: 14px; display:flex; align-items:center; justify-content:center; margin-bottom: 0.5rem;">
                            <i class='bx bx-git-compare' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">A/B Trends</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Cohort Benchmarking</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" style="animation-duration: 0.3s; animation-delay: 0.25s; animation-fill-mode: both;" onclick="switchTab('anomaly')">
                        <div style="width: 48px; height: 48px; background: hsla(0, 84%, 60%, 0.1); color: var(--danger-color); border-radius: 14px; display:flex; align-items:center; justify-content:center; margin-bottom: 0.5rem;">
                            <i class='bx bx-error-alt' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">Anomaly Radar</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Fraud & Risk</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" style="animation-duration: 0.3s; animation-delay: 0.3s; animation-fill-mode: both;" onclick="switchTab('quality')">
                        <div style="width: 48px; height: 48px; background: hsla(158, 77%, 42%, 0.1); color: #10b981; border-radius: 14px; display:flex; align-items:center; justify-content:center; margin-bottom: 0.5rem;">
                            <i class='bx bx-check-shield' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">Data Quality</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Schema Integrity</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" onclick="switchTab('advisor')" style="animation-duration: 0.3s; animation-delay: 0.35s; animation-fill-mode: both;">
                        <div style="width: 48px; height: 48px; background: hsla(259, 94%, 71%, 0.1); color: #8b5cf6; border-radius: 14px; display:flex; align-items:center; justify-content:center; margin-bottom: 0.5rem;">
                            <i class='bx bx-conversation' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">AI Advisor</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Business Strategy Chat</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" onclick="switchTab('export')" style="animation-duration: 0.3s; animation-delay: 0.4s; animation-fill-mode: both;">
                        <div style="width: 48px; height: 48px; background: hsla(215, 16%, 47%, 0.1); color: #6b7280; border-radius: 14px; display:flex; align-items:center; justify-content:center; margin-bottom: 0.5rem;">
                            <i class='bx bx-export' style="font-size: 1.75rem;"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">Export Reports</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">BI Data for Accounting</p>
                    </div>
                    <div class="card premium-card animate-fadeIn" onclick="switchTab('settings')" style="grid-column: span 2; animation-duration: 0.3s; animation-delay: 0.45s; animation-fill-mode: both;">
                        <div style="width: 48px; height: 48px; background: hsla(var(--p-h), var(--p-s), var(--p-l), 0.1); border-radius: 14px; display:flex; align-items:center; justify-content:center; margin-bottom: 0.5rem;">
                            <i class='bx bx-cog' style="font-size: 1.75rem; color: var(--primary-color);"></i>
                        </div>
                        <h4 style="margin-top: 1rem; font-weight: 800;">Settings</h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Theme, Language, Notifications & Data</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const moreBtn = document.querySelector('.nav-item[data-tab="more"]');
    if (moreBtn) moreBtn.classList.add('active');
}

window.handleLogout = function() {
    console.warn("[App] Session Terminated. Performing full system reset...");
    // 1. Wipe ALL session-specific state via API Client utility
    ApiClient.logout();
    
    // 2. Wipe window state
    window._currentUser = null;
    window._appLocked = false;
    window._dashCache = null;
    
    // 3. Force a total page reload to ensure a clean slate for the next user
    window.location.href = '/';
    setTimeout(() => window.location.reload(true), 100);
};

// ── Toast System ────────────────────────────────────────────────────────
window.showToast = function(message, type = 'info', duration = 4000) {
    const container = document.body;
    const toast = document.createElement('div');
    
    // Style
    const bgColor = type === 'error' ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#6366f1');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: ${bgColor};
        color: white;
        padding: 0.8rem 1.4rem;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 700;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 10000;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: max-content;
        max-width: 90vw;
    `;
    
    const icon = type === 'error' ? 'bx-error-circle' : (type === 'warning' ? 'bx-error' : 'bx-info-circle');
    toast.innerHTML = `<i class='bx ${icon}' style="font-size: 1.1rem;"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Animation
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // Auto-remove
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(150%)';
        setTimeout(() => toast.remove(), 500);
    }, duration);
};

document.addEventListener('DOMContentLoaded', window.initApp);

// Listen for SW sync messages
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'SYNC_RURAL_SALES') {
            // Auto-sync rural sales if DataIngestView is active
            const mode = localStorage.getItem('businessMode');
            if (mode === 'rural' && typeof DataIngestView !== 'undefined') {
                const records = JSON.parse(localStorage.getItem('rural_sales') || '[]');
                if (records.length > 0) {
                    DataIngestView.syncRuralData();
                }
            }
        }
    });
}
