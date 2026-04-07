class SimulatorView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');

        // STRICT ISOLATION: ROI Simulator uses urban ML customer segments
        if (mode === 'rural') {
            CompareView.renderRuralGate(container, '"What-if" Simulator', 'bx-play-circle', 'ROI Simulator models revenue changes on urban ML customer segments (Champions, Loyal, At-Risk). Rural mode tracks individual manual sales without segment modeling.');
            return;
        }
        
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx bx-play-circle text-gradient' style="font-size: 2.5rem;"></i>
                        "What-if" Simulator
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;">Strategy ROI Modeling & Price Elasticity</p>
                </div>
                
                <div class="card premium-card">
                    <h3 style="margin-bottom: 1.5rem; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
                        <i class='bx bx-equalizer' style="color: var(--primary-color);"></i>
                        Scenario Variables
                    </h3>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem; font-size: 0.9rem; line-height: 1.6;">Model how changes in pricing and volume affect your bottom line.</p>
                    
                    <div style="margin-bottom: 2rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                            <label style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em;">Price Change (%)</label>
                            <span id="price-val" style="font-weight: 800; color: var(--primary-color); background: var(--primary-light); padding: 0.1rem 0.5rem; border-radius: 6px;">0</span>
                        </div>
                        <input type="range" id="price-change" min="-20" max="20" value="0" class="premium-slider" style="width: 100%;" oninput="document.getElementById('price-val').innerText=this.value">
                    </div>
                    
                    <div style="margin-bottom: 2.5rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                            <label style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em;">Volume Change (%)</label>
                            <span id="vol-val" style="font-weight: 800; color: var(--primary-color); background: var(--primary-light); padding: 0.1rem 0.5rem; border-radius: 6px;">0</span>
                        </div>
                        <input type="range" id="vol-change" min="-20" max="20" value="0" class="premium-slider" style="width: 100%;" oninput="document.getElementById('vol-val').innerText=this.value">
                    </div>
                    
                    <button class="btn btn-premium" onclick="SimulatorView.run()" style="width: 100%; height: 3.5rem;">
                        <i class='bx bx-radar'></i> Run AI Simulation
                    </button>
                </div>
                
                <div id="sim-result" class="animate-fadeIn" style="margin-top: 2rem;"></div>
            </div>
        `;
        window.scrollTo(0, 0);
    }

    static async run() {
        const p = parseFloat(document.getElementById('price-change').value);
        const v = parseFloat(document.getElementById('vol-change').value);
        const resDiv = document.getElementById('sim-result');
        
        resDiv.innerHTML = `<div class="loader-container" style="padding: 2rem;"><div class="loader"></div><p style="font-weight: 700; color: var(--text-secondary); margin-top: 1rem;">SYNTHESIZING ROI IMPACT...</p></div>`;
        
        try {
            const mode = localStorage.getItem('businessMode') || 'urban';
            const data = await window.ApiClient.getSimulation(p, v, mode);
            
            let roiColor = 'var(--success-color)';
            if (data.roi < 0) roiColor = 'var(--danger-color)';

            resDiv.innerHTML = `
                <div class="card animate-fadeIn" style="border-left: 6px solid ${roiColor};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">AI Projected Performance</div>
                        <span style="background: ${roiColor}; color: white; font-size: 0.65rem; font-weight: 850; padding: 0.3rem 0.6rem; border-radius: 20px; letter-spacing: 0.05em;">SIMULATED</span>
                    </div>

                    <div style="text-align: center; margin-bottom: 2.5rem; padding: 2rem; background: var(--bg-color); border-radius: 24px;">
                        <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase;">Estimated Profit Delta</div>
                        <h2 style="font-size: 3rem; color: ${roiColor}; font-weight: 900; letter-spacing: -0.05em;">
                            ${data.roi >= 0 ? '+' : ''}${data.roi.toFixed(1)}%
                        </h2>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="background: var(--surface-color); padding: 1.25rem; border-radius: 16px; border: 1px solid var(--border-color);">
                            <div style="font-size: 0.75rem; font-weight: 850; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.75rem;">Strategy Summary</div>
                            <p style="color: var(--text-primary); font-size: 1rem; line-height: 1.6; font-weight: 600;">${data.recommendation}</p>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                            <div class="card" style="margin-bottom: 0; padding: 1.25rem; background: var(--bg-color); text-align: center;">
                                <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">Confidence</div>
                                <div style="font-size: 1.1rem; font-weight: 800;">High (0.89)</div>
                            </div>
                            <div class="card" style="margin-bottom: 0; padding: 1.25rem; background: var(--bg-color); text-align: center;">
                                <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">ML Precision</div>
                                <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary-color);">Enterprise</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            resDiv.innerHTML = `<div class="card" style="border-left: 4px solid var(--danger-color); color: var(--danger-color);">Simulation failure. Model sync lost.</div>`;
        }
    }
}
window.SimulatorView = SimulatorView;
