class DashboardView {
    static async render(containerId, mode) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="glass-panel motion-slide-up" style="margin: 2rem; padding: 3.5rem 2rem; text-align: center;">
                <div class="loader"></div>
                <p style="color: var(--text-secondary); margin-top: 1.5rem; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.05em;">SYNCHRONIZING BUSINESS INTELLIGENCE...</p>
            </div>
        `;
        
        let data;
        let isOffline = !navigator.onLine;
        try {
            const activeMode = mode || localStorage.getItem('businessMode') || 'urban';
            data = await window.ApiClient.getDashboardData(false, activeMode);
        } catch (e) {
            isOffline = true;
            data = {
                mode: mode || localStorage.getItem('businessMode') || 'urban',
                kpis: { total_customers: 0, total_revenue: 0, active_customers: 0, health_score: 0 },
                advisor: [],
                segments: null,
                credit_stats: null,
                has_data: false
            };
        }
        
        const isHindi = localStorage.getItem('lang') === 'hi';
        const t = (en, hi) => isHindi ? hi : en;
        const kpis = data.kpis || {};
        const actualMode = data.mode || mode;
        const advisor = data.advisor || [];

        // ── KPI Cards ───────────────────────────────────────────────────────────
        const healthScore = kpis.health_score || 0;
        const healthColor = healthScore >= 80 ? 'var(--success-color)' 
                          : (healthScore > 50 ? 'var(--warning-color)' 
                          : 'var(--danger-color)');
        const totalRevenue = kpis.total_revenue || 0;
        const totalCustomers = kpis.total_customers || 0;
        const activeCustomers = kpis.active_customers || 0;

        let html = `
            <div class="container motion-slide-up">
                <!-- Header Row -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                    <div>
                        <h1 style="font-size: 1.9rem; display: flex; align-items: center; gap: 0.65rem; letter-spacing: -0.04em; font-weight: 900;">
                            ${actualMode === 'urban' 
                                ? "<i class='bx bx-buildings text-gradient'></i>" 
                                : "<i class='bx bx-store-alt text-gradient'></i>"}
                            ${actualMode === 'urban' ? t("Urban HQ", "अर्बन मुख्यालय") : t("Rural Store", "ग्रामीण स्टोर")}
                        </h1>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; margin-top: 0.3rem;">
                            ${isOffline 
                                ? "<span style='color: var(--danger-color);'><i class='bx bx-wifi-off'></i> Offline Operations</span>" 
                                : "<span style='color: var(--success-color);'><i class='bx bx-check-shield'></i> AI Layer Active</span>"}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${t('Today', 'आज')}</div>
                        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    </div>
                </div>

                <!-- KPI Grid: 2×2 -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <!-- Revenue -->
                    <div class="glass-panel motion-slide-up motion-stagger-1" style="padding: 1.4rem; background: linear-gradient(135deg, var(--surface-color), var(--glass-bg)); flex: 1;">
                        <div style="color: var(--text-secondary); font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                            <i class='bx bx-rupee' style="font-size: 0.9rem; color: var(--primary-color);"></i> ${t('Revenue', 'कुल आय')}
                        </div>
                        <div style="font-size: 1.6rem; font-weight: 900; letter-spacing: -0.04em;">₹${DashboardView.formatNum(totalRevenue)}</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; margin-top: 0.3rem; opacity: 0.8;">${t('Total Earnings', 'कुल कमाई')}</div>
                    </div>
                    
                    <!-- Total Customers -->
                    <div class="glass-panel motion-slide-up motion-stagger-1" style="padding: 1.4rem; flex: 1;">
                        <div style="color: var(--text-secondary); font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                            <i class='bx bx-group' style="font-size: 0.9rem; color: var(--secondary-color);"></i> ${t('Customers', 'ग्राहक')}
                        </div>
                        <div style="font-size: 1.6rem; font-weight: 900; letter-spacing: -0.04em;">${DashboardView.formatNum(totalCustomers)}</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; margin-top: 0.3rem; opacity: 0.8;">${t('Total Base', 'कुल ग्राहक')}</div>
                    </div>
                    
                    <!-- Active Customers -->
                    <div class="glass-panel motion-slide-up motion-stagger-2" style="padding: 1.4rem; flex: 1;">
                        <div style="color: var(--text-secondary); font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                            <i class='bx bx-trending-up' style="font-size: 0.9rem; color: var(--success-color);"></i> ${t('Active', 'सक्रिय')}
                        </div>
                        <div style="font-size: 1.6rem; font-weight: 900; color: var(--success-color); letter-spacing: -0.04em;">${DashboardView.formatNum(activeCustomers)}</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; margin-top: 0.3rem; opacity: 0.8;">${t('Active Now', 'अभी सक्रिय')}</div>
                    </div>
                    
                    <!-- Health Score -->
                    <div class="glass-panel motion-slide-up motion-stagger-2" style="padding: 1.4rem; border-bottom: 4px solid ${healthColor}; flex: 1;">
                        <div style="color: var(--text-secondary); font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                            <i class='bx bx-pulse' style="font-size: 0.9rem;"></i> ${t('Health', 'स्वास्थ्य')}
                        </div>
                        <div style="font-size: 1.6rem; font-weight: 900; color: ${healthColor};">
                            ${healthScore}<span style="font-size: 0.9rem; color: var(--text-secondary); opacity: 0.5;">/100</span>
                        </div>
                        <div style="font-size: 0.7rem; color: ${healthColor}; font-weight: 700; margin-top: 0.3rem;">
                            ${healthScore >= 80 ? t('Excellent', 'उत्कृष्ट') : healthScore > 50 ? t('Good', 'अच्छा') : t('Needs Attention', 'ध्यान दें')}
                        </div>
                    </div>
                </div>

                <!-- Credit Risk / High Risk Alerts -->
                ${(kpis.high_risk_count > 0 || kpis.credit_exposure > 5000 || kpis.total_credit > 2000) ? `
                <div class="card animate-fadeIn" style="background: hsla(0, 84%, 60%, 0.08); border: 1px solid hsla(0, 84%, 60%, 0.2); padding: 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
                    <i class='bx bxs-error-alt' style="color: var(--danger-color); font-size: 2rem;"></i>
                    <div style="flex: 1;">
                        <div style="font-weight: 800; color: var(--danger-color); font-size: 0.95rem;">
                            ${actualMode === 'rural' ? t('High Multi-User Credit Risk', 'उच्च क्रेडिट जोखिम') : t('Significant Credit Exposure', 'क्रेडिट एक्सपोजर')}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-primary); font-weight: 600; margin-top: 0.2rem;">
                            ${actualMode === 'rural' 
                                ? t(`Found ${kpis.high_risk_count} customers with >₹5,000 pending. Total: ₹${DashboardView.formatNum(kpis.total_credit)}`, `${kpis.high_risk_count} ग्राहकों के पास ₹5,000 से अधिक बकाया है।`) 
                                : t(`Total credit exposure is ₹${DashboardView.formatNum(kpis.credit_exposure)}. Recommend immediate recovery actions.`, `कुल क्रेडिट एक्सपोजर ₹${DashboardView.formatNum(kpis.credit_exposure)} है।`)}
                        </div>
                    </div>
                    <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.75rem;" onclick="window.switchTab('customers')">
                        ${t('View List', 'सूची देखें')}
                    </button>
                </div>
                ` : ''}

                <!-- AI Strategy Insights -->
                ${advisor.length > 0 ? `
                <section style="margin-top: 2rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
                        <i class='bxs-magic-wand' style='color: var(--secondary-color); font-size: 1.4rem;'></i>
                        <h2 style="font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em;">${t('Strategy Insights', 'रणनीति अंतर्दृष्टि')}</h2>
                    </div>
                    ${advisor.map(item => `
                        <div class="card animate-fadeIn" style="border-left: 4px solid var(--secondary-color); background: linear-gradient(to right, var(--primary-light), transparent); padding: 1.5rem;">
                            <h4 style="color: var(--secondary-color); margin-bottom: 0.75rem; font-size: 1rem; font-weight: 800;">
                                <i class='bx bxs-magic-wand' style="font-size: 1rem;"></i> ${item.summary}
                            </h4>
                            <p style="font-size: 0.9rem; color: var(--text-primary); line-height: 1.7; margin-bottom: 1.25rem;">${item.problem}</p>
                            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                                ${item.recommendations.map(rec => `
                                    <div style="display: flex; gap: 0.75rem; background: var(--surface-color); padding: 0.85rem 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
                                        <i class='bx bx-check-circle' style='color: var(--success-color); font-size: 1.1rem; margin-top: 0.1rem; flex-shrink:0;'></i>
                                        <span style="font-size: 0.88rem; font-weight: 600; line-height: 1.5;">${rec}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </section>
                ` : `
                <div class="card" style="margin-top: 2rem; text-align: center; padding: 3rem; background: var(--bg-color); border: 2px dashed var(--border-color);">
                    <i class='bx bx-brain' style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <h3 style="font-size: 1.1rem; color: var(--text-secondary);">${t('AI Analysis Pending', 'AI विश्लेषण प्रतीक्षित')}</h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">${t('Upload your business data to generate real-time growth strategies.', 'रियल-टाइम विकास रणनीति बनाने के लिए अपना व्यापार डेटा अपलोड करें।')}</p>
                    <button class="btn btn-premium" style="margin-top: 1.5rem;" onclick="switchTab('data')">
                        <i class='bx bx-upload'></i> ${t('Upload Data', 'डेटा अपलोड करें')}
                    </button>
                </div>
                `}
        `;

        // Mode-specific charts
        if (actualMode === 'urban') {
            html += DashboardView.renderUrbanChartsHTML(data.segments);
        } else {
            // Rural: We now pass the synthesized credit stats from KPIs if detailed segments aren't there
            html += DashboardView.renderRuralChartsHTML({
                total_pending: kpis.total_credit || 0,
                with_credit: kpis.credit_customers || 0,
                without_credit: (kpis.total_customers || 0) - (kpis.credit_customers || 0)
            });
        }

        html += `</div>`; 
        container.innerHTML = html;

        // ── Initialize Plotly AFTER DOM is updated ─────────────────────────────
        // Must do this after innerHTML is set — never inject <script> into innerHTML
        if (actualMode === 'urban' && data.segments) {
            DashboardView.initUrbanCharts(data.segments);
        }
    }

    // ── Format large numbers (1200 → 1.2K, 1500000 → 1.5L) ───────────────────
    static formatNum(num) {
        if (!num) return '0';
        if (num >= 10000000) return (num / 10000000).toFixed(1) + 'Cr';
        if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.round(num).toLocaleString('en-IN');
    }

    // ── Urban: Return HTML structure only (no script tag) ─────────────────────
    static renderUrbanChartsHTML(segments) {
        // Feature removed as per request to remove blank space segmentation
        return '';
    }

    // ── Urban: Init Plotly AFTER HTML is in DOM ────────────────────────────────
    static initUrbanCharts(segments) {
        // Wait for Plotly to be available (it's deferred)
        const tryPlot = (attempts = 0) => {
            const el = document.getElementById('segment-chart');
            if (!el) return; // View was navigated away
            
            if (typeof Plotly === 'undefined') {
                if (attempts < 20) setTimeout(() => tryPlot(attempts + 1), 300);
                return;
            }

            // Use REAL segment data if available, else show a sensible distribution
            let labels, values;
            if (segments && typeof segments === 'object') {
                labels = Object.keys(segments);
                values = Object.values(segments);
            } else {
                // No data uploaded yet — show placeholder legend
                labels = ['Champions', 'Loyal', 'At Risk', 'Lost'];
                values = [40, 25, 20, 15];
            }

            const isDark = localStorage.getItem('app_theme') !== 'light';
            const fontColor = isDark ? '#cdd5e0' : '#374151';

            Plotly.newPlot('segment-chart', [{
                values: values,
                labels: labels,
                type: 'pie',
                hole: 0.58,
                marker: {
                    colors: ['#6366f1', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#06b6d4']
                },
                textinfo: 'none',
                hovertemplate: '<b>%{label}</b><br>%{percent:.1%}<br>%{value} customers<extra></extra>'
            }], {
                margin: { t: 10, b: 30, l: 10, r: 10 },
                showlegend: true,
                legend: { 
                    orientation: 'h', 
                    y: -0.15,
                    font: { family: 'Inter', size: 11, color: fontColor }
                },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { family: 'Inter', size: 12, color: fontColor }
            }, { 
                displayModeBar: false,
                responsive: true
            });
        };

        // Small delay to ensure the DOM is fully rendered
        setTimeout(tryPlot, 100);
    }

    // ── Rural: Cash vs Credit flow chart ──────────────────────────────────────
    static renderRuralChartsHTML(credit) {
        if (!credit) return '';
        const isHindi = localStorage.getItem('lang') === 'hi';
        
        const withCredit = credit.with_credit || 0;
        const withoutCredit = credit.without_credit || 0;
        const totalCustomers = withCredit + withoutCredit;
        
        let cashPct = 100, creditPct = 0;
        if (totalCustomers > 0) {
            creditPct = Math.round((withCredit / totalCustomers) * 100);
            cashPct = 100 - creditPct;
        }
        
        const pendingAmount = (credit.total_pending || 0);
        
        return `
            <div class="card" style="margin-top: 1.5rem; padding: 1.5rem; margin-bottom: 0;">
                <h3 style="margin-bottom: 1.5rem; font-weight: 800; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class='bx bx-line-chart' style="color: var(--primary-color);"></i>
                    ${isHindi ? 'नकद बनाम उधार प्रवाह' : 'Cash vs Credit Flow'}
                </h3>
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- Cash Payments Bar -->
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size: 0.82rem; margin-bottom: 0.6rem; font-weight: 800;">
                            <span style="display: flex; align-items: center; gap: 0.4rem;">
                                <span style="width:10px; height:10px; background: var(--success-color); border-radius: 50%; display: inline-block;"></span>
                                ${isHindi ? 'नकद भुगतान' : 'Cash Payments'}
                            </span>
                            <span style="color: var(--success-color);">${cashPct}%</span>
                        </div>
                        <div style="height: 12px; background: var(--border-color); border-radius: 6px; overflow: hidden;">
                            <div style="width: ${cashPct}%; height: 100%; background: linear-gradient(90deg, var(--success-color), hsl(158, 60%, 55%)); border-radius: 6px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.35rem; font-weight: 600;">${withoutCredit} ${isHindi ? 'ग्राहकों ने नकद भुगतान किया' : 'customers paid cash'}</div>
                    </div>
                    
                    <!-- Udhaar Bar -->
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size: 0.82rem; margin-bottom: 0.6rem; font-weight: 800;">
                            <span style="display: flex; align-items: center; gap: 0.4rem;">
                                <span style="width:10px; height:10px; background: var(--danger-color); border-radius: 50%; display: inline-block;"></span>
                                ${isHindi ? 'उधार (क्रेडिट)' : 'Udhaar (Credit)'}
                            </span>
                            <span style="color: var(--danger-color);">${creditPct}%</span>
                        </div>
                        <div style="height: 12px; background: var(--border-color); border-radius: 6px; overflow: hidden;">
                            <div style="width: ${creditPct}%; height: 100%; background: linear-gradient(90deg, var(--danger-color), hsl(0, 70%, 70%)); border-radius: 6px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.35rem; font-weight: 600;">${withCredit} ${isHindi ? 'उधार में हैं' : 'customers on credit'} • <span style="color: var(--warning-color); font-weight: 800;">₹${pendingAmount.toLocaleString('en-IN')} ${isHindi ? 'बकाया' : 'pending'}</span></div>
                    </div>
                    
                    ${pendingAmount > 0 ? `
                    <!-- Pending Summary Card -->
                    <div style="background: hsla(38, 92%, 50%, 0.08); border: 1px solid hsla(38, 92%, 50%, 0.2); border-radius: 14px; padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
                        <i class='bx bx-error-circle' style="color: var(--warning-color); font-size: 1.5rem; flex-shrink: 0;"></i>
                        <div>
                            <div style="font-size: 0.82rem; font-weight: 800; color: var(--warning-color);">₹${pendingAmount.toLocaleString('en-IN')} ${isHindi ? 'वसूलने के लिए' : 'to collect'}</div>
                            <div style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 600; margin-top: 0.15rem;">${isHindi ? 'ग्राहकों से संपर्क करें — उधार वसूलें' : 'Follow up with customers to collect Udhaar'}</div>
                        </div>
                        <button onclick="switchTab('customers')" style="margin-left: auto; background: var(--warning-color); color: white; border: none; padding: 0.45rem 0.9rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; flex-shrink: 0;">
                            ${isHindi ? 'देखें' : 'View'}
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static toggleLang() {
        const curr = localStorage.getItem('lang') === 'hi' ? 'en' : 'hi';
        localStorage.setItem('lang', curr);
        window.initApp();
    }
}

window.DashboardView = DashboardView;
