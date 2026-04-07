// API Client configuration
// In a native mobile app wrapper (Capacitor), use the full Render deployment URL. 
// For standard web/PWA access, use the relative path.
const API_BASE = (window.location.protocol.includes('file') || window.location.protocol.includes('capacitor'))
    ? 'https://your-app-url.onrender.com/api' // TODO: Replace with actual Render deployment URL
    : '/api';

class ApiClient {
    static getAuthHeader() {
        const token = localStorage.getItem('auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Helper for standardized fetch with better error reporting
    static async _safeFetch(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                let msg = "Network response was not ok";
                if (response.status === 401) {
                    msg = "Invalid credentials or missing session. Please sign in again.";
                } else if (response.status === 404) {
                    msg = "Resource not found. Please check your connection or server port.";
                } else if (response.status === 500) {
                    msg = "Internal AI Server Error. Deterministic fallbacks may be triggered.";
                }
                
                try {
                    const error = await response.json();
                    msg = error.detail || msg;
                } catch(e) {}
                throw new Error(msg);
            }
            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                throw new Error("AI Server Connection Lost - Please ensure the backend is running on port 8000.");
            }
            throw error;
        }
    }

    static async synthesizeVoice(text) {
        try {
            const response = await fetch(`${API_BASE}/voice/synthesize`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error('Voice synthesis failed');
            
            const isSimulation = response.headers.get('X-AI-Status') === 'simulation';
            const blob = await response.blob();
            
            return {
                url: URL.createObjectURL(blob),
                isSimulation: isSimulation
            };
        } catch(error) {
            console.error("Voice synthesis failed", error);
            return null;
        }
    }

    static async checkAuthenticity(content) {
        return this._safeFetch(`${API_BASE}/authenticity/check`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
    }

    static async generateVisual(prompt) {
        const response = await fetch(`${API_BASE}/visuals/generate`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error('Visual generation failed');
        
        const isSimulation = response.headers.get('X-AI-Status') === 'simulation';
        const blob = await response.blob();
        
        return {
            url: URL.createObjectURL(blob),
            isSimulation: isSimulation
        };
    }

    // --- Authentication --- //
    static async login(username, password, mode) {
        return this._safeFetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, mode })
        });
    }

    static async signup(userData) {
        return this._safeFetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
    }

    static async getCurrentUser() {
        return this._safeFetch(`${API_BASE}/auth/me`, {
            headers: this.getAuthHeader()
        });
    }

    // --- Dashboard --- //
    static async getDashboardData(forceRefresh = false, mode = null) {
        const userPhone = localStorage.getItem('user_phone') || 'anon';
        const activeMode = mode || localStorage.getItem('businessMode') || 'urban';
        const cacheKey = `dash_cache_${userPhone}_${activeMode}`;

        if (!forceRefresh) {
            const cachedRaw = localStorage.getItem(cacheKey);
            if (cachedRaw) {
                const { timestamp, data } = JSON.parse(cachedRaw);
                // 24h TTL check
                if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                    console.log(`%c[Sync] Local data synchronization complete for ${userPhone} (${activeMode})`, "color: #10B981; font-weight: bold;");
                    return data;
                }
            }
        }

        try {
            const endpoint = mode ? `${API_BASE}/dashboard_data?mode=${mode}` : `${API_BASE}/dashboard_data`;
            const data = await this._safeFetch(endpoint, {
                headers: this.getAuthHeader()
            });
            
            // Save to user-specific offline cache
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
            return data;
        } catch (error) {
            console.warn("API fetch failed, trying user-specific offline cache fallback...", error);
            const cachedRaw = localStorage.getItem(cacheKey);
            if (cachedRaw) {
                const { data } = JSON.parse(cachedRaw);
                return data;
            }
            throw error;
        }
    }

    // --- Actions --- //
    static async getTodayActions(forceRefresh = false) {
        const userPhone = localStorage.getItem('user_phone') || 'anon';
        const cacheKey = `actions_cache_${userPhone}`;

        if (!forceRefresh) {
            const cachedRaw = localStorage.getItem(cacheKey);
            if (cachedRaw) {
                const { timestamp, data } = JSON.parse(cachedRaw);
                // 10-minute TTL check
                if (Date.now() - timestamp < 10 * 60 * 1000) {
                    console.log(`Using cached actions for ${userPhone}`);
                    return data;
                }
            }
        }

        try {
            const data = await this._safeFetch(`${API_BASE}/actions/today`, {
                headers: this.getAuthHeader()
            });
            
            // Save to user-specific offline cache
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
            return data;
        } catch(error) {
            console.warn("API fetch actions failed, trying offline cache...", error);
            const cachedRaw = localStorage.getItem(cacheKey);
            if (cachedRaw) {
                const { data } = JSON.parse(cachedRaw);
                return data;
            }
            return { actions: [] };
        }
    }

    static async executeAction(actionId, executionType) {
        return this._safeFetch(`${API_BASE}/actions/execute`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action_id: actionId, channel: executionType })
        });
    }

    static async logOutcome(actionId, actualRevenue, actualRetention, responseRate) {
        return this._safeFetch(`${API_BASE}/actions/outcome`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action_id: actionId,
                actual_revenue: actualRevenue,
                actual_retention: actualRetention,
                response_rate: responseRate
            })
        });
    }

    // --- Advisor --- //
    static async sendAdvisorMessage(payload) {
        // Ensure we send an array of ChatMessage objects
        let messages = [];
        if (typeof payload === 'string') {
            messages = [{ role: 'user', content: payload }];
        } else if (Array.isArray(payload)) {
            // If it's already an array, ensure it contains objects
            messages = payload.map(m => typeof m === 'string' ? { role: 'user', content: m } : m);
        }

        return this._safeFetch(`${API_BASE}/advisor/chat`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages })
        });
    }

    static async getChatHistory() {
        return this._safeFetch(`${API_BASE}/advisor/history`, {
            headers: this.getAuthHeader()
        });
    }

    static async getCustomers(search = "", mode = null) {
        let url = search 
            ? `${API_BASE}/customers?search=${encodeURIComponent(search)}` 
            : `${API_BASE}/customers`;
        if (mode) {
            url += (url.includes('?') ? '&' : '?') + `mode=${encodeURIComponent(mode)}`;
        }
        return this._safeFetch(url, { headers: this.getAuthHeader() });
    }

    static async getAnalyticsData() {
        return this._safeFetch(`${API_BASE}/analytics`, { headers: this.getAuthHeader() });
    }

    static async getComparison(mode) {
        return this._safeFetch(`${API_BASE}/comparison`, { headers: this.getAuthHeader() });
    }

    // --- Tools --- //
    static async getSimulation(priceChange, volumeChange, mode) {
        return this._safeFetch(`${API_BASE}/simulate`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                price_change: priceChange, 
                volume_change: volumeChange, 
                mode: mode 
            })
        });
    }

    static async predict(recency, frequency, monetary) {
        return this._safeFetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recency, frequency, monetary })
        });
    }

    static async getAnomalyScan() {
        return this._safeFetch(`${API_BASE}/anomaly/scan`, { 
            method: 'POST',
            headers: this.getAuthHeader() 
        });
    }

    // --- Rural Specific Management --- //
    static async getRuralTransactions(search = "") {
        const url = search ? `${API_BASE}/rural/transactions?search=${encodeURIComponent(search)}` : `${API_BASE}/rural/transactions`;
        return this._safeFetch(url, { headers: this.getAuthHeader() });
    }

    static async updateTransaction(id, data) {
        return this._safeFetch(`${API_BASE}/transactions/${id}`, {
            method: 'PUT',
            headers: {
                ...this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
    }

    static async deleteTransaction(id) {
        return this._safeFetch(`${API_BASE}/transactions/${id}`, {
            method: 'DELETE',
            headers: this.getAuthHeader()
        });
    }


    static logout() {
        console.warn("ApiClient: PERFORMING SCORCHED EARTH LOGOUT...");
        // Preserve only non-sensitive visual preferences
        const theme = localStorage.getItem('app_theme');
        const lang = localStorage.getItem('lang');
        
        // Clear EVERYTHING
        localStorage.clear();
        sessionStorage.clear();
        
        // Restore non-sensitive markers
        if (theme) localStorage.setItem('app_theme', theme);
        if (lang) localStorage.setItem('lang', lang);
        
        // Clear in-memory references
        window._currentUser = null;
        window._appLocked = false;
        window._dashCache = null;
        
        // The redirection in app.js will force a full state reset
    }

}

window.ApiClient = ApiClient;
