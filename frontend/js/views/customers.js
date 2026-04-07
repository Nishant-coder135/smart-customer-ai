class CustomersView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const isHindi = localStorage.getItem('lang') === 'hi';
        const t = (en, hi) => isHindi ? hi : en;
        
        const container = document.getElementById(containerId || 'main-content');
        const isRural = mode === 'rural';
        
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx bxs-group text-gradient' style="font-size: 2.5rem;"></i>
                        ${isRural ? t('Customer Ledger', 'ग्राहक बहीखाता') : t('Client Hub', 'क्लाइंट हब')}
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;">
                        ${isRural ? t('Your synced rural customers & Udhaar records', 'आपके सिंक किए गए ग्रामीण ग्राहक और उधार रिकॉर्ड') : t('Segmentation & AI Persona Management', 'विभाजन और AI व्यक्तित्व प्रबंधन')}
                    </p>
                </div>
                
                <div id="cust-summary-container"></div>
                
                <div class="card" style="padding: 0.75rem; margin-bottom: 2rem; border-radius: 18px; display: flex; gap: 0.75rem; align-items: center;">
                    <input
                        type="text"
                        id="cust-search"
                        class="form-control"
                        style="flex: 1; border: none; background: transparent; height: 3rem;"
                        placeholder="${t('Search names or IDs...', 'नाम या आईडी खोजें...')}"
                        oninput="CustomersView.onSearchInput(this.value)"
                        onkeydown="if(event.key==='Enter') CustomersView.performSearch()"
                    >
                    <button id="cust-clear-btn" onclick="CustomersView.clearSearch()" style="display:none; background: none; border: none; color: var(--text-secondary); font-size: 1.3rem; cursor: pointer; padding: 0 0.25rem; line-height: 1;" title="Clear search">
                        <i class='bx bx-x'></i>
                    </button>
                    <button class="btn btn-primary" onclick="CustomersView.performSearch()" style="width: 3.5rem; height: 3rem; padding: 0; flex-shrink: 0;"><i class='bx bx-search'></i></button>
                </div>
                
                <div id="cust-content" class="animate-fadeIn">
                    <div class="loader-container" style="text-align: center; padding: 3rem;">
                        <div class="loader"></div>
                        <p style="margin-top: 1.5rem; color: var(--text-secondary); font-weight: 600;">
                            ${isRural ? t('LOADING YOUR LEDGER...', 'आपका बहीखाता लोड हो रहा है...') : t('CALIBRATING SEGMENTS...', 'विभाजन अंशांकन कर रहा है...')}
                        </p>
                    </div>
                </div>
            </div>
        `;

        try {
            const data = await window.ApiClient.getCustomers('', mode);
            const customers = (data && data.customers) ? data.customers : [];
            
            if (customers.length === 0) {
                const content = document.getElementById('cust-content');
                if (content) {
                    content.innerHTML = `
                        <div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed; background: transparent; opacity: 0.8;">
                            <i class='bx bx-book-content' style="font-size: 3.5rem; color: var(--text-secondary); margin-bottom: 1.5rem; opacity: 0.5;"></i>
                            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">${t('Your Ledger is Empty', 'आपका बहीखाता खाली है')}</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 2rem;">
                                ${isRural ? t('Start by logging transactions in the Data tab.', 'डेटा टैब में लेनदेन दर्ज करना शुरू करें।') : t('Upload your retail data to see customer segments.', 'ग्राहक खंड देखने के लिए अपना रिटेल डेटा अपलोड करें।')}
                            </p>
                            <button class="btn btn-premium" onclick="switchTab('data')">
                                <i class='bx bx-plus'></i> ${isRural ? t('Add First Transaction', 'पहला लेनदेन जोड़ें') : t('Upload Data', 'डेटा अपलोड करें')}
                            </button>
                        </div>
                    `;
                }
            } else {
                CustomersView.renderCustomerList(customers, mode, 'cust-content');
                if (isRural) {
                    CustomersView.renderRuralSummary(customers);
                }
            }
        } catch (error) {
            const content = document.getElementById('cust-content');
            if (content) {
                content.innerHTML = `
                    <div class="card animate-fadeIn" style="text-align: center; padding: 3rem 2rem; border: 2px dashed var(--border-color);">
                        <div style="width: 72px; height: 72px; background: var(--primary-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: var(--primary-color);">
                            <i class='bx bx-user-plus' style="font-size: 2.5rem;"></i>
                        </div>
                        <h3 style="font-size: 1.2rem; font-weight: 800;">No Customers Yet</h3>
                        <p style="color: var(--text-secondary); margin-top: 0.75rem; font-size: 0.9rem; line-height: 1.6;">
                            ${isRural ? t('Add customer transactions via the Sync tab to see them here.', 'उन्हें यहाँ देखने के लिए सिंक टैब के माध्यम से ग्राहक लेनदेन जोड़ें।') : t('Upload your CSV data to populate your customer base.', 'अपने ग्राहक आधार को भरने के लिए अपना CSV डेटा अपलोड करें।')}
                        </p>
                        <button class="btn btn-premium" style="margin-top: 1.5rem;" onclick="switchTab('data')">
                            <i class='bx bx-upload'></i> ${isRural ? t('Log Transaction', 'लेनदेन दर्ज करें') : t('Upload Data', 'डेटा अपलोड करें')}
                        </button>
                    </div>
                `;
            }
        }
    }

    static renderRuralSummary(customers) {
        const container = document.getElementById('cust-summary-container');
        if (!container) return;
        const isHindi = localStorage.getItem('lang') === 'hi';
        const t = (en, hi) => isHindi ? hi : en;

        const totalUdhaarCustomers = customers.filter(c => c.udhaar > 0).length;
        const totalUdhaarTxns = customers.reduce((sum, c) => sum + (c.udhaar || 0), 0);

        if (totalUdhaarCustomers === 0) return;

        container.innerHTML = `
            <div class="card animate-fadeIn" style="background: hsla(38, 92%, 50%, 0.1); border: 1px solid hsla(38, 92%, 50%, 0.2); padding: 1.25rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem;">
                <div style="width: 48px; height: 48px; background: var(--warning-color); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
                    <i class='bx bx-error-circle'></i>
                </div>
                <div>
                    <h4 style="color: var(--warning-color); font-weight: 800; font-size: 1rem;">
                        ${totalUdhaarCustomers} ${t('Customers with Outstanding Udhaar', 'बकाया उधार वाले ग्राहक')}
                    </h4>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">
                        ${t('Total unpaid records:', 'कुल भुगतान न किए गए रिकॉर्ड:')} ${totalUdhaarTxns}
                    </p>
                </div>
            </div>
        `;
    }

    static renderCustomerList(customers, mode, contentId) {
        const content = document.getElementById(contentId);
        if (!content) return;
        const isRural = mode === 'rural';
        const isHindi = localStorage.getItem('lang') === 'hi';
        const t = (en, hi) => isHindi ? hi : en;

        if (!customers || customers.length === 0) {
            content.innerHTML = `
                <div class="card animate-fadeIn" style="text-align: center; padding: 3rem 2rem; border: 2px dashed var(--border-color); background: var(--bg-color);">
                    <i class='bx bx-user-x' style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--text-secondary);">${t('No customer records found', 'कोई ग्राहक रिकॉर्ड नहीं मिला')}</h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        ${isRural ? t('Log transactions via Sync tab to build your customer list.', 'अपनी ग्राहक सूची बनाने के लिए सिंक टैब के माध्यम से लेनदेन दर्ज करें।') : t('Upload CSV to populate records.', 'रिकॉर्ड भरने के लिए CSV अपलोड करें।')}
                    </p>
                    <button class="btn btn-premium" style="margin-top: 1.5rem;" onclick="switchTab('data')">
                        <i class='bx bx-plus'></i> ${isRural ? t('Add Transaction', 'लेनदेन जोड़ें') : t('Upload Data', 'डेटा अपलोड करें')}
                    </button>
                </div>`;
            return;
        }

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                <h2 style="font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary);">
                    ${customers.length} ${isRural ? t('Customers Found', 'ग्राहक मिले') : t('Profiles Found', 'प्रोफ़ाइल मिलीं')}
                </h2>
                ${isRural ? `<span style="font-size: 0.7rem; color: var(--warning-color); font-weight: 700; background: hsla(38,92%,50%,0.1); padding: 0.3rem 0.65rem; border-radius: 20px;"><i class='bx bx-store'></i> Rural Mode</span>` : ''}
            </div>
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        `;

        customers.forEach(c => {
            const segment = c.segment || c.segment_name || 'New';
            let segColor = 'var(--primary-color)';
            if (segment.includes('VIP')) segColor = 'var(--success-color)';
            if (segment.includes('Risk') || segment.includes('Churn')) segColor = 'var(--warning-color)';
            if (segment.includes('Lost')) segColor = 'var(--danger-color)';

            const hasUdhaar = isRural && ((c.udhaar || 0) > 0);
            const gridCols = isRural && hasUdhaar ? '1fr 1fr 1fr' : '1fr 1fr';

            html += `
                <div class="card animate-fadeIn premium-card" style="border-left: 5px solid ${segColor}; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <div>
                            <h3 style="font-size: 1.2rem; font-weight: 850; letter-spacing: -0.02em;">${c.customer_id}</h3>
                            <div style="display: flex; gap: 0.5rem; margin-top: 0.4rem; flex-wrap: wrap;">
                                <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: ${segColor}; background: ${segColor}22; padding: 0.2rem 0.5rem; border-radius: 6px;">${segment}</span>
                                ${hasUdhaar ? `<span style="font-size: 0.7rem; font-weight: 700; color: var(--warning-color); background: hsla(38, 92%, 50%, 0.12); padding: 0.2rem 0.5rem; border-radius: 6px;"><i class='bx bx-error-alt'></i> UDHAAR</span>` : ''}
                                ${c.is_high_risk ? `<span style="font-size: 0.7rem; font-weight: 700; color: var(--danger-color); background: hsla(0, 84%, 60%, 0.12); padding: 0.2rem 0.5rem; border-radius: 6px; border: 1px solid hsla(0, 84%, 60%, 0.2);"><i class='bx bxs-alarm-exclamation'></i> ${t('HIGH RISK', 'उच्च जोखिम')}</span>` : ''}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.3rem; font-weight: 900; color: var(--text-primary);">₹${Math.round(c.monetary || 0).toLocaleString()}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">${t('Total Value', 'कुल मूल्य')}</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: ${gridCols}; gap: 1rem; margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
                        <div style="background: var(--bg-color); padding: 0.75rem; border-radius: 12px; text-align: center;">
                            <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">${t('Visits', 'यात्राएं')}</div>
                            <div style="font-size: 1.05rem; font-weight: 800;">${c.frequency || 0}</div>
                        </div>
                        <div style="background: var(--bg-color); padding: 0.75rem; border-radius: 12px; text-align: center;">
                            <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">${t('Last Visit', 'पिछली यात्रा')}</div>
                            <div style="font-size: 1.05rem; font-weight: 800;">${c.recency || 0}d ${t('ago', 'पहले')}</div>
                        </div>
                        ${hasUdhaar ? `
                        <div style="background: hsla(38, 92%, 50%, 0.08); padding: 0.75rem; border-radius: 12px; text-align: center; border: 1px solid hsla(38, 92%, 50%, 0.2);">
                            <div style="font-size: 0.65rem; color: var(--warning-color); font-weight: 800; text-transform: uppercase;">${t('Udhaar Txns', 'उधार लेनदेन')}</div>
                            <div style="font-size: 1.05rem; font-weight: 800; color: var(--warning-color);">${c.udhaar}</div>
                        </div>` : ''}
                    </div>
                    
                    ${isRural ? `
                    <div style="margin-top: 1.25rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn" style="padding: 0.5rem 1rem; font-size: 0.75rem; background: var(--bg-color); border: 1px solid var(--border-color);" onclick="switchTab('data')">
                            <i class='bx bx-history'></i> ${t('View Ledger', 'बहीखाता देखें')}
                        </button>
                        <button class="btn" style="padding: 0.5rem 1rem; font-size: 0.75rem; background: var(--primary-light); color: var(--primary-color);" onclick="switchTab('advisor')">
                            <i class='bx bx-brain'></i> ${t('Ask AI', 'AI से पूछें')}
                        </button>
                    </div>` : ''}
                </div>
            `;
        });

        html += `</div>`;
        content.innerHTML = html;
    }

    static onSearchInput(value) {
        // Show/hide the ✕ clear button
        const clearBtn = document.getElementById('cust-clear-btn');
        if (clearBtn) clearBtn.style.display = value.length > 0 ? 'block' : 'none';

        // Auto-refresh when search box is cleared
        if (value.trim() === '') {
            CustomersView.performSearch();
        }
    }

    static clearSearch() {
        const input = document.getElementById('cust-search');
        const clearBtn = document.getElementById('cust-clear-btn');
        if (input) input.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        CustomersView.performSearch();
        if (input) input.focus();
    }

    static async performSearch() {
        const input = document.getElementById('cust-search');
        const query = input ? input.value.trim() : '';
        const mode = localStorage.getItem('businessMode') || 'urban';
        const content = document.getElementById('cust-content');
        
        content.innerHTML = `<div class="loader-container" style="text-align:center; padding: 2rem;"><div class="loader"></div></div>`;
        
        try {
            const data = await window.ApiClient.getCustomers(query, mode);
            this.renderCustomerList(data.customers, mode, 'cust-content');
        } catch (e) {
            content.innerHTML = `<p style="color:var(--danger-color); text-align:center; padding: 2rem;">Search failed. Try again.</p>`;
        }
    }
}

window.CustomersView = CustomersView;
