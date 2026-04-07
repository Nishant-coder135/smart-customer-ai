class CompareView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');
        
        // STRICT ISOLATION: This is an urban-only ML feature
        if (mode === 'rural') {
            CompareView.renderRuralGate(container, 'A/B Trends', 'bx-git-compare', 'Requires ML-processed CSV data. Rural mode uses manual transaction tracking which does not generate segment profiles.');
            return;
        }
        
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx bx-git-compare text-gradient' style="font-size: 2.5rem;"></i>
                        A/B Trends
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;">Segment Performance Benchmarking</p>
                </div>
                
                <div id="compare-content" class="animate-fadeIn">
                    <div class="loader-container">
                        <div class="loader"></div>
                        <p style="font-weight: 700; color: var(--text-secondary); margin-top: 1rem;">COLLECTING SEGMENT METRICS...</p>
                    </div>
                </div>
            </div>
        `;

        try {
            const data = await window.ApiClient.getComparison(mode);
            this.renderComparison(data.comparison, 'compare-content');
        } catch (error) {
            const content = document.getElementById('compare-content');
            if (content) {
                content.innerHTML = `<div class="card" style="border-left: 4px solid var(--danger-color);">Error fetching comparison model.</div>`;
            }
        }
    }

    static renderComparison(comparison, contentId) {
        const content = document.getElementById(contentId);
        if (!content || !comparison) return;

        let html = '<div style="display: flex; flex-direction: column; gap: 1.5rem;">';
        
        const colors = ['var(--primary-color)', 'var(--secondary-color)', 'var(--success-color)', 'var(--warning-color)'];
        Object.entries(comparison).forEach(([seg, stats], idx) => {
            const color = colors[idx % colors.length];
            html += `
                <div class="card animate-fadeIn" style="border-left: 6px solid ${color}; padding: 1.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 850; letter-spacing: -0.02em;">${seg}</h3>
                        <span style="font-size: 0.75rem; font-weight: 800; color: ${color}; background: var(--bg-color); padding: 0.3rem 0.6rem; border-radius: 6px;">Profile Segment</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                        <div style="background: var(--bg-color); padding: 1rem; border-radius: 14px; text-align: center;">
                            <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">AOV</div>
                            <div style="font-size: 1.15rem; font-weight: 800; color: ${color};">₹${Math.round(stats.avg_value).toLocaleString()}</div>
                        </div>
                        <div style="background: var(--bg-color); padding: 1rem; border-radius: 14px; text-align: center;">
                            <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">Orders</div>
                            <div style="font-size: 1.15rem; font-weight: 800;">${Math.round(stats.avg_freq)}</div>
                        </div>
                        <div style="background: var(--bg-color); padding: 1rem; border-radius: 14px; text-align: center;">
                            <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">Recency</div>
                            <div style="font-size: 1.15rem; font-weight: 800;">${Math.round(stats.avg_recency)}d</div>
                        </div>
                    </div>
                </div>
            `;
        });

        content.innerHTML = html + "</div>";
    }

    static renderRuralGate(container, featureName, iconClass, reason) {
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx ${iconClass} text-gradient' style="font-size: 2.5rem;"></i>
                        ${featureName}
                    </h1>
                </div>
                <div class="card" style="padding: 2.5rem; text-align: center; border: 2px dashed var(--border-color); background: var(--bg-color);">
                    <div style="width: 72px; height: 72px; background: hsla(var(--p-h), var(--p-s), var(--p-l), 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <i class='bx bx-building-house' style="font-size: 2.5rem; color: var(--primary-color);"></i>
                    </div>
                    <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 0.75rem;">Urban Mode Feature</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; max-width: 320px; margin: 0 auto 2rem;">${reason}</p>
                    <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: hsla(var(--p-h), var(--p-s), var(--p-l), 0.1); border-radius: 20px; font-size: 0.8rem; font-weight: 700; color: var(--primary-color);">
                        <i class='bx bx-lock-alt'></i> Only available in Urban Mode
                    </div>
                </div>
                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                    <p style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600; text-align: center;">Available in Rural Mode:</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <button onclick="switchTab('dashboard')" class="card" style="padding: 1.25rem; text-align: center; cursor: pointer; border: none; background: var(--surface-color);">
                            <i class='bx bx-home-alt-2' style="font-size: 1.5rem; color: var(--primary-color);"></i>
                            <div style="font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem;">Dashboard</div>
                        </button>
                        <button onclick="switchTab('actions')" class="card" style="padding: 1.25rem; text-align: center; cursor: pointer; border: none; background: var(--surface-color);">
                            <i class='bx bx-rocket' style="font-size: 1.5rem; color: var(--secondary-color);"></i>
                            <div style="font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem;">Actions</div>
                        </button>
                        <button onclick="switchTab('customers')" class="card" style="padding: 1.25rem; text-align: center; cursor: pointer; border: none; background: var(--surface-color);">
                            <i class='bx bx-user-circle' style="font-size: 1.5rem; color: var(--success-color);"></i>
                            <div style="font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem;">Clients</div>
                        </button>
                        <button onclick="switchTab('advisor')" class="card" style="padding: 1.25rem; text-align: center; cursor: pointer; border: none; background: var(--surface-color);">
                            <i class='bx bx-bot' style="font-size: 1.5rem; color: #f59e0b;"></i>
                            <div style="font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem;">AI Advisor</div>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}
window.CompareView = CompareView;

class AnomalyView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');

        if (mode === 'rural') {
            CompareView.renderRuralGate(container, 'Anomaly Radar', 'bx-radar', 'Anomaly detection requires a baseline built from large-volume CSV data. Rural mode uses manual single-entry transactions.');
            return;
        }
        
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx bx-radar text-gradient' style="font-size: 2.5rem;"></i>
                        Anomaly Radar
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;">Fraud & Outlier Detection Engine</p>
                </div>
                
                <div id="radar-container">
                    <div class="card premium-card" style="border-left: 6px solid var(--primary-color);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                            <h3 style="font-size: 1.1rem; font-weight: 800;">Neural Scan Ready</h3>
                            <span style="background: hsla(210, 100%, 50%, 0.1); color: var(--primary-color); font-size: 0.65rem; font-weight: 900; padding: 0.3rem 0.6rem; border-radius: 20px;">SYSTEM LIVE</span>
                        </div>
                        <p style="font-size: 0.95rem; color: var(--text-secondary); line-height:1.6; margin-bottom: 1.5rem;">Our AI scans for unusual transaction sizes, behavioral shifts, and data inconsistencies that deviate from your business baseline.</p>
                        <button class="btn btn-premium" style="width: 100%; height: 3.5rem;" id="start-radar-scan">
                            <i class='bx bx-search-alt'></i> Initiate Neural Scan
                        </button>
                    </div>
                </div>

                <div id="radar-results" style="margin-top: 2rem;"></div>
            </div>
        `;

        document.getElementById('start-radar-scan').onclick = () => this.runScan();
    }

    static async runScan() {
        const results = document.getElementById('radar-results');
        const container = document.getElementById('radar-container');
        if (!results || !container) return;

        container.innerHTML = `
            <div class="card premium-card" style="text-align: center; padding: 3rem;">
                <div class="loader" style="margin: 0 auto 1.5rem;"></div>
                <h3 style="font-weight: 800; color: var(--primary-color);">SCANNING NEURAL LAYERS...</h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">Checking Z-Scores, VIP Behavior, and Schema Integrity.</p>
            </div>
        `;

        try {
            const data = await window.ApiClient.getAnomalyScan();
            this.renderResults(data.anomalies);
        } catch (error) {
            results.innerHTML = `<div class="card" style="border-left: 4px solid var(--danger-color); color: var(--danger-color);">${error.message}</div>`;
        }
    }

    static renderResults(anomalies) {
        const results = document.getElementById('radar-results');
        const container = document.getElementById('radar-container');
        if (!results || !container) return;

        if (!anomalies || anomalies.length === 0) {
            container.innerHTML = `
                <div class="card premium-card" style="border-left: 6px solid var(--success-color); text-align: center; padding: 2.5rem;">
                    <i class='bx bx-check-shield' style="font-size: 3.5rem; color: var(--success-color); margin-bottom: 1rem;"></i>
                    <h3 style="font-weight: 850;">NO CRITICAL ANOMALIES</h3>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">Your business baseline is healthy. All transactions within statistical normal range.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="card premium-card" style="border-left: 6px solid var(--warning-color); text-align: center; padding: 1.5rem;">
                <h3 style="font-weight: 850; color: var(--warning-color);">${anomalies.length} ALERTS FOUND</h3>
                <p style="color: var(--text-secondary); font-size: 0.85rem;">Review AI-detected outliers and consistency issues below.</p>
            </div>
        `;

        let html = '';
        anomalies.forEach(a => {
            const severityColor = a.severity === 'high' ? 'var(--danger-color)' : (a.severity === 'medium' ? 'var(--warning-color)' : 'var(--primary-color)');
            html += `
                <div class="card animate-fadeIn" style="border-left: 4px solid ${severityColor}; margin-bottom: 1.25rem; padding: 1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 0.75rem;">
                        <div>
                            <span style="font-size: 0.6rem; font-weight: 900; color: ${severityColor}; text-transform: uppercase;">${a.type} Anomaly</span>
                            <h4 style="font-size: 1.1rem; font-weight: 850;">${a.title}</h4>
                        </div>
                        <i class='bx bxs-error' style="color: ${severityColor}; font-size: 1.25rem;"></i>
                    </div>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">${a.description}</p>
                    
                    <div style="background: var(--bg-color); padding: 1rem; border-radius: 12px; margin-bottom: 1rem; border-left: 3px solid var(--primary-color);">
                        <div style="font-size: 0.65rem; font-weight: 900; color: var(--primary-color); margin-bottom: 0.3rem;">AI DIAGNOSIS</div>
                        <p style="font-size: 0.85rem; font-weight: 700;">${a.diagnosis || 'Calculating...'}</p>
                    </div>

                    <div style="background: hsla(158, 77%, 42%, 0.05); padding: 1rem; border-radius: 12px; border: 1px solid hsla(158, 77%, 42%, 0.1);">
                        <div style="font-size: 0.65rem; font-weight: 900; color: var(--success-color); margin-bottom: 0.3rem;">ACTION ROADMAP</div>
                        <p style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${a.roadmap || 'Manual verification recommended.'}</p>
                    </div>
                </div>
            `;
        });
        results.innerHTML = html;
    }
}
window.AnomalyView = AnomalyView;
