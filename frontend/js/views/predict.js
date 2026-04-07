class PredictView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');

        // STRICT ISOLATION: ML Predictor needs urban Customer ML table data
        if (mode === 'rural') {
            CompareView.renderRuralGate(container, 'ML Predictor', 'bx-brain', 'ML Predictor runs churn models trained on the urban Customer ML table. Rural mode does not generate ML-scored customer profiles from manual entries.');
            return;
        }
        
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx bx-brain text-gradient' style="font-size: 2.5rem;"></i>
                        AI Predictor
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;">Real-time Neural Simulation & Churn Probability</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
                    <div class="card premium-card">
                        <h3 style="margin-bottom: 1.5rem; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
                            <i class='bx bx-slider-alt' style="color: var(--primary-color);"></i>
                            Dynamic Parameters
                        </h3>
                        <p style="color: var(--text-secondary); margin-bottom: 2rem; font-size: 0.9rem; line-height: 1.6;">Adjust RFM weights to simulate how the ML model clusters this customer persona in real-time.</p>
                        
                        <div style="margin-bottom: 2rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                                <label style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em;">Recency (Days)</label>
                                <span id="r-val" style="font-weight: 800; color: var(--primary-color); background: var(--primary-light); padding: 0.1rem 0.5rem; border-radius: 6px;">30</span>
                            </div>
                            <input type="range" id="recency" min="1" max="365" value="30" class="premium-slider" style="width: 100%;" oninput="document.getElementById('r-val').innerText=this.value">
                        </div>
                        
                        <div style="margin-bottom: 2rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                                <label style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em;">Frequency (Orders)</label>
                                <span id="f-val" style="font-weight: 800; color: var(--primary-color); background: var(--primary-light); padding: 0.1rem 0.5rem; border-radius: 6px;">5</span>
                            </div>
                            <input type="range" id="frequency" min="1" max="100" value="5" class="premium-slider" style="width: 100%;" oninput="document.getElementById('f-val').innerText=this.value">
                        </div>
                        
                        <div style="margin-bottom: 2.5rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                                <label style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em;">Monetary (Spent ₹)</label>
                                <span id="m-val" style="font-weight: 800; color: var(--primary-color); background: var(--primary-light); padding: 0.1rem 0.5rem; border-radius: 6px;">150</span>
                            </div>
                            <input type="range" id="monetary" min="10" max="15000" step="50" value="150" class="premium-slider" style="width: 100%;" oninput="document.getElementById('m-val').innerText=this.value">
                        </div>
                        
                        <button class="btn btn-premium" onclick="runPrediction()" style="width: 100%; height: 3.5rem;">
                            <i class='bx bx-pulse'></i> Synthesize AI Logic
                        </button>
                    </div>
                    
                    <div id="prediction-result" class="animate-fadeIn">
                        <div class="card" style="text-align: center; padding: 4rem 2rem; border: 2px dashed var(--border-color); background: var(--bg-color);">
                            <i class='bx bx-analyse' style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                            <p style="color: var(--text-secondary); font-weight: 600;">System ready. Configure parameters above.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        window.scrollTo(0, 0);
    }
}

window.PredictView = PredictView;

window.runPrediction = async () => {
    const r = parseInt(document.getElementById('recency').value);
    const f = parseInt(document.getElementById('frequency').value);
    const m = parseFloat(document.getElementById('monetary').value);
    
    const resultDiv = document.getElementById('prediction-result');
    resultDiv.innerHTML = `
        <div class="loader-container" style="padding: 2rem;">
            <div class="loader"></div>
            <p style="font-weight: 700; color: var(--text-secondary); margin-top: 1rem;">CONSULTING NEURAL CLUSTER...</p>
        </div>
    `;
    
    try {
        const result = await window.ApiClient.predict(r, f, m);
        const rec = result.recommendation;
        const color = result.segment === 'VIP' ? 'var(--success-color)' : 
                      result.segment === 'Churn Risk' ? 'var(--danger-color)' : 'var(--primary-color)';
                           
        resultDiv.innerHTML = `
            <div class="card animate-fadeIn" style="border-left: 6px solid ${color};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Dynamic Segment Score</div>
                    <span style="background: ${color}; color: white; font-size: 0.65rem; font-weight: 850; padding: 0.3rem 0.6rem; border-radius: 20px; letter-spacing: 0.05em;">AI CONFIRMED</span>
                </div>
                
                <div style="text-align: center; margin-bottom: 2rem; padding: 1.5rem; background: var(--bg-color); border-radius: 20px;">
                    <h2 style="font-size: 2.75rem; color: ${color}; font-weight: 900; letter-spacing: -0.04em;">${result.segment}</h2>
                    <p style="color: var(--text-secondary); font-weight: 600; margin-top: 0.25rem;">Market Position</p>
                </div>
                
                <div style="padding-top: 1rem;">
                    <h3 style="margin-bottom: 1.25rem; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
                        <i class='bx bxs-magic-wand' style="color: var(--secondary-color);"></i> AI Strategy Recommendation
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="background: var(--surface-color); padding: 1.25rem; border-radius: 14px; border: 1px solid var(--border-color);">
                            <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem;">Action Roadmap</div>
                            <div style="font-size: 1.05rem; font-weight: 700; color: var(--primary-color);">${rec.action}</div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div style="background: var(--bg-color); padding: 1rem; border-radius: 14px; text-align: center;">
                                <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">Confidence</div>
                                <div style="font-size: 1.15rem; font-weight: 800;">High</div>
                            </div>
                            <div style="background: var(--bg-color); padding: 1rem; border-radius: 14px; text-align: center;">
                                <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">Impact</div>
                                <div style="font-size: 1.15rem; font-weight: 800; color: var(--success-color);">${rec.impact}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        resultDiv.innerHTML = `<div class="card" style="border-left: 4px solid var(--danger-color); color: var(--danger-color);">AI analysis offline. Check backend connection.</div>`;
    }
};
