class AnalyticsView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const isHindi = localStorage.getItem('lang') === 'hi';
        const t = (en, hi) => isHindi ? hi : en;
        
        const container = document.getElementById(containerId || 'main-content');

        // STRICT ISOLATION: Market Map uses urban ML segmentation
        if (mode === 'rural') {
            CompareView.renderRuralGate(container, 'Market Map', 'bx-pie-chart-alt-2', 'Market Map visualizes ML-derived segments (Champions, At-Risk, etc.) from the urban Customer table. Rural mode uses manual transaction data which does not have ML-scored segments.');
            return;
        }

        container.innerHTML = `
            <div class="loader-container animate-fadeIn">
                <div class="loader"></div>
                <p style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">CALCULATING RFM QUARTILES...</p>
            </div>
        `;
        
        try {
            const data = await window.ApiClient.getAnalyticsData(mode);
            
            let html = `
                <div class="container animate-fadeIn">
                    <div style="margin-bottom: 2.5rem;">
                        <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                            <i class='bx bx-stats text-gradient' style="font-size: 2.5rem;"></i>
                            ${t('Deep Analytics', 'गहन विश्लेषण')}
                        </h1>
                        <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;"> ${t('Segmentation & Revenue Attribution', 'विभाजन और राजस्व एट्रिब्यूशन')} </p>
                    </div>
            `;
            
            if (mode === 'urban') {
                html += `
                    <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                        <div class="card premium-card">
                            <h3 style="margin-bottom: 1.5rem; font-size: 1.1rem; font-weight: 800;">${t('Market Share by Segment', 'खंड द्वारा बाजार हिस्सेदारी')}</h3>
                            <div id="pie-chart" style="width: 100%; height: 300px;"></div>
                        </div>
                        <div class="card">
                            <h3 style="margin-bottom: 1.5rem; font-size: 1.1rem; font-weight: 800;">${t('Revenue Performance', 'राजस्व प्रदर्शन')}</h3>
                            <div id="bar-chart" style="width: 100%; height: 300px;"></div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem; font-size: 1.1rem; font-weight: 800;">${t('Interactive PCA Cluster Map', 'इंटरएक्टिव PCA क्लस्टर मैप')}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">AI multi-dimensional mapping of customer behavior patterns.</p>
                        <div id="scatter-chart" style="width: 100%; height: 450px;"></div>
                    </div>
                </div>`;
                
                container.innerHTML = html;
                this.renderUrbanCharts(data);
                
            } else { // Rural Mode
                html += `
                    <div style="display: grid; grid-template-columns: 1fr; gap: 1.25rem;">
                `;
                
                Object.entries(data.distribution).forEach(([segment, count], idx) => {
                    const rev = data.revenue[segment] || 0;
                    const colors = ['var(--primary-color)', 'var(--secondary-color)', 'var(--success-color)', 'var(--warning-color)'];
                    const color = colors[idx % colors.length];
                    
                    html += `
                        <div class="card animate-fadeIn" style="border-left: 6px solid ${color}; display: flex; align-items: center; justify-content: space-between; padding: 1.75rem;">
                            <div>
                                <h2 style="font-size: 1.2rem; font-weight: 850; margin-bottom: 0.25rem;">${segment}</h2>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;"> ${count} ${t('Total Profiles', 'कुल प्रोफाइल')}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.4rem; font-weight: 900; color: ${color};">₹${Math.round(rev).toLocaleString()}</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Attributed Value</div>
                            </div>
                        </div>
                    `;
                });
                
                html += `</div></div>`;
                container.innerHTML = html;
            }
            window.scrollTo(0, 0);
            
        } catch (error) {
            console.error("Failed to load analytics", error);
            container.innerHTML = `<div class="container"><div class="card" style="border-left: 4px solid var(--danger-color);"><h3>Analytics Offline</h3><p>Ensure business data is synced.</p></div></div>`;
        }
    }
    
    static renderUrbanCharts(data) {
        if (typeof Plotly === 'undefined') return;
        const colorMap = { 'VIP': '#6366f1', 'Regular': '#8b5cf6', 'Low Value': '#f59e0b', 'Churn Risk': '#ef4444' };
        
        const pieData = [{
            values: Object.values(data.distribution),
            labels: Object.keys(data.distribution),
            type: 'pie',
            hole: 0.5,
            marker: { colors: Object.keys(data.distribution).map(k => colorMap[k] || '#8b5cf6') },
            textinfo: "none"
        }];
        const pieLayout = { 
            margin: {t: 0, b: 0, l: 0, r: 0}, 
            showlegend: true, 
            legend: { orientation: "h", y: -0.2 },
            paper_bgcolor: 'rgba(0,0,0,0)', 
            plot_bgcolor: 'rgba(0,0,0,0)', 
            font: { family: 'Inter', color: '#94a3b8' } 
        };
        Plotly.newPlot('pie-chart', pieData, pieLayout, {displayModeBar: false});
        
        const barData = [{
            x: Object.keys(data.revenue),
            y: Object.values(data.revenue),
            type: 'bar',
            marker: { 
                color: Object.keys(data.revenue).map(k => colorMap[k] || '#8b5cf6'),
                line: { width: 0 }
            }
        }];
        const barLayout = { 
            margin: {t: 20, b: 40, l: 50, r: 0}, 
            paper_bgcolor: 'rgba(0,0,0,0)', 
            plot_bgcolor: 'rgba(0,0,0,0)', 
            font: { family: 'Inter', color: '#94a3b8' },
            yaxis: { gridcolor: 'rgba(255,255,255,0.05)' }
        };
        Plotly.newPlot('bar-chart', barData, barLayout, {displayModeBar: false});
        
        const scatterTraces = [];
        const segments = [...new Set(data.scatter.map(d => d.segment))];
        segments.forEach(seg => {
            const segData = data.scatter.filter(d => d.segment === seg);
            scatterTraces.push({
                x: segData.map(d => d.x),
                y: segData.map(d => d.y),
                mode: 'markers',
                type: 'scatter',
                name: seg,
                marker: { 
                    size: 12, 
                    color: colorMap[seg] || '#8b5cf6',
                    opacity: 0.8,
                    line: { color: 'white', width: 1 }
                }
            });
        });
        const scatterLayout = { 
            margin: {t: 10, b: 30, l: 30, r: 10}, 
            paper_bgcolor: 'rgba(0,0,0,0)', 
            plot_bgcolor: 'rgba(0,0,0,0)', 
            font: { family: 'Inter', color: '#94a3b8' },
            xaxis: { showgrid: false },
            yaxis: { showgrid: false }
        };
        Plotly.newPlot('scatter-chart', scatterTraces, scatterLayout, {responsive: true, displayModeBar: false});
    }
}
window.AnalyticsView = AnalyticsView;
