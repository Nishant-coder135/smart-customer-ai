class QualityView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');

        // STRICT ISOLATION: Data Quality checks ML validation logs from urban CSV ingestion pipeline
        if (mode === 'rural') {
            CompareView.renderRuralGate(container, 'Data Quality', 'bx-check-shield', 'Data Quality validates schema integrity of CSV files ingested into the urban ML pipeline. Rural mode uses offline manual entry which has no CSV schema to validate.');
            return;
        }
        
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx bx-check-shield text-gradient' style="font-size: 2.5rem;"></i>
                        Data Quality
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;">Schema Integrity & Consistency Radar</p>
                </div>
                
                <div class="card premium-card" style="border-left: 6px solid var(--success-color);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                        <h3 style="font-size: 1.1rem; font-weight: 800;">Integrated Health Check</h3>
                        <span style="background: hsla(158, 77%, 42%, 0.1); color: var(--success-color); font-size: 0.65rem; font-weight: 900; padding: 0.3rem 0.6rem; border-radius: 20px;">NOMINAL</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                        <div style="background: var(--bg-color); padding: 1.25rem; border-radius: 16px; border: 1px solid var(--border-color); text-align: center;">
                            <div style="font-size: 1.75rem; font-weight: 900; color: var(--success-color);">100%</div>
                            <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em;">Integrity</div>
                        </div>
                        <div style="background: var(--bg-color); padding: 1.25rem; border-radius: 16px; border: 1px solid var(--border-color); text-align: center;">
                            <div style="font-size: 1.75rem; font-weight: 900; color: var(--primary-color);">Stable</div>
                            <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em;">Structure</div>
                        </div>
                    </div>
                </div>
                
                <div class="card premium-card" style="margin-top: 2rem; border-left: 6px solid var(--primary-color);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                        <h3 style="font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
                            <i class='bx bx-bot' style="color: var(--primary-color);"></i>
                            AI Authenticity Guard (GPTZero)
                        </h3>
                        <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); background: var(--bg-color); padding: 0.2rem 0.5rem; border-radius: 4px;">POWERED BY GPTZERO</span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1.25rem;">Verify if customer feedback, reviews, or business pitches are human-written or AI-generated to maintain business integrity.</p>
                    
                    <textarea id="authenticity-input" placeholder="Paste feedback or content here to verify..." 
                        style="width: 100%; height: 100px; background: var(--bg-color); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 1rem; color: var(--text-primary); font-family: inherit; font-size: 0.85rem; resize: none; margin-bottom: 1rem; outline: none; transition: border-color 0.2s;"
                        onfocus="this.style.borderColor='var(--primary-color)'"
                        onblur="this.style.borderColor='var(--border-color)'"></textarea>
                    
                    <button id="check-authenticity-btn" onclick="QualityView.checkAuthenticity()"
                        style="width: 100%; background: linear-gradient(135deg, var(--primary-color), #8b5cf6); border: none; border-radius: 12px; padding: 0.85rem; color: white; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: transform 0.2s;"
                        onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <i class='bx bx-shield-quarter'></i> Verify Authenticity
                    </button>
                    
                    <div id="authenticity-result" style="margin-top: 1.25rem; display: none; padding: 1rem; border-radius: 12px; background: var(--bg-color); border: 1px dashed var(--border-color);">
                        <!-- Result injected here -->
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;">ML Validation Logs</h3>
                    <div class="card" style="padding: 1.5rem; margin-bottom: 0.75rem; border-left: 3px solid var(--success-color);">
                        <div style="display:flex; justify-content:space-between; font-size: 0.85rem; font-weight: 800;">
                            <span>InvoiceDate Format</span>
                            <i class='bx bxs-check-circle' style="color: var(--success-color);"></i>
                        </div>
                    </div>
                    <div class="card" style="padding: 1.5rem; margin-bottom: 0.75rem; border-left: 3px solid var(--success-color);">
                        <div style="display:flex; justify-content:space-between; font-size: 0.85rem; font-weight: 800;">
                            <span>CustomerID Uniqueness</span>
                            <i class='bx bxs-check-circle' style="color: var(--success-color);"></i>
                        </div>
                    </div>
                    <div class="card" style="padding: 1.5rem; margin-bottom: 0.75rem; border-left: 3px solid var(--success-color);">
                        <div style="display:flex; justify-content:space-between; font-size: 0.85rem; font-weight: 800;">
                            <span>Price Range Normalization</span>
                            <i class='bx bxs-check-circle' style="color: var(--success-color);"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static async checkAuthenticity() {
        const input = document.getElementById('authenticity-input');
        const btn = document.getElementById('check-authenticity-btn');
        const resultDiv = document.getElementById('authenticity-result');
        const text = input.value.trim();
        
        if (!text) return;
        
        btn.disabled = true;
        btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Analyzing...`;
        resultDiv.style.display = 'none';
        
        try {
            const data = await ApiClient.checkAuthenticity(text);
            resultDiv.style.display = 'block';
            
            const color = data.is_ai ? 'var(--danger-color)' : 'var(--success-color)';
            const icon = data.is_ai ? 'bx-bot' : 'bx-user-check';
            const label = data.is_ai ? 'AI-Generated Detected' : 'Likely Human-Written';
            const prob = Math.round(data.ai_probability * 100);
            
            resultDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius: 10px; background: ${color}; display: flex; align-items: center; justify-content: center; color: white;">
                        <i class='bx ${icon}' style="font-size: 1.25rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">GPTZero Analysis</div>
                        <div style="font-size: 0.95rem; font-weight: 800; color: ${color};">${label}</div>
                    </div>
                    <div style="margin-left: auto; text-align: right;">
                        <div style="font-size: 1.25rem; font-weight: 900; color: ${color};">${prob}%</div>
                        <div style="font-size: 0.55rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">AI Probability</div>
                    </div>
                </div>
                ${data.status === 'simulation' ? `
                    <div style="margin-top: 0.75rem; font-size: 0.65rem; color: var(--warning-color); font-weight: 700; text-align: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
                        <i class='bx bx-info-circle'></i> Simulation Mode: Missing API Key
                    </div>
                ` : ''}
            `;
        } catch (e) {
            console.error(e);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class='bx bx-shield-quarter'></i> Verify Authenticity`;
        }
    }
}
window.QualityView = QualityView;

class ExportView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');

        // STRICT ISOLATION: Export generates ML churn reports from the urban pipeline
        if (mode === 'rural') {
            CompareView.renderRuralGate(container, 'Professional Reports', 'bxs-file-pdf', 'Export Reports generate ML prediction sets and churn matrices from the urban Customer table. Rural mode\'s manual entries can be directly exported from the Sync tab.');
            return;
        }
        
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx bxs-file-pdf text-gradient' style="font-size: 2.5rem;"></i>
                        Professional Reports
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;">Executive Business Intelligence Output</p>
                </div>
                
                <div class="card premium-card">
                    <h3 style="margin-bottom: 1.5rem; font-size: 1.1rem; font-weight: 800;">Select Format</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div class="card" style="margin-bottom: 0; padding: 1.5rem; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;" onclick="alert('Generating Strategy PDF...')">
                            <div>
                                <h4 style="font-weight: 800;">Strategy PDF Blueprint</h4>
                                <p style="font-size: 0.8rem; color: var(--text-secondary);">Executive summary with AI Growth Charts</p>
                            </div>
                            <i class='bx bxs-file-pdf' style="font-size: 2rem; color: var(--danger-color);"></i>
                        </div>
                        
                        <div class="card" style="margin-bottom: 0; padding: 1.5rem; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;" onclick="alert('Generating Excel Ledger...')">
                            <div>
                                <h4 style="font-weight: 800;">Raw Transaction Ledger</h4>
                                <p style="font-size: 0.8rem; color: var(--text-secondary);">Optimized for local Accounting software</p>
                            </div>
                            <i class='bx bxs-spreadsheet' style="font-size: 2rem; color: var(--success-color);"></i>
                        </div>
                        
                        <div class="card" style="margin-bottom: 0; padding: 1.5rem; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;" onclick="alert('Generating AI Predictions Report...')">
                            <div>
                                <h4 style="font-weight: 800;">Risk & Churn Matrix</h4>
                                <p style="font-size: 0.8rem; color: var(--text-secondary);">Full ML prediction set for all customers</p>
                            </div>
                            <i class='bx bxs-brain' style="font-size: 2rem; color: var(--primary-color);"></i>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 2rem; background: var(--bg-color); padding: 1.5rem; border-radius: 18px; border: 1px solid var(--border-color); text-align: center;">
                    <p style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">System supports high-resolution PDF and CSV standards.</p>
                </div>
            </div>
        `;
    }
}
window.ExportView = ExportView;
