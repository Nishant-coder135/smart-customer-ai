class DataIngestView {
    static render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const isHindi = localStorage.getItem('lang') === 'hi';
        const t = (en, hi) => isHindi ? hi : en;
        
        const container = document.getElementById(containerId || 'main-content');
        
        // Reset container and add subtle fade-in
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <h1 style="margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;">
                    <i class='bx bx-data text-gradient' style="font-size: 2.2rem;"></i>
                    ${t('Data Management', 'डेटा प्रबंधन')}
                </h1>
                
        `;

        
        // Initial Fetch for Cloud History (Rural Only)
        if (mode === 'rural') {
            setTimeout(() => {
                this.fetchCloudTransactions();
            }, 100);
        }
        
        let htmlContent = '';
        if (mode === 'urban') {
            htmlContent = `
                <div class="card premium-card">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="width: 48px; height: 48px; background: var(--primary-light); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary-color);">
                            <i class='bx bx-cloud-upload' style="font-size: 1.75rem;"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 1.25rem;">${t('Sync CSV Records', 'CSV डेटा सिंक')}</h3>
                            <p style="color: var(--text-secondary); font-size: 0.85rem;">${t('Enterprise Retail Data Format', 'एंटरप्राइज रिटेल डेटा फॉर्मेट')}</p>
                        </div>
                    </div>
                    
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.6;">
                        ${t('Requirements: CSV file with CustomerID, InvoiceDate, Quantity, and UnitPrice.', 'आवश्यकता: CustomerID, InvoiceDate, Quantity, और UnitPrice के साथ CSV फ़ाइल।')}
                    </p>
                    
                    <div id="drop-zone" style="border: 2px dashed var(--border-color); padding: 3rem 2rem; text-align: center; border-radius: 20px; margin-bottom: 1.5rem; cursor: pointer; position: relative; transition: all 0.2s; background: var(--bg-color);">
                        <div id="upload-icon" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem; transition: transform 0.2s;">📄</div>
                        <div id="file-label" style="font-weight: 600; color: var(--text-primary);">${t('Drop file here or click to select', 'फ़ाइल यहाँ छोड़ें या चयन करने के लिए क्लिक करें')}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">Maximum file size: 50MB</div>
                        <input type="file" id="csv-file" accept=".csv" style="opacity: 0; position: absolute; top:0; left:0; width:100%; height:100%; cursor: pointer;" onchange="DataIngestView.handleFileSelect(this)">
                    </div>
                    
                    <button class="btn btn-premium" id="upload-btn" style="width: 100%; height: 3.5rem;" onclick="DataIngestView.submitUpload()">
                        <i class='bx bx-rocket' style="margin-right: 0.5rem;"></i> ${t('Analyze & Ingest Data', 'डेटा का विश्लेषण और सेवन करें')}
                    </button>
                    

                    
                    <div id="upload-status" style="margin-top: 1.5rem; text-align: center;"></div>
                    
                    <div style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem;">
                        <div>
                            <h4 style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.25rem;">🚪 Account Session</h4>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Switch to another business profile or sign out.</p>
                            <button class="btn btn-secondary" style="font-size: 0.85rem; width: 100%;" onclick="window.handleLogout()">Logout / Switch Account</button>
                        </div>
                        
                        <div style="margin-top: 0.5rem;">
                            <h4 style="color: var(--danger-color); font-size: 0.9rem; margin-bottom: 0.25rem;">⚠️ Danger Zone</h4>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Permanently remove all business insight data. This action is IRREVERSIBLE.</p>
                            <button class="btn btn-danger" style="font-size: 0.85rem; width: 100%;" onclick="DataIngestView.resetData()">Reset Workspace</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            htmlContent = `
                <div class="card premium-card">
                    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class='bx bx-book-add' style="color: var(--primary-color);"></i>
                        ${t('Sales Entry Form', 'बिक्री प्रविष्टि फॉर्म')}
                    </h3>
                    
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>${t('Customer Name', 'ग्राहक का नाम')}</label>
                                <input type="text" id="r-customer" class="form-control" placeholder="e.g. Ramesh Kumar">
                            </div>
                            <div class="form-group">
                                <label>${t('Global Key / Phone', 'ग्लोबल की / फोन')}</label>
                                <input type="text" id="r-global-key" class="form-control" placeholder="Optional for cross-sync">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>${t('Amount (₹)', 'राशि (₹)')}</label>
                            <input type="number" id="r-amount" class="form-control" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label>${t('Item/Notes (Optional)', 'आइटम/नोट्स (वैकल्पिक)')}</label>
                            <input type="text" id="r-notes" class="form-control" placeholder="e.g. 5kg Wheat, Soap">
                        </div>
                <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0;">
                    <input type="checkbox" id="r-credit" style="width: 22px; height: 22px; cursor: pointer;">
                    <label for="r-credit" style="font-weight: 600; font-size: 0.95rem; cursor: pointer;">${t('Credit (Udhaar)?', 'क्रेडिट (उधार)?')}</label>
                </div>
                        <button class="btn btn-premium" style="width: 100%; height: 3.5rem;" onclick="DataIngestView.saveRuralOffline()">
                            <i class='bx bx-save'></i> ${t('Log Transaction', 'लेनदेन दर्ज करें')}
                        </button>
                    </div>
                    
                    <div style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                        <h4 style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.25rem;">🚪 Account Session</h4>
                        <p style="font-size: 0.80rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Switch business profiles or sign out of this enterprise.</p>
                        <button class="btn btn-secondary" style="font-size: 0.85rem; width: 100%;" onclick="window.handleLogout()">Logout / Switch Account</button>
                    </div>
                    
                    <div id="offline-list" style="margin-top: 2.5rem;"></div>
                    
                    <div id="sync-hub" style="margin-top: 3.5rem; padding-top: 2rem; border-top: 2px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h3 style="display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                                <i class='bx bx-cloud' style="color: var(--secondary-color);"></i>
                                ${t('Cloud History', 'क्लाउड इतिहास')}
                            </h3>
                            <div style="position: relative;">
                                <input type="text" id="r-search" class="form-control" placeholder="${t('Search by ID...', 'खोजें...')}" style="padding-right: 2.5rem; height: 2.5rem; font-size: 0.85rem;" onkeyup="DataIngestView.performSearch()">
                                <i class='bx bx-search' style="position: absolute; right: 0.75rem; top: 0.6rem; color: var(--text-secondary);"></i>
                            </div>
                        </div>
                        <div id="cloud-list"></div>
                    </div>
                </div>

                <div class="card" style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class='bx bx-cloud-lightning' style="color: var(--secondary-color);"></i>
                        ${t('Cloud Sync Hub', 'क्लाउड सिंक हब')}
                    </h3>
                    <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">
                        <input type="text" id="r-search" class="form-control" style="flex: 1;" placeholder="${t('Search synced customers...', 'सिंक किए गए ग्राहक खोजें...')}" oninput="if(this.value.trim() === '') DataIngestView.performSearch()" onkeydown="if(event.key==='Enter') DataIngestView.performSearch()">
                        <button class="btn btn-primary" onclick="DataIngestView.performSearch()" style="width: 3.5rem; padding: 0;"><i class='bx bx-search'></i></button>
                    </div>
                    <div id="cloud-list" style="max-height: 450px; overflow-y: auto;">
                        <!-- Auto-loaded via script below -->
                        <div style="text-align: center; padding: 2rem;"><div class="loader" style="margin: 0 auto;"></div></div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML += htmlContent + `</div>`;
        
        if (mode === 'rural') {
            DataIngestView.renderOfflineList();
            // Auto-load cloud records on render
            setTimeout(() => DataIngestView.renderCloudList(), 100);
        }
    }

    static handleFileSelect(input) {
        const label = document.getElementById('file-label');
        const icon = document.getElementById('upload-icon');
        const dropZone = document.getElementById('drop-zone');
        
        if (input.files[0]) {
            label.innerText = input.files[0].name;
            icon.innerText = '📊';
            icon.style.transform = 'scale(1.2) rotate(5deg)';
            dropZone.style.borderColor = 'var(--primary-color)';
            dropZone.style.background = 'var(--primary-light)';
        }
    }
    


    static async submitUpload() {

        const fileInput = document.getElementById('csv-file');
        const statusDiv = document.getElementById('upload-status');
        const btn = document.getElementById('upload-btn');
        
        if (!fileInput.files.length) {
            statusDiv.innerHTML = '<span style="color:var(--danger-color); font-size: 0.9rem; font-weight: 600;">⚠️ Please select a valid CSV file.</span>';
            return;
        }
        
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        
        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Processing ML Model...`;
        statusDiv.innerHTML = '';
        
        try {
            const token = localStorage.getItem('auth_token');
            const apiUrl = window.API_BASE ? `${window.API_BASE}/upload` : '/api/upload';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (response.ok) {
                // SUCCESS SPLASH!
                this.renderSuccessSplash("CSV Market Data Processed Successfully!");
            } else {
                if (response.status === 401) {
                    showToast("Session expired. Please sign in again.", "error");
                    setTimeout(() => window.handleLogout(), 1500);
                    return;
                }
                const result = await response.json();
                statusDiv.innerHTML = `<div class="card" style="background: hsla(0, 84%, 60%, 0.1); color: var(--danger-color); padding: 1rem; font-size: 0.85rem;">Error: ${result.detail || 'Failed processing'}</div>`;
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        } catch (e) {
            console.error("[CSV Ingest Error]", e);
            let msg = e.message || "Failed to reach ML server.";
            if (e instanceof SyntaxError || msg.includes('Unexpected')) {
                msg = "Server returned an invalid format. The file might be too large for a mobile connection causing a timeout, or the cloud backend exhausted its RAM.";
            }
            statusDiv.innerHTML = `<div class="card" style="background: hsla(0, 84%, 60%, 0.1); color: var(--danger-color); padding: 1rem; font-size: 0.85rem; text-align: left; line-height: 1.5;">
                <strong style="display:block; margin-bottom:0.25rem;">Upload Failed:</strong>
                ${msg}
                <br><br><small style="opacity: 0.8;">💡 <b>Tip for Mobile:</b> Try splitting the CSV into smaller chunks (e.g. 5MB chunks) if you are on a mobile network to prevent connection drops or server OOM errors.</small>
            </div>`;
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    static renderSuccessSplash(message) {
        const container = document.getElementById('main-content');
        container.innerHTML = `
            <div class="container success-splash-container animate-fadeIn">
                <div class="success-check-bubble">
                    <i class='bx bx-check'></i>
                </div>
                <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -0.04em;">${message}</h1>
                <p style="color: var(--text-secondary); margin-bottom: 2.5rem; max-width: 400px;">
                    Our AI has analyzed your transactions and generated a fresh strategy roadmap.
                </p>
                
                <button class="btn btn-premium" style="width: 100%; max-width: 320px; height: 3.75rem; font-size: 1.1rem;" onclick="DataIngestView.completeIngestion()">
                    <i class='bx bx-right-arrow-alt'></i> View Dashboard
                </button>
                
                <p style="margin-top: 2.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                    Full business unlocked. Press button to continue.
                </p>
            </div>
        `;
        window.scrollTo(0, 0);
    }

    static async completeIngestion() {
        // Unlock all nav items
        if (window.unlockApp) {
            await window.unlockApp();
        }

        // Switch to dashboard
        if (window.switchTab) {
            window.switchTab('dashboard');
        } else {
            window.location.reload();
        }

        // Explicitly force nav visible — critical on mobile where
        // the post-ingestion state can leave nav hidden.
        const forceNav = () => {
            const nav = document.getElementById('app-bottom-nav');
            if (nav) {
                nav.classList.add('nav-ready');
                nav.style.opacity = '1';
                nav.style.pointerEvents = 'auto';
            }
        };
        forceNav();               // immediate
        setTimeout(forceNav, 350);   // after switchTab's 300ms delay
        setTimeout(forceNav, 1000);  // after DashboardView async fetch
        setTimeout(forceNav, 2500);  // final guarantee for slow networks
    }

    static async resetData() {
        if (!confirm("Are you sure? This will permanently wipe your business records from our cloud database.")) return;
        
        try {
            const token = localStorage.getItem('auth_token');
            const apiUrl = window.API_BASE ? `${window.API_BASE}/reset` : '/api/reset';
            const response = await fetch(apiUrl, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                alert("Workspace Resetted. Restarting...");
                window.location.reload();
            } else {
                alert("Failed to reset database.");
            }
        } catch (e) {
            alert("Error connecting to server.");
        }
    }

    static saveRuralOffline() {
        const gKey = document.getElementById('r-global-key').value;
        const cust = document.getElementById('r-customer').value;
        const amt = document.getElementById('r-amount').value;
        const notes = document.getElementById('r-notes').value;
        const isCredit = document.getElementById('r-credit').checked;
        
        if (!cust || !amt) {
            alert("Record requires at least a Name and Amount.");
            return;
        }
        
        const record = {
            id: Date.now(),
            customer: cust,
            amount: parseFloat(amt),
            notes: notes,
            isCredit: isCredit,
            date: new Date().toISOString(),
            global_key: gKey
        };
        
        // Save to User-Specific Local Storage
        const userId = localStorage.getItem('sc_user_id') || 'anon';
        const key = `rural_sales_${userId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(record);
        localStorage.setItem(key, JSON.stringify(existing));
        
        // Reset form
        document.getElementById('r-customer').value = '';
        document.getElementById('r-global-key').value = '';
        document.getElementById('r-amount').value = '';
        document.getElementById('r-notes').value = '';
        document.getElementById('r-credit').checked = false;
        
        this.renderOfflineList();

        // AUTO SYNC TRIGGER
        console.log("[Rural] Triggering Auto-Sync...");
        this.syncRuralData();
    }
    
    static renderOfflineList() {
        const listDiv = document.getElementById('offline-list');
        if (!listDiv) return;
        
        const userId = localStorage.getItem('sc_user_id') || 'anon';
        const key = `rural_sales_${userId}`;
        const records = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (records.length === 0) {
            listDiv.innerHTML = `<p style="color: var(--text-secondary); text-align: center; border: 1px dashed var(--border-color); padding: 1.5rem; border-radius: 16px; font-size: 0.9rem;">No local records pending sync.</p>`;
            return;
        }
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                <h4 style="font-size: 1rem;">${records.length} Offline Items</h4>
                <button class="btn btn-primary" style="font-size: 0.75rem; padding: 0.5rem 1rem;" onclick="DataIngestView.syncRuralData()">
                    <i class='bx bx-cloud-upload'></i> Sync to Cloud
                </button>
            </div>
            <div style="max-height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem;">
        `;
        
        records.forEach(r => {
            html += `
                <div class="card" style="padding: 1rem; margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; background: hsla(210, 40%, 98%, 0.5);">
                    <div>
                        <div style="font-weight: 700;">${r.customer}</div>
                        ${r.notes ? `<div style="font-size: 0.7rem; color: var(--text-secondary);">${r.notes}</div>` : ''}
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${new Date(r.date).toLocaleDateString()}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 800; color: var(--primary-color);">₹${r.amount.toLocaleString()}</div>
                        ${r.isCredit ? '<span style="background: hsla(38, 92%, 50%, 0.1); color: var(--warning-color); font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">UDHAAR</span>' : '<span style="background: hsla(158, 77%, 42%, 0.1); color: var(--success-color); font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">PAID</span>'}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        listDiv.innerHTML = html;
    }

    static async syncRuralData() {
        const userId = localStorage.getItem('sc_user_id') || 'anon';
        const key = `rural_sales_${userId}`;
        const records = JSON.parse(localStorage.getItem(key) || '[]');
        if (records.length === 0) return;
        
        const syncBtn = document.querySelector('[onclick="DataIngestView.syncRuralData()"]');
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Syncing...`;
        }

        try {
            const token = localStorage.getItem('auth_token');
            const apiUrl = window.API_BASE ? `${window.API_BASE}/manual_entry` : '/api/manual_entry';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ records })
            });
            
            if (response.ok) {
                localStorage.setItem(key, '[]');
                this.renderOfflineList(); // Refresh list
                
                // Fetch cloud history to show the synced data
                this.fetchCloudTransactions();
                
                // FORCE Dashboard Refresh to clear "Zero" state
                if (window.ApiClient) {
                    window.ApiClient.getDashboardData(true, 'rural').catch(e => console.error("Post-sync dash refresh failed:", e));
                }
                
                // Show a non-blocking toast instead of a splash if it was an auto-sync
                console.log("Sync successful. Dashboard refresh triggered.");
            } else {
                alert("Sync failed: " + (await response.text()));
                if (syncBtn) {
                    syncBtn.disabled = false;
                    syncBtn.innerHTML = `<i class='bx bx-cloud-upload'></i> Sync to Cloud`;
                }
            }
        } catch (e) { 
            alert("Sync failed connecting to server."); 
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.innerHTML = `<i class='bx bx-cloud-upload'></i> Sync to Cloud`;
            }
        }
    }

    static async renderCloudList(search = "") {
        console.log("[Rural] Rendering cloud history...");
        await this.fetchCloudTransactions(search);
    }

    static async fetchCloudTransactions(search = "") {
        console.log("[Rural] Fetching cloud history...");
        const listDiv = document.getElementById('cloud-list');
        if (!listDiv) return;
        
        try {
            const token = localStorage.getItem('auth_token');
            const apiUrl = window.API_BASE ? `${window.API_BASE}/rural/transactions` : `/api/rural/transactions`;
            const response = await fetch(`${apiUrl}?search=${encodeURIComponent(search)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error("Fetch failed");
            const data = await response.json();
            const records = data.transactions;
            
            if (!records || records.length === 0) {
                listDiv.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 2rem; border: 1px dashed var(--border-color); border-radius: 16px;">${localStorage.getItem('lang') === 'hi' ? 'कोई क्लाउड रिकॉर्ड नहीं मिला।' : 'No cloud records found.'}</p>`;
                return;
            }
            
            let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
            records.forEach(r => {
                const dateStr = r.date ? new Date(r.date).toLocaleDateString() : 'N/A';
                html += `
                    <div class="card" style="padding: 1rem; margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--primary-color);">
                        <div>
                            <div style="font-weight: 700; font-size: 1rem;">${r.customer}</div>
                            ${r.notes ? `<div style="font-size: 0.75rem; color: var(--text-secondary); font-style: italic;">${r.notes}</div>` : ''}
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${dateStr}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; color: var(--primary-color);">₹${r.amount.toLocaleString()}</div>
                            ${r.isCredit ? '<span style="background: hsla(38, 92%, 50%, 0.1); color: var(--warning-color); font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">UDHAAR</span>' : '<span style="background: hsla(158, 77%, 42%, 0.1); color: var(--success-color); font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">PAID</span>'}
                        </div>
                    </div>
                `;
            });
            listDiv.innerHTML = html + "</div>";
        } catch (e) {
            console.error(e);
            listDiv.innerHTML = `<p style="color: var(--danger-color); text-align: center;">Error fetching cloud records. Please check connection.</p>`;
        }
    }

    static performSearch() {
        const val = document.getElementById('r-search').value;
        this.fetchCloudTransactions(val);
    }

    static async editRecord(id, oldAmount, oldIsCredit) {
        const amount = prompt("Update Transaction Amount (₹):", oldAmount);
        if (amount === null) return;
        
        const isCredit = confirm(`Is this Still Udhaar (Credit)?\n(OK = Yes, Cancel = No)`);
        
        try {
            await window.ApiClient.updateTransaction(id, {
                amount: parseFloat(amount),
                isCredit: isCredit
            });
            this.renderCloudList(document.getElementById('r-search').value);
        } catch (e) { alert("Update failed."); }
    }

    static async deleteRecord(id) {
        if (!confirm("Are you sure? This customer record will be deleted from history.")) return;
        try {
            await window.ApiClient.deleteTransaction(id);
            this.renderCloudList(document.getElementById('r-search').value);
        } catch (e) { alert("Delete failed."); }
    }
}

window.DataIngestView = DataIngestView;
