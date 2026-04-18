class ActionsView {
    static async render(containerId, mode) {
        mode = mode || localStorage.getItem('businessMode') || 'urban';
        const container = document.getElementById(containerId || 'main-content');
        
        if (mode === 'rural') {
            // RURAL MODE: Festival-driven action engine
            ActionsView.renderRuralActions(container);
        } else {
            // URBAN MODE: ML-driven action engine
            ActionsView.renderUrbanActions(container);
        }
    }

    // ─── URBAN MODE ──────────────────────────────────────────────────────────────
    static async renderUrbanActions(container) {
        container.innerHTML = `
            <div class="container animate-fadeIn">
                <div style="margin-bottom: 2.5rem;">
                    <h1 style="font-size: 2.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; letter-spacing: -0.04em;">
                        <i class='bx bxs-star text-gradient' style="font-size: 2.5rem;"></i>
                        Daily Roadmap
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1rem; font-weight: 500;">Your ML-driven prioritized tasks for maximum growth.</p>
                </div>
                <div id="actions-content" class="motion-slide-up">
                    <div class="glass-panel" style="padding: 3rem; text-align: center;">
                        <div class="loader"></div>
                        <p style="margin-top: 1.5rem; color: var(--text-secondary); font-weight: 700; letter-spacing: 0.05em;">ORCHESTRATING STRATEGIC AGENTS...</p>
                    </div>
                </div>
            </div>
        `;

        try {
            const data = await window.ApiClient.getTodayActions('urban');
            ActionsView.renderActionsMetrics(data, 'actions-content');
        } catch (error) {
            console.error('Actions API error:', error);
            const content = document.getElementById('actions-content');
            if (content) {
                content.innerHTML = `
                    <div class="card animate-fadeIn" style="text-align: center; padding: 3rem 2rem; border: 2px dashed var(--border-color);">
                        <div style="width: 72px; height: 72px; background: var(--primary-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: var(--primary-color);">
                            <i class='bx bx-data' style="font-size: 2.5rem;"></i>
                        </div>
                        <h3 style="font-size: 1.2rem; font-weight: 800;">Upload Data to Activate</h3>
                        <p style="color: var(--text-secondary); margin-top: 0.75rem; font-size: 0.9rem; line-height: 1.6;">Your AI action engine needs business data to generate personalized recommendations.</p>
                        <button class="btn btn-premium" style="margin-top: 1.5rem;" onclick="switchTab('data')">
                            <i class='bx bx-upload'></i> Sync Business Data
                        </button>
                    </div>
                `;
            }
        }
    }

    // ─── RURAL MODE ───────────────────────────────────────────────────────────────
    static async renderRuralActions(container) {
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

        container.innerHTML = `
            <div class="container animate-fadeIn" id="rural-actions-root">
                <div style="margin-bottom: 2rem;">
                    <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--primary-color); margin-bottom: 0.4rem;">
                        🌿 Rural Business Intelligence
                    </div>
                    <h1 style="font-size: 2.1rem; font-weight: 800; letter-spacing: -0.04em; display: flex; align-items: center; gap: 0.75rem;">
                        <i class='bx bx-calendar-event text-gradient' style="font-size: 2.3rem;"></i>
                        Festival Actions
                    </h1>
                    <p style="color: var(--text-secondary); margin-top: 0.4rem; font-size: 0.95rem; font-weight: 500;">${todayStr} — Grow your business with festivals</p>
                </div>

                <!-- Today's Festivals Banner -->
                <div id="today-festivals-banner"></div>

                <!-- Upcoming Festivals Section -->
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                            <i class='bx bx-calendar' style="font-size: 1.3rem; color: var(--warning-color);"></i>
                            <h2 style="font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;">Upcoming Festivals & Opportunities</h2>
                        </div>
                        <button id="festival-refresh-btn" onclick="ActionsView.refreshFestivals()" style="background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.4rem 0.8rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; color: var(--text-secondary);">
                            <i class='bx bx-refresh'></i> Refresh
                        </button>
                    </div>
                    <div id="festival-cards-container">
                        <div style="text-align: center; padding: 3rem 1rem;">
                            <div class="loader" style="margin: 0 auto;"></div>
                            <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Fetching festival calendar...</p>
                        </div>
                    </div>
                </div>

                <!-- General Rural Actions -->
                <div style="margin-top: 2rem;">
                    <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1.25rem;">
                        <i class='bx bx-bulb' style="font-size: 1.3rem; color: var(--primary-color);"></i>
                        <h2 style="font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;">Daily Business Tips</h2>
                    </div>
                    ${ActionsView.renderDailyTips()}
                </div>
            </div>
        `;

        // Load festival data
        await ActionsView.loadFestivalData();
    }

    // ─── FESTIVAL DATA LOADING ────────────────────────────────────────────────────
    static async loadFestivalData() {
        const cardsContainer = document.getElementById('festival-cards-container');
        const todayBanner = document.getElementById('today-festivals-banner');
        if (!cardsContainer) return;

        let todayFestivals = [];
        let upcomingFestivals = [];
        let apiAvailable = false;

        // Calculate date range: today → +90 days
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const endDate = new Date(today); endDate.setDate(today.getDate() + 90);
        const startStr = today.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // Full fallback: use only built-in calendar
        upcomingFestivals = ActionsView.getBuiltinFestivals();

        // Render today's banner
        if (todayBanner) ActionsView.renderTodayBanner(todayBanner, todayFestivals);

        // Render upcoming festival action cards
        ActionsView.renderFestivalCards(cardsContainer, upcomingFestivals, apiAvailable);
    }

    static async refreshFestivals() {
        const btn = document.getElementById('festival-refresh-btn');
        const cardsContainer = document.getElementById('festival-cards-container');
        if (btn) { btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Loading`; btn.disabled = true; }
        if (cardsContainer) {
            cardsContainer.innerHTML = `<div style="text-align: center; padding: 2rem;"><div class="loader" style="margin: 0 auto;"></div></div>`;
        }
        await ActionsView.loadFestivalData();
        if (btn) { btn.innerHTML = `<i class='bx bx-refresh'></i> Refresh`; btn.disabled = false; }
    }

    // ─── TODAY'S BANNER ───────────────────────────────────────────────────────────
    static renderTodayBanner(container, todayFestivals) {
        if (!todayFestivals || todayFestivals.length === 0) {
            container.innerHTML = '';
            return;
        }
        const names = todayFestivals.map(f => f.name).join(', ');
        container.innerHTML = `
            <div style="background: linear-gradient(135deg, #f59e0b22, #f97316 22%); border: 2px solid #f59e0b; border-radius: 18px; padding: 1.25rem 1.5rem; margin-bottom: 1.75rem; display: flex; align-items: center; gap: 1rem; animation: fadeIn 0.4s ease;">
                <div style="font-size: 2.2rem;">🎉</div>
                <div>
                    <div style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #f59e0b; margin-bottom: 0.2rem;">Today's Festival</div>
                    <div style="font-size: 1.05rem; font-weight: 800; letter-spacing: -0.02em;">${names}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem; font-weight: 600;">Special sales opportunity — act now!</div>
                </div>
            </div>
        `;
    }

    // ─── FESTIVAL CARDS ───────────────────────────────────────────────────────────
    static renderFestivalCards(container, festivals, apiAvailable) {
        if (!container) return;

        // ── FINAL SAFETY NET: recompute days_until at render time ────────────────
        // Regardless of where the festival data came from (API or built-in),
        // recalculate the actual days left RIGHT NOW before rendering.
        // This STRICTLY prevents any past festival from ever being displayed.
        const verified = (festivals || [])
            .map(f => ({ ...f, days_until: ActionsView.calcDaysUntil(f.date) }))
            .filter(f => f.days_until >= 1) // >= 1: only genuinely future festivals
            .sort((a, b) => a.days_until - b.days_until);
        // ─────────────────────────────────────────────────────────────────────────

        const sourceLabel = apiAvailable
            ? `<span style="font-size: 0.7rem; color: var(--success-color); font-weight: 700;"><i class='bx bx-check-circle'></i> Live API</span>`
            : `<span style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 700;"><i class='bx bx-calendar'></i> Built-in Calendar</span>`;

        if (verified.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 2.5rem; border: 2px dashed var(--border-color);">
                    <i class='bx bx-calendar-check' style="font-size: 2.5rem; color: var(--success-color);"></i>
                    <p style="margin-top: 1rem; color: var(--text-secondary); font-weight: 600;">No upcoming festivals at the moment</p>
                    <p style="margin-top: 0.4rem; color: var(--text-secondary); font-size: 0.8rem;">Check back soon — the next one will appear here automatically.</p>
                </div>`;
            return;
        }

        let html = `
            <div style="display: flex; align-items: center; justify-content: flex-end; margin-bottom: 0.75rem;">
                ${sourceLabel}
            </div>
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        `;

        verified.slice(0, 6).forEach(f => {
            const actions = ActionsView.generateBusinessActions(f);
            const urgencyColor = f.days_until <= 2 ? 'var(--danger-color)'
                              : f.days_until <= 7 ? 'var(--warning-color)'
                              : f.days_until <= 21 ? 'var(--primary-color)'
                              : 'var(--success-color)';

            const urgencyEmoji = f.days_until === 0 ? '🔴 TODAY'
                               : f.days_until === 1 ? '🔴 TOMORROW'
                               : f.days_until <= 3 ? `🔴 In ${f.days_until} days`
                               : f.days_until <= 7 ? `🟡 This week`
                               : f.days_until <= 21 ? `🔵 In ${f.days_until} days`
                               : `🟢 In ${f.days_until} days`;

            const statesText = Array.isArray(f.states) && f.states.length > 0
                ? f.states.includes('All India') ? 'All India' : f.states.slice(0, 3).join(', ')
                : 'All India';

            html += `
                <div class="card animate-fadeIn premium-card" style="border-left: 6px solid ${urgencyColor}; padding: 1.5rem; background: linear-gradient(135deg, var(--surface-color) 0%, var(--bg-color) 100%);">
                    <!-- Festival Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div style="flex: 1;">
                            <div style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: ${urgencyColor}; margin-bottom: 0.35rem;">${urgencyEmoji}</div>
                            <h3 style="font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.3rem;">${f.name}</h3>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <span style="font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; background: ${urgencyColor}18; color: ${urgencyColor}; border-radius: 6px;">${f.type}</span>
                                <span style="font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; background: var(--bg-color); color: var(--text-secondary); border-radius: 6px; border: 1px solid var(--border-color);">📍 ${statesText}</span>
                            </div>
                        </div>
                        <div style="text-align: right; background: ${urgencyColor}15; border: 1px solid ${urgencyColor}30; padding: 0.6rem 0.9rem; border-radius: 12px; min-width: 65px; flex-shrink: 0; margin-left: 0.75rem;">
                            <div style="font-size: 1.5rem; font-weight: 900; color: ${urgencyColor}; line-height: 1;">${f.days_until}</div>
                            <div style="font-size: 0.55rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: ${urgencyColor};">DAYS</div>
                        </div>
                    </div>

                    <!-- Festival Description -->
                    ${f.description ? `
                    <div style="background: var(--bg-color); padding: 0.85rem 1rem; border-radius: 10px; margin-bottom: 1rem; border-left: 3px solid ${urgencyColor}40;">
                        <p style="font-size: 0.82rem; line-height: 1.55; color: var(--text-secondary); font-style: italic;">${f.description.length > 160 ? f.description.substring(0, 160) + '…' : f.description}</p>
                    </div>` : ''}

                    <!-- Business Actions -->
                    <div style="margin-bottom: 1rem;">
                        <div style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                            <i class='bx bx-trending-up'></i> Business Actions (${actions.length})
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                            ${actions.map((action, idx) => `
                                <div style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; background: var(--surface-color); border-radius: 10px; border: 1px solid var(--border-color);">
                                    <div style="width: 26px; height: 26px; background: ${urgencyColor}18; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                                        <span style="font-size: 0.85rem;">${action.icon}</span>
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; font-weight: 800; margin-bottom: 0.15rem;">${action.title}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.45;">${action.detail}</div>
                                    </div>
                                    <div style="font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.45rem; background: var(--bg-color); border-radius: 6px; color: var(--text-secondary); white-space: nowrap; border: 1px solid var(--border-color);">${action.tag}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Share Buttons -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.5rem;">
                        <button onclick="ActionsView.shareOnWhatsApp('${f.name}', '${actions[0]?.title || ''}')" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #25D366; color: white; border: none; border-radius: 12px; padding: 0.75rem; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
                            <i class='bx bxl-whatsapp' style="font-size: 1rem;"></i> Share on WhatsApp
                        </button>
                        <button onclick="ActionsView.remindMe('${f.name}', '${f.date}')" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: var(--surface-color); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 12px; padding: 0.75rem; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
                            <i class='bx bx-bell' style="font-size: 1rem;"></i> Set Reminder
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // ─── SMART BUSINESS ACTION GENERATOR ─────────────────────────────────────────
    static generateBusinessActions(festival) {
        const name = festival.name?.toLowerCase() || '';
        const type = festival.type?.toLowerCase() || '';
        const days = festival.days_until ?? 30;

        // Common actions pool keyed by festival theme
        const themes = {
            'diwali': [
                { icon: '🪔', title: 'Stock Festival Items Early', detail: 'Diyas, candles, sweets, and gift boxes. Buy in bulk before prices spike.', tag: 'Inventory' },
                { icon: '🎁', title: 'Create Gift Combo Packs', detail: 'Bundle dry fruits, sweets, and decorative items at ₹199–₹499 for gifting.', tag: 'Product' },
                { icon: '💳', title: 'Offer "Udhaar-Free" Festival Deals', detail: 'Encourage cash purchases with 5% extra discount. Recover old credit too.', tag: 'Credit' },
                { icon: '📣', title: 'Run Diwali Discount Campaign', detail: 'Announce 10–20% off on select items 5 days before. Use WhatsApp to notify clients.', tag: 'Marketing' }
            ],
            'eid': [
                { icon: '🌙', title: 'Stock Eid Essentials', detail: 'Sewai, dates, attar, traditional clothing. Peak demand starts 3 days before.', tag: 'Inventory' },
                { icon: '🍬', title: 'Special Sweet Hampers', detail: 'Pack sheer khurma kits and sell at ₹100–₹300 each.', tag: 'Product' },
                { icon: '🤝', title: 'Eid Greeting Outreach', detail: 'Send Eid Mubarak message to all clients on WhatsApp with your shop details.', tag: 'Marketing' }
            ],
            'holi': [
                { icon: '🎨', title: 'Stock Colors & Pichkaris', detail: 'Natural colors, abir-gulal, water guns — high demand 2 days before Holi.', tag: 'Inventory' },
                { icon: '🍹', title: 'Thandai & Snack Bundles', detail: 'Pre-pack thandai mix, mathri, gujiya for quick sale at good margins.', tag: 'Product' },
                { icon: '🧺', title: 'Home Delivery Offer', detail: 'Offer free home delivery on orders above ₹500 during Holi week.', tag: 'Service' }
            ],
            'navratri': [
                { icon: '🙏', title: 'Puja Saamagri Stock', detail: 'Incense, flowers, coconut, sindhoor, clay idols sell fast during Navratri.', tag: 'Inventory' },
                { icon: '🥬', title: 'Fasting Food Items', detail: 'Kuttu atta, sabudana, sendha namak — stock up for 9 days demand.', tag: 'Inventory' },
                { icon: '👗', title: 'Traditional Wear Promotion', detail: 'If you sell clothes, push ethnic wear combos with garba accessories.', tag: 'Product' }
            ],
            'harvest': [
                { icon: '🌾', title: 'Farmers Have Cash Now', detail: 'After harvest, farmers receive crop payments. Offer bulk purchase discounts.', tag: 'Sales' },
                { icon: '🛒', title: 'Agricultural Supplies Deal', detail: 'Stock seeds, fertilizers, tools for next season. High demand post-harvest.', tag: 'Inventory' },
                { icon: '💰', title: 'Recover Outstanding Credit', detail: 'Best time to collect Udhaar balances. Farmers have liquidity now.', tag: 'Credit' }
            ],
            'pongal': [
                { icon: '🍚', title: 'New Rice & Sugar Stock', detail: 'Fresh rice, jaggery, sugarcane, and banana leaves — essential pongal items.', tag: 'Inventory' },
                { icon: '🐄', title: 'Cow Decoration Items', detail: 'Maatu Pongal creates demand for cow garlands, turmeric, and kumkum.', tag: 'Product' }
            ],
            'christmas': [
                { icon: '🎄', title: 'Cake & Confectionery Stock', detail: 'Plum cake, chocolates, wine — Christians and non-Christians celebrate.', tag: 'Inventory' },
                { icon: '🎁', title: 'Gift Wrapping Service', detail: 'Offer free gift wrapping on purchases above ₹300. Simple but attracts customers.', tag: 'Service' }
            ],
            'republic': [
                { icon: '🇮🇳', title: 'Patriotic Theme Promotions', detail: 'Tricolor-themed products, flags, and decorative items sell well.', tag: 'Product' },
                { icon: '📣', title: 'Republic Day Sale', detail: 'Run a flat 26% off promotion — memorable and drives footfall.', tag: 'Marketing' }
            ],
            'independence': [
                { icon: '🇮🇳', title: 'Independence Day Offer', detail: 'Flat 15% off — tie to August 15 theme for memorable promotion.', tag: 'Marketing' },
                { icon: '🏳️', title: 'Flag & Patriotic Items', detail: 'Tricolor flags, badges, and stickers — high demand on Aug 14–15.', tag: 'Inventory' }
            ]
        };

        // Match festival to a theme
        let matched = null;
        if (name.includes('diwali') || name.includes('deepawali')) matched = themes['diwali'];
        else if (name.includes('eid') || name.includes('ramadan')) matched = themes['eid'];
        else if (name.includes('holi')) matched = themes['holi'];
        else if (name.includes('navratri') || name.includes('durga')) matched = themes['navratri'];
        else if (type.includes('harvest') || name.includes('pongal') || name.includes('makar') || name.includes('baisakhi') || name.includes('onam')) {
            matched = name.includes('pongal') ? themes['pongal'] : themes['harvest'];
        }
        else if (name.includes('christmas')) matched = themes['christmas'];
        else if (name.includes('republic')) matched = themes['republic'];
        else if (name.includes('independence')) matched = themes['independence'];

        // Generic actions for unmatched festivals
        const generic = [
            { icon: '📣', title: `${festival.name} Special Offer`, detail: `Run a 10–15% discount promotion. Send WhatsApp message to all clients 3 days before.`, tag: 'Marketing' },
            { icon: '🛒', title: 'Anticipate Demand Spike', detail: `Shopping picks up before every festival. Stock up on fast-moving items now (${Math.max(1, days - 3)} days left).`, tag: 'Inventory' },
            { icon: '📞', title: 'Outreach to Loyal Clients', detail: `Send a greeting message with your latest offers to your top clients for ${festival.name}.`, tag: 'Outreach' }
        ];

        return (matched || generic).slice(0, 3);
    }

    // ─── DAILY TIPS ───────────────────────────────────────────────────────────────
    static renderDailyTips() {
        const dayOfWeek = new Date().getDay();
        const tips = [
            { icon: '💰', title: 'Collect Udhaar Today', detail: 'Follow up on outstanding credit. Consistent reminders keep cash flow healthy.', color: 'var(--success-color)' },
            { icon: '📦', title: 'Check Fast-Moving Stock', detail: 'Identify top 5 items that sell daily. Ensure they are always available.', color: 'var(--primary-color)' },
            { icon: '📱', title: 'WhatsApp Your Clients', detail: 'A simple "New stock arrived" message can bring 2–3 customers to your shop today.', color: '#25D366' },
            { icon: '📊', title: 'Review Yesterday\'s Sales', detail: 'Check what sold most and least. Reorder top items before stock runs out.', color: 'var(--warning-color)' }
        ];

        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
                ${tips.map(tip => `
                    <div class="card" style="padding: 1.1rem; border-top: 3px solid ${tip.color};">
                        <div style="font-size: 1.4rem; margin-bottom: 0.5rem;">${tip.icon}</div>
                        <div style="font-size: 0.82rem; font-weight: 800; margin-bottom: 0.3rem;">${tip.title}</div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary); line-height: 1.5;">${tip.detail}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ─── BUILT-IN FESTIVAL CALENDAR (Verified 2026 dates) ────────────────────────
    static getBuiltinFestivals() {
        // NOTE: All dates below are verified for 2026.
        // Dates are FIXED (not year-interpolated) to avoid wrong year math.
        // Festivals before today (March 29, 2026) are intentionally EXCLUDED.
        // Already passed: Republic Day (Jan 26), Shivratri (Feb 26),
        //   Holi (Mar 16), Ram Navami (Mar 26).
        const raw = [
            // ── March 2026 ──────────────────────────────────────────
            { name: 'Eid ul-Fitr',        date: '2026-03-21', type: 'Festival',        states: ['All India'],              description: 'Marks the end of Ramadan. Celebratory feasting, new clothes, and charity (Zakat-al-Fitr).' },
            // ── April 2026 ──────────────────────────────────────────
            { name: 'Good Friday',         date: '2026-04-03', type: 'Public Holiday',  states: ['All India'],              description: 'Commemorates the crucifixion of Jesus Christ. Churches hold solemn services.' },
            { name: 'Easter Sunday',       date: '2026-04-05', type: 'Festival',        states: ['All India'],              description: 'Celebrates the resurrection of Jesus Christ. A major Christian festival.' },
            { name: 'Hanuman Jayanti',     date: '2026-04-06', type: 'Festival',        states: ['All India'],              description: 'Birth anniversary of Lord Hanuman. Devotees visit temples, recite Hanuman Chalisa.' },
            { name: 'Ambedkar Jayanti',    date: '2026-04-14', type: 'Public Holiday',  states: ['All India'],              description: 'Birth anniversary of Dr. B.R. Ambedkar, architect of the Indian Constitution.' },
            { name: 'Baisakhi',            date: '2026-04-14', type: 'Harvest Festival', states: ['Punjab', 'Haryana'],     description: 'Harvest festival marking the Punjabi New Year. Farmers celebrate the Rabi crop harvest.' },
            // ── May 2026 ────────────────────────────────────────────
            { name: 'Buddha Purnima',      date: '2026-05-12', type: 'Festival',        states: ['All India'],              description: 'Celebrates Lord Buddha\'s birth, enlightenment, and death. Prayers, processions, and charity.' },
            // ── June 2026 ───────────────────────────────────────────
            { name: 'Eid ul-Adha',         date: '2026-06-07', type: 'Festival',        states: ['All India'],              description: 'Festival of Sacrifice. Goat/sheep sacrificed, meat distributed among family, friends, and the poor.' },
            // ── July 2026 ───────────────────────────────────────────
            { name: 'Muharram',            date: '2026-07-06', type: 'Public Holiday',  states: ['All India'],              description: 'Islamic New Year and day of mourning for Shia Muslims commemorating Karbala.' },
            // ── August 2026 ─────────────────────────────────────────
            { name: 'Independence Day',    date: '2026-08-15', type: 'National Holiday', states: ['All India'],             description: 'India\'s Independence Day — 79 years of freedom from British rule in 1947.' },
            { name: 'Janmashtami',         date: '2026-08-16', type: 'Festival',        states: ['All India'],              description: 'Celebrates the birth of Lord Krishna. Midnight celebrations, fasting, and dahi-handi events.' },
            { name: 'Ganesh Chaturthi',    date: '2026-08-25', type: 'Festival',        states: ['Maharashtra', 'Goa', 'All India'], description: 'Ten-day festival for Lord Ganesha. Pandals, processions, and grand visarjan (immersion).' },
            // ── October 2026 ────────────────────────────────────────
            { name: 'Gandhi Jayanti',      date: '2026-10-02', type: 'National Holiday', states: ['All India'],             description: 'Birth anniversary of Mahatma Gandhi. Observed with prayer meetings and social service.' },
            { name: 'Navratri',            date: '2026-10-09', type: 'Festival',        states: ['All India'],              description: 'Nine-night festival of Goddess Durga. Garba, dandiya raas, fasting, and puja.' },
            { name: 'Dussehra',            date: '2026-10-19', type: 'Festival',        states: ['All India'],              description: 'Victory of Lord Rama over Ravana. Ram Lila performances and effigy burning.' },
            // ── November 2026 ───────────────────────────────────────
            { name: 'Diwali',              date: '2026-11-09', type: 'Festival',        states: ['All India'],              description: 'Festival of Lights. Lakshmi Puja, fireworks, sweets, and gift-giving.' },
            { name: 'Chhath Puja',         date: '2026-11-13', type: 'Festival',        states: ['Bihar', 'UP', 'Jharkhand', 'All India'], description: 'Sun worship festival. Devotees fast and offer arghya at sunrise and sunset on riverbanks.' },
            { name: 'Guru Nanak Jayanti',  date: '2026-11-24', type: 'Festival',        states: ['Punjab', 'Haryana', 'All India'], description: 'Birth anniversary of Guru Nanak Dev Ji, the founder of Sikhism.' },
            // ── December 2026 ───────────────────────────────────────
            { name: 'Christmas',           date: '2026-12-25', type: 'Public Holiday',  states: ['All India'],              description: 'Birth of Jesus Christ. Gift-giving, plum cakes, church midnight mass, and family gatherings.' },
        ];

        const today = new Date();
        const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        return raw.map(f => ({
            ...f,
            // Always recompute fresh at load time — never trust stale cached values
            days_until: ActionsView.calcDaysUntil(f.date)
        })).filter(f => f.days_until >= 1) // STRICT: only FUTURE festivals (>= 1 day from now)
          .sort((a, b) => a.days_until - b.days_until);
    }

    // ─── HELPERS ──────────────────────────────────────────────────────────────────
    static calcDaysUntil(dateStr) {
        // Parse date parts explicitly to avoid UTC vs local timezone mismatch
        // new Date('2026-03-17') is UTC midnight, but we want local calendar date comparison
        if (!dateStr) return -999;
        const parts = String(dateStr).split('-');
        if (parts.length < 3) return -999;
        const [y, m, d] = parts.map(Number);

        const today = new Date();
        const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const festNorm = new Date(y, m - 1, d); // local calendar date, no timezone shift
        return Math.round((festNorm - todayNorm) / (1000 * 60 * 60 * 24));
    }

    static shareOnWhatsApp(festivalName, actionTitle) {
        const name = festivalName.trim();
        const n = name.toLowerCase();

        // Festival-specific professional message templates
        const templates = {
            'diwali': [
                `🪔 *Diwali Mubarak!* 🪔`,
                ``,
                `This Diwali, light up your home with our *exclusive festive collection!*`,
                ``,
                `✨ *Special Diwali Offers:*`,
                `• Gift combos starting at just ₹199`,
                `• Sweets & dry fruit hampers`,
                `• Diyas, candles & decoration items`,
                `• Free home delivery on orders above ₹500`,
                ``,
                `🎁 *Limited stock — order before it sells out!*`,
                ``,
                `📞 Call or WhatsApp us to place your order.`,
                `⏰ *Offer valid till Diwali only.*`,
            ],
            'eid': [
                `✨ *Eid Mubarak!* ✨`,
                ``,
                `Wishing you and your family a joyful ${name}!`,
                ``,
                `🌙 *Celebrate in Style — Special ${name} Collection is Here:*`,
                `• Fresh sewai & sheer khurma kits`,
                `• Traditional attar & ittar`,
                `• New clothes & festive gift packs`,
                `• Zakat-al-Fitr essentials available`,
                ``,
                `🛍️ *Visit our store or call us to get your order ready before Eid.*`,
                ``,
                `📞 We deliver to your doorstep!`,
                `⏰ *Stock is limited — don't miss out.*`,
            ],
            'holi': [
                `🌈 *Happy Holi!* 🌈`,
                ``,
                `Let's celebrate the festival of colours together!`,
                ``,
                `🎨 *Holi Special Offers at Our Store:*`,
                `• Organic & skin-safe colours`,
                `• Pichkaris & water balloons`,
                `• Gujiya, thandai & sweets`,
                `• Festive gift bundles from ₹99`,
                ``,
                `🛍️ *Order now — we deliver before the celebrations begin!*`,
                `📞 Call or WhatsApp to book your Holi hamper today.`,
            ],
            'navratri|durga|dussehra': [
                `🙏 *Navratri / Dussehra Greetings!* 🙏`,
                ``,
                `May Maa Durga bless you with health, prosperity & happiness!`,
                ``,
                `🕯️ *Festive Offers — Available Now:*`,
                `• Puja samagri & ghee diyas`,
                `• Garba accessories & dandiya sticks`,
                `• Halwa prasad & fasting food items`,
                `• Special discount on bulk orders`,
                ``,
                `🛍️ Come visit us or place your order via WhatsApp.`,
                `📞 *Fast delivery available in your area.*`,
            ],
            'baisakhi': [
                `🌾 *Baisakhi Mubarak!* 🌾`,
                ``,
                `The harvest season is here — and so are our biggest deals of the year!`,
                ``,
                `🎉 *Baisakhi Bumper Offers:*`,
                `• Agricultural supplies at discounted rates`,
                `• Home essentials & electronics deals`,
                `• Festive food hampers & sweets`,
                `• Special offers for farmers & families`,
                ``,
                `💰 *Earn cash rewards on purchases above ₹1,000!*`,
                ``,
                `📞 Visit us today or call to know more.`,
                `⏰ *Limited-period Baisakhi sale — don't wait!*`,
            ],
            'christmas': [
                `🎄 *Merry Christmas!* 🎁`,
                ``,
                `Spread joy this festive season with our Christmas specials!`,
                ``,
                `❄️ *Christmas Offers Just For You:*`,
                `• Plum cakes & Christmas hampers`,
                `• Gift packs for family & friends`,
                `• Home decoration & lights`,
                `• Free wrapping on orders above ₹500`,
                ``,
                `🎅 *Order now for Christmas delivery!*`,
                `📞 Call or WhatsApp us to place your order today.`,
            ],
        };

        // Match the right template
        let lines = null;
        for (const key of Object.keys(templates)) {
            if (key.split('|').some(k => n.includes(k))) {
                lines = templates[key];
                break;
            }
        }

        // Generic professional fallback for any other festival
        if (!lines) {
            lines = [
                `🎊 *${name} Special Offers!* 🎊`,
                ``,
                `Celebrate *${name}* with us and enjoy exclusive festive deals!`,
                ``,
                `🛍️ *What's Available:*`,
                `• Festive gift packs & hampers`,
                `• Special discounts on popular items`,
                `• Home delivery available`,
                `• Bulk order discounts`,
                ``,
                `✅ *Trusted by 500+ customers in your area.*`,
                ``,
                `📞 Call or WhatsApp to place your order.`,
                `⏰ *Festive stock is limited — book early!*`,
            ];
        }

        // Add store signature footer
        lines = lines.concat([
            ``,
            `— *SmartCustomer Store* 🏪`,
            `_Your trusted local shop_`,
        ]);

        const msg = encodeURIComponent(lines.join('\n'));
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    }

    static remindMe(festivalName, date) {
        const festDate = new Date(date);
        const reminder = new Date(festDate); reminder.setDate(reminder.getDate() - 3);
        alert(`✅ Reminder set!\n\nYou will be reminded 3 days before ${festivalName} (around ${reminder.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}).\n\n💡 Tip: Prepare your stock ${5} days before the festival.`);
    }

    // ─── URBAN: ACTION METRICS RENDERER ──────────────────────────────────────────
    static renderActionsMetrics(data, contentId) {
        const content = document.getElementById(contentId);
        if (!content) return;

        const actions = data.actions || [];
        
        if (actions.length === 0) {
            content.innerHTML = `
                <div class="glass-panel motion-slide-up" style="text-align: center; padding: 4rem 2rem;">
                    <div style="background: var(--primary-light); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: var(--primary-color); box-shadow: var(--shadow-glow);">
                        <i class='bx bx-check-double' style="font-size: 3rem;"></i>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 900; letter-spacing: -0.02em;">All Systems Optimal 🎉</h3>
                    <p style="color: var(--text-secondary); margin-top: 0.75rem; line-height: 1.6; font-weight: 500;">Your store is running efficiently. No urgent interventions required. Check back after your next data sync.</p>
                </div>
            `;
            return;
        }

        // Human-friendly action plan generator
        const getActionPlan = (action) => {
            const raw = (action.action_text || action.description || '').toLowerCase();
            const segment = (action.target_segment || action.target || '').toLowerCase();
            const score = Math.round((action.confidence_score || action.score || 0) * 100);
            const revenue = Math.round(action.expected_revenue || 0);

            // Map internal ML codes → human-friendly plans
            const plans = {
                'standard promo': {
                    icon: '🏷️',
                    title: 'Run a Special Offer Campaign',
                    problem: `These customers buy occasionally but haven't been given a reason to buy more. They respond well to simple, straightforward discounts and promotions.`,
                    steps: [
                        'Identify your 10–20 most popular products for this group from past purchase history.',
                        'Create a "Buy 2, Get 1 Free" or "₹X off on orders above ₹Y" deal specifically for them.',
                        'Send a WhatsApp message or SMS today with the offer (use the button below).',
                        'Set a 3–5 day expiry on the offer to create urgency.',
                        'Follow up 2 days before expiry with a reminder message.'
                    ],
                    why: 'This customer group responds best to direct value — discounts and bundles work 3× better than generic messages for them.',
                    color: 'var(--primary-color)'
                },
                'win back': {
                    icon: '🤝',
                    title: 'Win Back Lost Customers',
                    problem: `These customers used to buy from you regularly but have gone silent. Every day they don't return, they risk becoming a permanent loss.`,
                    steps: [
                        'Find customers who haven\'t purchased in the last 60\u201390 days.',
                        'Send a personal "We miss you!" message with their name included.',
                        'Offer a one-time "Welcome Back" discount of 15–25% valid for 7 days.',
                        'Mention a new product or improvement that has happened since they last visited.',
                        'Follow up once more if no response within 3 days.'
                    ],
                    why: 'Winning back an existing customer costs 5× less than acquiring a new one. Even a 20% reactivation rate adds significant revenue.',
                    color: 'var(--warning-color)'
                },
                'vip nurture': {
                    icon: '👑',
                    title: 'Reward & Retain Your Best Customers',
                    problem: `Your VIP customers generate the most revenue but are also at the highest risk of being poached by competitors. Keeping them happy is your #1 priority.`,
                    steps: [
                        'List your top 10 customers by total spend (from the Clients tab).',
                        'Call or personally message each one to thank them for their loyalty.',
                        'Give them early / exclusive access to new stock or upcoming offers.',
                        'Offer a loyalty reward — e.g., a free gift on their next ₹2,000+ order.',
                        'Ask them for a referral — happy VIPs are your best salesperson.'
                    ],
                    why: 'VIP customers who feel valued spend 67% more on average and are far less likely to leave even if competitors offer lower prices.',
                    color: 'var(--success-color)'
                },
                'churn prevention': {
                    icon: '🚨',
                    title: 'Prevent Customers From Leaving',
                    problem: `Our AI has detected customers whose behaviour pattern closely matches customers who stopped buying. Act immediately before they leave for good.`,
                    steps: [
                        'Reach out within 24 hours — delay reduces recovery chance significantly.',
                        'Open with a direct question: "Is everything okay? We noticed you haven\'t visited recently."',
                        'Offer a personalized incentive based on what they usually buy.',
                        'Ask for feedback — often a simple issue (price, service, stock) is the reason.',
                        'Create a follow-up task to check on them again in 2 weeks.'
                    ],
                    why: 'Churn prevention is your highest ROI activity. Customers flagged by AI churn at 3× the rate — acting now recovers ₹' + revenue.toLocaleString() + '+ in potential lost revenue.',
                    color: 'var(--danger-color)'
                },
                'upsell': {
                    icon: '📈',
                    title: 'Increase Order Value per Customer',
                    problem: `These customers are buying regularly but at a lower spend than their potential. They trust you — now is the time to offer them more.`,
                    steps: [
                        'Look at what each customer normally buys and identify a complementary product.',
                        'When they next contact you or visit, suggest the add-on: "Customers who buy X also love Y."',
                        'Bundle items into a package deal at a slight discount (e.g., 10% off if they add to their usual order).',
                        'Highlight the value, not the price: "This will save you ₹200 over buying separately."',
                        'Make it easy — pre-bundle the product and offer one-tap ordering if possible.'
                    ],
                    why: 'Upselling to existing buyers is 9× more likely to convert than selling to a new customer. Even a ₹200 increase per order compounds significantly at scale.',
                    color: 'var(--primary-color)'
                },
            };

            // Find best matching plan
            let plan = null;
            for (const key of Object.keys(plans)) {
                if (raw.includes(key) || segment.includes(key.split(' ')[0])) {
                    plan = plans[key];
                    break;
                }
            }

            // Smart fallback based on segment name
            if (!plan) {
                if (segment.includes('vip') || segment.includes('premium')) plan = plans['vip nurture'];
                else if (segment.includes('churn') || segment.includes('risk') || segment.includes('lost')) plan = plans['churn prevention'];
                else if (segment.includes('win') || segment.includes('lapsed') || segment.includes('dormant')) plan = plans['win back'];
                else if (segment.includes('upsell') || segment.includes('grow')) plan = plans['upsell'];
                else plan = plans['standard promo'];
            }

            return { ...plan, score, revenue };
        };

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div>
                    <h2 style="font-size: 1.1rem; font-weight: 900; letter-spacing: -0.02em;">Today's Action Plan</h2>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; margin-top: 0.2rem;">${actions.length} priority action${actions.length > 1 ? 's' : ''} — AI ranked by impact</p>
                </div>
                <div style="font-size: 0.7rem; color: var(--success-color); background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 0.3rem 0.65rem; border-radius: 20px; font-weight: 700;">
                    <i class='bx bx-refresh'></i> Live
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1.75rem;">
        `;

        actions.forEach((action, idx) => {
            const plan = getActionPlan(action);
            const segment = action.target_segment || action.target || 'Your Customers';
            const priority = action.priority || 'medium';
            const priorityColor = priority === 'high' ? 'var(--danger-color)' : (priority === 'medium' ? 'var(--primary-color)' : 'var(--success-color)');
            const priorityLabel = priority.toUpperCase();
            
            const title = action.title || plan.title;

            html += `
                <div class="glass-panel motion-slide-up motion-stagger-${(idx % 3) + 1}" style="border-left: 6px solid ${priorityColor}; padding: 0;">
                    
                    <!-- Card Header -->
                    <div style="padding: 1.25rem 1.4rem 1rem; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: ${priorityColor}; background: ${priorityColor}15; padding: 0.2rem 0.5rem; border-radius: 4px;">
                                        ${priorityLabel} PRIORITY
                                    </span>
                                    <span style="font-size: 0.65rem; font-weight: 700; color: var(--text-secondary);">
                                        · ID: #${action.id}
                                    </span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <span style="font-size: 1.75rem;">${plan.icon}</span>
                                    <h3 style="font-size: 1.15rem; font-weight: 900; letter-spacing: -0.03em; line-height: 1.25;">${title}</h3>
                                </div>
                                <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    <span style="font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem; background: ${plan.color}15; color: ${plan.color}; border-radius: 6px; border: 1px solid ${plan.color}30;">
                                        👥 ${segment}
                                    </span>
                                    <span style="font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem; background: var(--bg-color); color: var(--text-secondary); border-radius: 6px; border: 1px solid var(--border-color);">
                                        🤖 AI Confidence: ${plan.score}%
                                    </span>
                                    ${plan.revenue > 0 ? `<span style="font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem; background: rgba(16,185,129,0.08); color: var(--success-color); border-radius: 6px; border: 1px solid rgba(16,185,129,0.2);">
                                        💰 +₹${plan.revenue.toLocaleString()} potential
                                    </span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- What's the problem -->
                    <div style="padding: 1rem 1.4rem; background: var(--bg-color); border-bottom: 1px solid var(--border-color);">
                        <div style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 0.5rem;">
                            📌 Why This Matters
                        </div>
                        <p style="font-size: 0.84rem; line-height: 1.65; color: var(--text-primary);">${plan.problem}</p>
                    </div>

                    <!-- Step-by-step Action Plan -->
                    <div style="padding: 1rem 1.4rem; border-bottom: 1px solid var(--border-color);">
                        <div style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 0.75rem;">
                            ✅ Your Step-by-Step Plan
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.55rem;">
                            ${plan.steps.map((step, i) => `
                                <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                                    <div style="width: 22px; height: 22px; border-radius: 50%; background: ${plan.color}18; border: 1.5px solid ${plan.color}40; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                                        <span style="font-size: 0.65rem; font-weight: 900; color: ${plan.color};">${i + 1}</span>
                                    </div>
                                    <p style="font-size: 0.82rem; line-height: 1.55; color: var(--text-primary); flex: 1;">${step}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Why it works -->
                    <div style="padding: 0.85rem 1.4rem; background: ${plan.color}08; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; gap: 0.6rem; align-items: flex-start;">
                            <span style="font-size: 1rem; flex-shrink: 0;">💡</span>
                            <p style="font-size: 0.8rem; line-height: 1.6; color: var(--text-secondary); font-style: italic;">${plan.why}</p>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="padding: 1rem 1.4rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <button class="btn execute-btn" data-id="${action.id}" data-type="whatsapp" style="background-color: #25D366; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.82rem;">
                            <i class='bx bxl-whatsapp'></i> Send WhatsApp
                        </button>
                        <button class="btn btn-premium execute-btn" data-id="${action.id}" data-type="sms" style="border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.82rem;">
                            <i class='bx bx-message-square-detail'></i> Send SMS
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        content.innerHTML = html;

        setTimeout(() => {
            document.querySelectorAll('.execute-btn').forEach(btn => {
                btn.onclick = (e) => ActionsView.handleExecuteAction(e);
            });
        }, 100);
    }

    static async handleExecuteAction(e) {
        const btn = e.currentTarget;
        const actionId = btn.getAttribute('data-id');
        const executionType = btn.getAttribute('data-type');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Deploying...`;
        btn.disabled = true;

        try {
            const data = await window.ApiClient.executeAction(actionId, executionType);
            if (data.deep_link) {
                window.open(data.deep_link, '_blank');
            } else {
                alert('AI Recommendation Triggered Successfully.');
            }
            btn.innerHTML = `<i class='bx bx-check-double'></i> Completed`;
            btn.style.background = 'var(--success-color)';
        } catch (error) {
            btn.innerHTML = `<i class='bx bx-error-circle'></i> Retry`;
            btn.style.background = 'var(--danger-color)';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.background = executionType === 'whatsapp' ? '#25D366' : 'var(--primary-color)';
            }, 3000);
        }
    }
}

window.ActionsView = ActionsView;
