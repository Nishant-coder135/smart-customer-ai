if (!window.AnomalyView) {
    class AnomalyView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');
        if (!container) return;

        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
                    <div>
                        <h1 style="margin-bottom: 0.25rem;">Anomaly Radar</h1>
                        <p style="color: var(--text-secondary); font-weight: 600;">Hardware-accelerated pattern recognition</p>
                    </div>
                </div>

                <div class="card premium-card" style="margin-bottom: 2rem; border-color: var(--primary-color);">
                    <div style="display:flex; align-items:center; gap: 1.5rem;">
                        <div class="radar-ping"></div>
                        <div style="flex:1;">
                            <h3 style="margin-bottom:0.25rem;">Live System Scan</h3>
                            <p style="font-size: 0.85rem; color: var(--text-secondary);">Monitoring 4,821 data points for consistency…</p>
                        </div>
                        <button class="btn btn-primary" id="scan-btn" onclick="AnomalyView.runScan()">
                            <i class='bx bx-search-alt'></i> Check Now
                        </button>
                    </div>
                </div>

                <div class="business-grid">
                    <div class="card premium-card animate-fadeIn" style="border-left: 4px solid #ef4444;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                            <span class="badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">CRITICAL</span>
                            <i class='bx bx-error-circle' style="font-size: 1.5rem; color: #ef4444;"></i>
                        </div>
                        <h4 style="margin-bottom:0.5rem;">VIP Fatigue Spike</h4>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">8 top-tier customers show sudden drop in purchase frequency since Holi.</p>
                        <div style="display:flex; gap: 0.5rem;">
                            <button class="btn" style="padding: 0.4rem 0.8rem; font-size:0.75rem; background: var(--bg-color);" onclick="window.switchTab('advisor')">Fix with AI</button>
                            <button class="btn" style="padding: 0.4rem 0.8rem; font-size:0.75rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border:none;" onclick="AnomalyView.sendAlert('vip-alert')">Alert Team</button>
                        </div>
                    </div>

                    <div class="card premium-card animate-fadeIn" style="border-left: 4px solid #f59e0b; animation-delay: 0.1s;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                            <span class="badge" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">MEDIUM</span>
                            <i class='bx bx-sort-down' style="font-size: 1.5rem; color: #f59e0b;"></i>
                        </div>
                        <h4 style="margin-bottom:0.5rem;">Negative Margin Alert</h4>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">SKU #929 (Handlooms) is currently selling below acquisition cost.</p>
                        <div style="display:flex; gap: 0.5rem;">
                            <button class="btn" style="padding: 0.4rem 0.8rem; font-size:0.75rem; background: var(--bg-color);" onclick="AnomalyView.markSafe('sku-929')">Ignore SKU</button>
                            <button class="btn" style="padding: 0.4rem 0.8rem; font-size:0.75rem; background: var(--primary-color); color:white; border:none;" id="sku-929" onclick="AnomalyView.markSafe('sku-929')">Fixed</button>
                        </div>
                    </div>

                    <div class="card premium-card animate-fadeIn" style="border-left: 4px solid #3b82f6; animation-delay: 0.2s;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                            <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">LOW</span>
                            <i class='bx bx-id-card' style="font-size: 1.5rem; color: #3b82f6;"></i>
                        </div>
                        <h4 style="margin-bottom:0.5rem;">Duplicate Records</h4>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">14 customers share identical phone numbers but unique IDs.</p>
                        <div style="display:flex; gap: 0.5rem;">
                            <button class="btn" style="padding: 0.4rem 0.8rem; font-size:0.75rem; background: var(--bg-color);" onclick="window.switchTab('quality')">Merge View</button>
                        </div>
                    </div>
                </div>

                <div class="card premium-card" style="margin-top:2rem; background: linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(124,58,237,0.05) 100%);">
                    <h3 style="margin-bottom: 1rem;">Diagnosis History</h3>
                    <div style="display:flex; border-bottom: 1px solid var(--border-color); padding: 0.75rem 0; font-size: 0.8rem; color: var(--text-secondary); font-weight: 800;">
                        <div style="flex:1;">TIMESTAMP</div>
                        <div style="flex:2;">SYSTEM NODE</div>
                        <div style="flex:1;">RESULT</div>
                    </div>
                    ${[
                        ['10:42 AM', 'Revenue Cluster', 'CLEAN'],
                        ['09:15 AM', 'Inventory Sync', 'RESOLED'],
                        ['08:02 AM', 'API Integrity', 'CLEAN']
                    ].map(row => `
                        <div style="display:flex; border-bottom: 1px solid var(--border-color); padding: 0.75rem 0; font-size: 0.85rem; font-weight:600;">
                            <div style="flex:1; opacity:0.6;">${row[0]}</div>
                            <div style="flex:2;">${row[1]}</div>
                            <div style="flex:1; color: var(--success-color); font-weight:800;">${row[2]}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    static sendAlert(type) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification active';
        toast.style.background = 'var(--success-color)';
        toast.innerHTML = `✅ Win-back message sent to VIP customers via WhatsApp`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    static markSafe(id) {
        const btn = document.getElementById(id);
        if (!btn) return;
        const card = btn.closest('.card');
        btn.innerHTML = '<i class="bx bx-check-circle"></i> Dismissed';
        btn.style.color = 'var(--success-color)';
        btn.style.borderColor = 'var(--success-color)';
        card.style.opacity = '0.45';
        card.style.transition = 'opacity 0.4s';
    }

    static runScan() {
        const btn = document.getElementById('scan-btn');
        if (!btn) return;
        btn.innerHTML = `<i class='bx bx-loader-circle bx-spin'></i> Scanning…`;
        btn.disabled = true;
        setTimeout(() => {
            btn.innerHTML = `<i class='bx bx-check-circle'></i> All Clear — No New Issues`;
            btn.style.background = 'var(--success-color)';
            setTimeout(() => {
                btn.innerHTML = `<i class='bx bx-search-alt'></i> Check Now`;
                btn.style.background = '';
                btn.disabled = false;
            }, 4000);
        }, 2500);
    }
}
window.AnomalyView = AnomalyView;
}
