class LoginView {
    static render(containerId) {
        const container = document.getElementById(containerId);
        const isHindi = localStorage.getItem('lang') === 'hi';
        const t = (en, hi) => isHindi ? hi : en;

        container.innerHTML = `
            <div class="login-page animate-fadeIn" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: radial-gradient(circle at top right, hsla(var(--p-h), var(--p-s), var(--p-l), 0.15), var(--bg-color)); padding: 1.5rem;">
                
                <div class="card premium-card" style="width: 100%; max-width: 420px; padding: 2.5rem; text-align: center; border-radius: 32px; box-shadow: var(--shadow-lg);">
                    
                    <div style="margin-bottom: 2.5rem;">
                        <div style="background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); width: 72px; height: 72px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; color: white; box-shadow: 0 10px 20px hsla(var(--p-h), var(--p-s), var(--p-l), 0.3);">
                            <i class='bx bxs-zap' style="font-size: 2.75rem;"></i>
                        </div>
                        <h1 style="font-size: 2.2rem; font-weight: 900; letter-spacing: -0.05em; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                            SmartCustomer AI
                        </h1>
                        <p style="color: var(--text-secondary); font-size: 0.95rem; font-weight: 600; margin-top: 0.5rem;">
                            ${t('Enterprise Growth Intelligence', 'एंटरप्राइज ग्रोथ इंटेलिजेंस')}
                        </p>
                    </div>

                    <div id="login-form">
                        <div class="form-group" id="fullname-group" style="text-align: left; display: none;">
                            <label style="font-size: 0.75rem; font-weight: 850; letter-spacing: 0.05em;">${t('Full Name', 'पूरा नाम')}</label>
                            <input type="text" id="fullname" class="form-control" placeholder="e.g. Ramesh Kumar" style="height: 3.5rem;">
                        </div>
                        <div class="form-group" style="text-align: left;">
                            <label style="font-size: 0.75rem; font-weight: 850; letter-spacing: 0.05em;">${t('Phone Number', 'फ़ोन नंबर')}</label>
                            <input type="text" id="phone" class="form-control" placeholder="e.g. 9876543210" style="height: 3.5rem;">
                        </div>
                        <div class="form-group" style="text-align: left;">
                            <label style="font-size: 0.75rem; font-weight: 850; letter-spacing: 0.05em;">${t('Password', 'पासवर्ड')}</label>
                            <input type="password" id="password" class="form-control" placeholder="••••••••" style="height: 3.5rem;">
                        </div>
                        
                        <div style="margin-bottom: 2rem; text-align: left;">
                            <label style="font-size: 0.75rem; font-weight: 850; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: block;">${t('Operation Mode', 'ऑपरेशन मोड')}</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                <div id="mode-urban" class="card mode-opt active" style="margin-bottom: 0; padding: 0.75rem; cursor: pointer; border: 1.5px solid var(--primary-color); background: var(--primary-light); text-align: center; border-radius: 12px;" onclick="LoginView.selectMode('urban')">
                                    <div style="font-size: 1.1rem; margin-bottom: 0.2rem;">🏙️</div>
                                    <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary-color);">URBAN</div>
                                </div>
                                <div id="mode-rural" class="card mode-opt" style="margin-bottom: 0; padding: 0.75rem; cursor: pointer; border: 1.5px solid var(--border-color); text-align: center; border-radius: 12px;" onclick="LoginView.selectMode('rural')">
                                    <div style="font-size: 1.1rem; margin-bottom: 0.2rem;">🚜</div>
                                    <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-secondary);">RURAL</div>
                                </div>
                            </div>
                        </div>

                        <button id="auth-btn" class="btn btn-premium" style="width: 100%; height: 3.75rem; font-size: 1.1rem;" onclick="LoginView.handleAuth()">
                            ${t('Sign In', 'साइन इन करें')}
                        </button>
                        
                        <div id="login-error" style="color: var(--danger-color); font-size: 0.85rem; margin-top: 1.5rem; font-weight: 600;"></div>
                        
                        <p style="margin-top: 2rem; font-size: 0.9rem; color: var(--text-secondary); font-weight: 600;">
                            ${t("Don't have an account?", "खाता नहीं है?") } 
                            <a href="#" style="color: var(--primary-color); text-decoration: none; font-weight: 800;" onclick="LoginView.toggleSignup(true)">${t('Create One', 'नया बनाएँ')}</a>
                        </p>
                    </div>
                </div>
                
                <p style="margin-top: 2.5rem; font-size: 0.75rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.5;">
                    Neural Cloud Processing v8.0.2
                </p>
            </div>
        `;
        this.currentMode = 'urban';
    }

    static selectMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-opt').forEach(opt => {
            opt.style.borderColor = 'var(--border-color)';
            opt.style.background = 'transparent';
            opt.querySelector('div:last-child').style.color = 'var(--text-secondary)';
        });
        const active = document.getElementById(`mode-${mode}`);
        active.style.borderColor = 'var(--primary-color)';
        active.style.background = 'var(--primary-light)';
        active.querySelector('div:last-child').style.color = 'var(--primary-color)';
    }

    static toggleSignup(isSignup) {
        const btn = document.getElementById('auth-btn');
        const error = document.getElementById('login-error');
        error.innerText = '';
        
        const isHindi = localStorage.getItem('lang') === 'hi';
        const t = (en, hi) => isHindi ? hi : en;
        
        document.getElementById('fullname-group').style.display = isSignup ? 'block' : 'none';
        
        if (isSignup) {
            btn.innerText = t('Create Enterprise Account', 'नया खाता बनाएँ');
            btn.onclick = () => LoginView.handleAuth(true);
            document.querySelector('#login-form p').innerHTML = `${t('Already have an account?', 'क्या आपके पास पहले से एक खाता है?')} <a href="#" style="color: var(--primary-color); font-weight: 800; text-decoration: none;" onclick="LoginView.toggleSignup(false)">${t('Sign In', 'साइन इन करें')}</a>`;
        } else {
            btn.innerText = t('Sign In', 'साइन इन करें');
            btn.onclick = () => LoginView.handleAuth(false);
            document.querySelector('#login-form p').innerHTML = `${t("Don't have an account?", "खाता नहीं है?")} <a href="#" style="color: var(--primary-color); font-weight: 800; text-decoration: none;" onclick="LoginView.toggleSignup(true)">${t('Create One', 'नया बनाएँ')}</a>`;
        }
    }

    static async handleAuth(isSignup = false) {
        const phone = document.getElementById('phone').value.trim();
        const p = document.getElementById('password').value;
        const fullName = isSignup ? document.getElementById('fullname').value.trim() : "";
        const mode = this.currentMode;
        const btn = document.getElementById('auth-btn');
        const error = document.getElementById('login-error');

        if (!phone || !p || (isSignup && !fullName)) {
            error.innerText = "All fields are required";
            return;
        }

        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> AI AUTH...`;

        try {
            if (isSignup) {
                await ApiClient.signup({
                    name: fullName,
                    username: phone,
                    phone: phone,
                    password: p,
                    business_type: mode
                });
                
                // Clear fields for security and UX
                document.getElementById('fullname').value = '';
                document.getElementById('phone').value = '';
                document.getElementById('password').value = '';
                
                // Switch back to login view
                LoginView.toggleSignup(false);
                
                // Show professional success message
                btn.disabled = false;
                btn.innerHTML = originalText;
                error.style.background = "hsla(158, 77%, 42%, 0.1)";
                error.style.color = "var(--success-color)";
                error.style.padding = "1rem";
                error.style.borderRadius = "12px";
                error.innerHTML = `<i class='bx bx-check-circle'></i> Enterprise Account Created.<br><span style="font-size: 0.75rem; opacity: 0.8;">Please sign in with your credentials.</span>`;
                return;
            }

            const data = await ApiClient.login(phone, p, mode);
            
            // Wipe any stale session from previous user before loading new session
            const currentTheme = localStorage.getItem('app_theme');
            const currentLang = localStorage.getItem('lang');
            localStorage.clear();
            if (currentTheme) localStorage.setItem('app_theme', currentTheme);
            if (currentLang) localStorage.setItem('lang', currentLang);

            localStorage.setItem('auth_token', data.access_token);
            localStorage.setItem('user_phone', data.phone || phone);
            localStorage.setItem('businessMode', data.mode || mode);
            localStorage.setItem('sc_user_id', data.user_id);
            localStorage.setItem('user_name', data.name || "");
            location.reload();
        } catch (e) {
            error.style.background = "rgba(239, 68, 68, 0.15)";
            error.style.color = "#ef4444";
            error.style.padding = "1.5rem";
            error.style.borderRadius = "16px";
            error.style.border = "1px solid rgba(239, 68, 68, 0.3)";
            error.style.marginTop = "2rem";
            
            if (e.message.includes('Connection Lost') || e.message.includes('fetch')) {
                error.innerHTML = `
                    <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">⚠️ <strong style="color: #ef4444;">Neural Link Offline</strong></div>
                    <div style="font-size: 0.85rem; line-height: 1.4; font-weight: 500;">
                        The SmartCustomer AI server is unreachable.<br><br>
                        <ul style="text-align: left; margin: 0.5rem 0; padding-left: 1.25rem;">
                            <li>Ensure the backend is running.</li>
                            <li>Try pressing <b>Ctrl + Shift + R</b> to clear cache.</li>
                        </ul>
                    </div>
                `;
            } else {
                error.innerText = e.message;
            }
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }

    }
}
window.LoginView = LoginView;
