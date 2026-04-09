if (!window.ExportView) {
    class ExportView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');
        if (!container) return;

        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem; text-align: center;">
                    <h1 style="margin-bottom: 0.5rem; font-weight: 900; letter-spacing: -0.05em;">Intelligence Reports</h1>
                    <p style="color: var(--text-secondary); font-weight: 600;">Export your insights for external strategy</p>
                </div>

                <div class="business-grid">
                    <div class="card premium-card animate-fadeIn">
                        <div style="width: 54px; height: 54px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-radius: 16px; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem;">
                            <i class='bx bxs-file-pdf' style="font-size: 2rem;"></i>
                        </div>
                        <h3 style="margin-bottom:0.75rem;">Strategy Roadmap</h3>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">A full AI-generated PDF detailing your next 30 days of growth actions and festival prep.</p>
                        <button class="btn btn-primary" style="width:100%;" onclick="ExportView.generate('PDF Roadmap')">
                            Generate PDF
                        </button>
                    </div>

                    <div class="card premium-card animate-fadeIn" style="animation-delay: 0.1s;">
                        <div style="width: 54px; height: 54px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 16px; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem;">
                            <i class='bx bx-spreadsheet' style="font-size: 2rem;"></i>
                        </div>
                        <h3 style="margin-bottom:0.75rem;">Customer Clean File</h3>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Deduplicated and organized CSV of your customers with assigned segments and risk scores.</p>
                        <button class="btn btn-primary" style="width:100%; border-color:#10b981; background:transparent; color:#10b981;" onclick="ExportView.generate('CSV Cleanup')">
                            Download CSV
                        </button>
                    </div>

                    <div class="card premium-card animate-fadeIn" style="animation-delay: 0.2s;">
                        <div style="width: 54px; height: 54px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-radius: 16px; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem;">
                            <i class='bx bx-slideshow' style="font-size: 2rem;"></i>
                        </div>
                        <h3 style="margin-bottom:0.75rem;">Pitch Deck Assets</h3>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">High-resolution chart exports and visual summaries for board meetings/presentations.</p>
                        <button class="btn btn-primary" style="width:100%; border-color:#f59e0b; background:transparent; color:#f59e0b;" onclick="ExportView.generate('Presentation Pack')">
                            Export Media
                        </button>
                    </div>
                </div>

                <div class="card premium-card" style="margin-top: 2rem; border-style: dashed; opacity: 0.8;">
                    <div style="display:flex; align-items:center; gap: 1rem;">
                        <div style="flex:1;">
                            <h4 style="margin-bottom:0.25rem;">Automated Monthly Summaries</h4>
                            <p style="font-size: 0.8rem; color: var(--text-secondary);">Receive a full business audit in your email on the 1st of every month.</p>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="auto-report" checked>
                            <label for="auto-report"></label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static async generate(type) {
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Preparing ${type}...`;
        btn.disabled = true;

        try {
            if (type === 'PDF Roadmap' || type === 'Strategy Roadmap') {
                showToast(`Generating high-fidelity Strategy PDF...`, "info");
                await ApiClient.downloadReport('strategy');
                
                btn.innerHTML = `<i class='bx bx-check'></i> Downloaded`;
                btn.style.background = 'var(--success-color)';
                btn.style.color = 'white';
                showToast(`Intelligence Report downloaded successfully!`, "success");
            } else {
                // Mock for other types for now
                await new Promise(r => setTimeout(r, 1500));
                showToast(`${type} export is currently in maintenance. PDF is recommended.`, "warning");
                btn.innerHTML = originalText;
            }
        } catch (error) {
            console.error(error);
            showToast(`Failed to generate ${type}: ${error.message}`, "error");
            btn.innerHTML = `<i class='bx bx-error'></i> Failed`;
        } finally {
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.style.color = '';
                btn.disabled = false;
            }, 3000);
        }
    }
}
window.ExportView = ExportView;
}
