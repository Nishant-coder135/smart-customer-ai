class SettingsView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');

        const currentLang = localStorage.getItem('lang') || 'en';
        const currentTheme = localStorage.getItem('app_theme') || 'dark';
        const notifEnabled = localStorage.getItem('notifications_enabled') !== 'false';

        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx bx-cog text-gradient' style="font-size: 2.5rem;"></i>
                        Settings
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;">App Preferences & Configuration</p>
                </div>

                <!-- Account Info -->
                <div class="card premium-card" style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem;">
                        <div style="width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class='bx bx-user' style="font-size: 1.75rem; color: white;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 1.05rem;">${window._currentUser?.phone || localStorage.getItem('user_phone') || 'Account'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">${mode} Node &bull; Enterprise Plan</div>
                        </div>
                    </div>
                </div>

                <!-- Theme Setting -->
                <div class="card" style="margin-bottom: 1.25rem; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 38px; height: 38px; background: hsla(var(--p-h), var(--p-s), var(--p-l), 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                <i class='bx bx-palette' style="color: var(--primary-color); font-size: 1.25rem;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 0.95rem;">Theme</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Interface appearance</div>
                            </div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <button id="theme-dark-btn" onclick="SettingsView.setTheme('dark')" style="padding: 0.85rem; border-radius: 12px; border: 2px solid ${currentTheme === 'dark' ? 'var(--primary-color)' : 'var(--border-color)'}; background: ${currentTheme === 'dark' ? 'var(--primary-light)' : 'var(--bg-color)'}; color: var(--text-primary); font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;">
                            <i class='bx bx-moon'></i> Dark
                        </button>
                        <button id="theme-light-btn" onclick="SettingsView.setTheme('light')" style="padding: 0.85rem; border-radius: 12px; border: 2px solid ${currentTheme === 'light' ? 'var(--primary-color)' : 'var(--border-color)'}; background: ${currentTheme === 'light' ? 'var(--primary-light)' : 'var(--bg-color)'}; color: var(--text-primary); font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;">
                            <i class='bx bx-sun'></i> Light
                        </button>
                    </div>
                </div>

                <!-- Language Setting -->
                <div class="card" style="margin-bottom: 1.25rem; padding: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
                        <div style="width: 38px; height: 38px; background: hsla(188, 86%, 43%, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <i class='bx bx-world' style="color: #06b6d4; font-size: 1.25rem;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 0.95rem;">Language</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Display language for the app</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <button onclick="SettingsView.setLanguage('en')" style="padding: 0.85rem; border-radius: 12px; border: 2px solid ${currentLang === 'en' ? 'var(--primary-color)' : 'var(--border-color)'}; background: ${currentLang === 'en' ? 'var(--primary-light)' : 'var(--bg-color)'}; color: var(--text-primary); font-weight: 800; cursor: pointer; transition: all 0.2s; font-size: 0.9rem;" id="lang-en-btn">🇬🇧 English</button>
                        <button onclick="SettingsView.setLanguage('hi')" style="padding: 0.85rem; border-radius: 12px; border: 2px solid ${currentLang === 'hi' ? 'var(--primary-color)' : 'var(--border-color)'}; background: ${currentLang === 'hi' ? 'var(--primary-light)' : 'var(--bg-color)'}; color: var(--text-primary); font-weight: 800; cursor: pointer; transition: all 0.2s; font-size: 0.9rem;" id="lang-hi-btn">🇮🇳 हिंदी</button>
                        <button onclick="SettingsView.setLanguage('mr')" style="padding: 0.85rem; border-radius: 12px; border: 2px solid ${currentLang === 'mr' ? 'var(--primary-color)' : 'var(--border-color)'}; background: ${currentLang === 'mr' ? 'var(--primary-light)' : 'var(--bg-color)'}; color: var(--text-primary); font-weight: 800; cursor: pointer; transition: all 0.2s; font-size: 0.9rem;" id="lang-mr-btn">🇮🇳 मराठी</button>
                        <button onclick="SettingsView.setLanguage('ta')" style="padding: 0.85rem; border-radius: 12px; border: 2px solid ${currentLang === 'ta' ? 'var(--primary-color)' : 'var(--border-color)'}; background: ${currentLang === 'ta' ? 'var(--primary-light)' : 'var(--bg-color)'}; color: var(--text-primary); font-weight: 800; cursor: pointer; transition: all 0.2s; font-size: 0.9rem;" id="lang-ta-btn">🇮🇳 தமிழ்</button>
                    </div>
                    <div id="lang-saved-msg" style="display:none; margin-top: 0.75rem; font-size: 0.8rem; color: var(--success-color); font-weight: 700; text-align: center;">✓ Language preference saved</div>
                </div>

                <!-- Notifications Setting -->
                <div class="card" style="margin-bottom: 1.25rem; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 38px; height: 38px; background: hsla(38, 92%, 50%, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                <i class='bx bx-bell' style="color: #f59e0b; font-size: 1.25rem;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 0.95rem;">Smart Alerts</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Churn risk & revenue drop alerts</div>
                            </div>
                        </div>
                        <div onclick="SettingsView.toggleNotifications()" id="notif-toggle" style="width: 52px; height: 28px; border-radius: 14px; background: ${notifEnabled ? 'var(--primary-color)' : 'var(--border-color)'}; position: relative; cursor: pointer; transition: background 0.3s;">
                            <div style="width: 22px; height: 22px; border-radius: 50%; background: white; position: absolute; top: 3px; ${notifEnabled ? 'right: 3px;' : 'left: 3px;'} transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                        </div>
                    </div>
                </div>

                <!-- Business Mode Info -->
                <div class="card" style="margin-bottom: 1.25rem; padding: 1.5rem; border-left: 4px solid var(--primary-color);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="width: 38px; height: 38px; background: hsla(var(--p-h), var(--p-s), var(--p-l), 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <i class='bx bx-store' style="color: var(--primary-color); font-size: 1.25rem;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 0.95rem;">Business Mode</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Currently active database partition</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--bg-color); border-radius: 12px;">
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--success-color); box-shadow: 0 0 6px var(--success-color);"></div>
                        <span style="font-weight: 800; text-transform: capitalize; font-size: 0.9rem;">${mode} Mode — Data Isolated</span>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.75rem; line-height: 1.5;">Business mode is set at account registration and cannot be changed. Contact support to migrate data.</p>
                </div>

                <!-- Danger Zone -->
                <div class="card" style="padding: 1.5rem; border: 1px solid hsla(0, 84%, 60%, 0.3);">
                    <h3 style="color: var(--danger-color); font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class='bx bx-error-circle'></i> Danger Zone
                    </h3>
                    <button onclick="SettingsView.confirmDataReset()" style="width: 100%; padding: 1rem; border-radius: 12px; border: 1.5px solid var(--danger-color); background: hsla(0, 84%, 60%, 0.05); color: var(--danger-color); font-weight: 800; cursor: pointer; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9rem; transition: all 0.2s;" onmouseover="this.style.background='hsla(0, 84%, 60%, 0.12)'" onmouseout="this.style.background='hsla(0, 84%, 60%, 0.05)'">
                        <i class='bx bx-trash'></i> Reset All Business Data
                    </button>
                    <button onclick="handleLogout()" style="width: 100%; padding: 1rem; border-radius: 12px; border: 1.5px solid var(--border-color); background: var(--bg-color); color: var(--text-secondary); font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9rem; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--danger-color)'; this.style.color='var(--danger-color)'" onmouseout="this.style.borderColor='var(--border-color)'; this.style.color='var(--text-secondary)'">
                        <i class='bx bx-log-out'></i> Sign Out
                    </button>
                </div>

                <!-- Version info -->
                <div style="text-align: center; padding: 2rem 0 1rem; color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; opacity: 0.6;">
                    SmartCustomer AI &bull; v2.0 Enterprise &bull; Build 2026
                </div>
            </div>
        `;

        window.scrollTo(0, 0);
    }

    static setTheme(theme) {
        localStorage.setItem('app_theme', theme);
        const root = document.documentElement;

        if (theme === 'light') {
            root.style.setProperty('--bg-color', '#f0f2f7');
            root.style.setProperty('--surface-color', '#ffffff');
            root.style.setProperty('--card-bg', '#ffffff');
            root.style.setProperty('--text-primary', '#0f172a');
            root.style.setProperty('--text-secondary', '#64748b');
            root.style.setProperty('--border-color', 'rgba(0,0,0,0.08)');
            document.body.style.background = '#f0f2f7';
        } else {
            root.style.setProperty('--bg-color', '#0d0f1a');
            root.style.setProperty('--surface-color', '#141626');
            root.style.setProperty('--card-bg', '#141626');
            root.style.setProperty('--text-primary', '#f1f5f9');
            root.style.setProperty('--text-secondary', '#94a3b8');
            root.style.setProperty('--border-color', 'rgba(255,255,255,0.06)');
            document.body.style.background = '#0d0f1a';
        }

        // Re-render to update button states
        SettingsView.render('main-content');
    }

    static setLanguage(lang) {
        // Use 'lang' key — this is what ALL views check via localStorage.getItem('lang')
        localStorage.setItem('lang', lang);
        
        // Update button borders immediately for visual feedback
        ['en', 'hi', 'mr', 'ta'].forEach(l => {
            const btn = document.getElementById(`lang-${l}-btn`);
            if (btn) {
                btn.style.borderColor = l === lang ? 'var(--primary-color)' : 'var(--border-color)';
                btn.style.background = l === lang ? 'var(--primary-light)' : 'var(--bg-color)';
            }
        });

        // Show toast-style confirmation
        const msg = document.getElementById('lang-saved-msg');
        if (msg) {
            const langNames = { en: '🇬🇧 English', hi: '🇮🇳 हिंदी', mr: '🇮🇳 मराठी', ta: '🇮🇳 தமிழ்' };
            msg.innerHTML = `✓ Language changed to ${langNames[lang] || lang}. Restarting app...`;
            msg.style.display = 'block';
        }
        
        // Force full page reload for 100% consistency across persistent nav & header
        setTimeout(() => {
            location.reload();
        }, 1200);
    }

    static toggleNotifications() {
        const current = localStorage.getItem('notifications_enabled') !== 'false';
        const newVal = !current;
        localStorage.setItem('notifications_enabled', String(newVal));

        const toggle = document.getElementById('notif-toggle');
        if (toggle) {
            toggle.style.background = newVal ? 'var(--primary-color)' : 'var(--border-color)';
            const dot = toggle.querySelector('div');
            if (dot) {
                dot.style.right = newVal ? '3px' : 'auto';
                dot.style.left = newVal ? 'auto' : '3px';
            }
        }
    }

    static confirmDataReset() {
        const confirmed = confirm('⚠️ WARNING: This will permanently delete ALL your business data including customers, transactions, and AI insights. This action cannot be undone.\n\nType "RESET" to confirm.');
        if (confirmed) {
            SettingsView.resetData();
        }
    }

    static async resetData() {
        try {
            const response = await fetch('/api/reset', {
                method: 'POST',
                headers: {
                    ...window.ApiClient.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                alert('✓ All business data has been reset. Redirecting...');
                location.reload();
            } else {
                alert('Reset failed. Please try again.');
            }
        } catch (e) {
            alert('Reset failed. Check backend connection.');
        }
    }
}

window.SettingsView = SettingsView;
