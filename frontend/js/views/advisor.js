class AdvisorView {
    // History is now maintained at window level to persist across tab switches

    static async render(containerId) {
        const container = document.getElementById(containerId);
        
        // Fetch history from DB if not already loaded in this session
        if (!window._advisorHistory || window._advisorHistory.length === 0) {
            try {
                const history = await ApiClient.getChatHistory();
                window._advisorHistory = history.map(m => ({ role: m.role, content: m.content }));
            } catch (e) {
                console.warn("[Advisor] History fetch failed", e);
                window._advisorHistory = [];
            }
        }

        container.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; height: 100%; overflow: hidden; position: relative;">

                <!-- Header Banner -->
                <div style="background: linear-gradient(135deg, hsla(var(--p-h), var(--p-s), var(--p-l), 0.15) 0%, hsla(259, 94%, 71%, 0.08) 100%); border-bottom: 1px solid var(--border-color); padding: 1.25rem 1.25rem 1rem; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 0.9rem;">
                        <div style="width: 46px; height: 46px; border-radius: 16px; background: linear-gradient(135deg, var(--primary-color), #8b5cf6); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px hsla(var(--p-h), var(--p-s), var(--p-l), 0.4); flex-shrink: 0; position: relative;">
                            <i class='bx bx-brain' style="font-size: 1.5rem; color: white;"></i>
                            <div style="width: 10px; height: 10px; background: #10b981; border-radius: 50%; border: 2px solid var(--surface-color); position: absolute; bottom: -1px; right: -1px;"></div>
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 1.05rem; letter-spacing: -0.02em;">AI Business Strategist</div>
                            <div style="font-size: 0.72rem; color: var(--success-color); font-weight: 700; display: flex; align-items: center; gap: 0.3rem; margin-top: 0.1rem;">
                                <div style="width: 6px; height: 6px; background: var(--success-color); border-radius: 50%; animation: pulse 2s infinite;"></div>
                                Live · Powered by your business data
                            </div>
                        </div>
                        <div id="ai-model-badge" style="margin-left: auto; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.35rem 0.7rem; font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                            Multi-AI Enhanced
                        </div>
                    </div>
                </div>

                <!-- Chat Messages Area -->
                <div id="messages-container" style="flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; scroll-behavior: smooth;">
                    ${window._advisorHistory && window._advisorHistory.length === 0 ? `
                        <!-- Welcome Bubble -->
                        <div class="advisor-msg-ai animate-fadeIn">
                            <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                                <div style="width: 34px; height: 34px; border-radius: 12px; background: linear-gradient(135deg, var(--primary-color), #8b5cf6); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                                    <i class='bx bxs-zap' style="font-size: 1rem; color: white;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem;">Advisor · Just now</div>
                                    <div style="background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 0 18px 18px 18px; padding: 1rem 1.15rem; font-size: 0.9rem; line-height: 1.65; color: var(--text-primary); font-weight: 500;">
                                        👋 Hello! I'm your <strong>SmartCustomer AI Strategist</strong>. I analyse your live business data to answer your most pressing questions.<br><br>
                                        Ask me anything — from <em>"Why is revenue dropping?"</em> to <em>"Which customers should I target today?"</em>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Quick Prompts Area -->
                    <div id="quick-prompts" style="padding-left: 2.85rem;">
                        <div style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">Quick Actions</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${[
                                '💰 Why is revenue low?',
                                '⚠️ Who might churn?',
                                '📈 Top growth strategy',
                                '🏆 Best performing segment',
                                '📅 What to do today?'
                            ].map(q => `
                                <button onclick="AdvisorView.sendQuickPrompt(this, '${q.substring(2).trim()}')"
                                    style="background: var(--bg-color); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 0.4rem 0.85rem; font-size: 0.78rem; font-weight: 700; color: var(--text-primary); cursor: pointer; transition: all 0.2s; white-space: nowrap;"
                                    onmouseover="this.style.borderColor='var(--primary-color)'; this.style.color='var(--primary-color)'"
                                    onmouseout="this.style.borderColor='var(--border-color)'; this.style.color='var(--text-primary)'"
                                >${q}</button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Input Area -->
                <div style="flex-shrink: 0; border-top: 1px solid var(--border-color); background: var(--surface-color); padding: 0.85rem 1rem; padding-bottom: max(0.85rem, env(safe-area-inset-bottom));">
                    <form id="chat-form" style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-color); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 0.55rem 0.55rem 0.55rem 1rem; transition: border-color 0.2s;"
                        onfocus-within="this.style.borderColor='var(--primary-color)'">
                        <input type="text" id="chat-input" placeholder="Ask about your business..." autocomplete="off"
                            style="flex: 1; background: transparent; border: none; outline: none; font-size: 0.9rem; color: var(--text-primary); font-family: inherit; font-weight: 500;"
                            onfocus="document.getElementById('chat-form').style.borderColor='var(--primary-color)'"
                            onblur="document.getElementById('chat-form').style.borderColor='var(--border-color)'"
                        >
                        <button type="submit" id="chat-send"
                            style="width: 38px; height: 38px; border-radius: 12px; border: none; background: linear-gradient(135deg, var(--primary-color), #8b5cf6); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; box-shadow: 0 4px 12px hsla(var(--p-h), var(--p-s), var(--p-l), 0.4);"
                            onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
                            <i class='bx bx-send' style="font-size: 1.1rem;"></i>
                        </button>
                    </form>
                    <div style="text-align: center; font-size: 0.6rem; color: var(--text-secondary); margin-top: 0.45rem; opacity: 0.6; font-weight: 600;">AI may make mistakes. Verify critical business decisions.</div>
                </div>
            </div>

            <style>
                .advisor-msg-ai { animation: fadeInUp 0.3s ease-out; }
                .advisor-msg-user { animation: fadeInUp 0.3s ease-out; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                @keyframes dotBounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
                #chat-messages::-webkit-scrollbar { width: 3px; }
                #chat-messages::-webkit-scrollbar-track { background: transparent; }
                #chat-messages::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
            </style>
        `;

        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            AdvisorView.handleSend();
        });

        // Re-render historical messages if they exist
        if (window._advisorHistory.length > 0) {
            window._advisorHistory.forEach(msg => {
                if (msg.role === 'user') {
                    this.appendUserMessage(msg.content, false);
                } else {
                    let formatted = this._formatMessage(msg.content);
                    this.appendAiMessage(formatted, false, msg.content); // Pass raw content for buttons
                }
            });
        }

        this.scrollToBottom();
    }

    static activeAudio = null;
    static activeVoiceBtn = null;

    static stopAllVoice() {
        if (this.activeAudio) {
            this.activeAudio.pause();
            this.activeAudio = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (this.activeVoiceBtn) {
            const icon = this.activeVoiceBtn.querySelector('i');
            if (icon) icon.className = 'bx bx-volume-full';
            this.activeVoiceBtn.disabled = false;
            this.activeVoiceBtn.title = "Listen to Advisor";
            this.activeVoiceBtn = null;
        }
    }

    static _cleanTextForSpeech(text) {
        if (!text) return "";
        let clean = text
            .replace(/\*\*+(.*?)\*\*+/g, '$1') // Remove Bold
            .replace(/\*(.*?)\*/g, '$1')      // Remove Italic
            .replace(/#+\s*(.*?)\n/g, '$1. ') // Headings
            .replace(/#+\s*(.*)/g, '$1')      // End of line headings
            .replace(/\[\[.*?\]\]/g, '')      // Navigation Tags
            .replace(/_/g, ' ')               // Underscores
            .replace(/`/g, '')                // Backticks
            .replace(/<think>[\s\S]*?<\/think>/gi, '') // Remove thinking tags
            .replace(/<think>[\s\S]*/gi, '')          // Handle unclosed tags
            .replace(/[\s\S]*?<\/think>/gi, '')      // Handle unopend tags
            .replace(/\s+/g, ' ')                    // Collapse whitespace
            .trim();
        return clean;
    }

    static async playVoice(btn, text) {
        // TOGGLE: If already playing this button, stop and return
        if (this.activeVoiceBtn === btn) {
            this.stopAllVoice();
            return;
        }

        // STOP PREVIOUS: If something else is playing, stop it first
        this.stopAllVoice();

        const icon = btn.querySelector('i');
        const originalClass = 'bx bx-volume-full';
        
        icon.className = 'bx bx-loader-alt bx-spin';
        btn.disabled = false; // Keep enabled so user can click "Stop"
        btn.title = "Stop Speaking";
        this.activeVoiceBtn = btn;

        try {
            const result = await ApiClient.synthesizeVoice(text);
            
            // Re-check if user cancelled while loading
            if (this.activeVoiceBtn !== btn) return;

            // If we have a real URL and it's NOT a simulation, play it
            if (result && result.url && !result.isSimulation) {
                const audio = new Audio(result.url);
                this.activeAudio = audio;
                
                audio.onended = () => {
                    if (this.activeVoiceBtn === btn) {
                        icon.className = originalClass;
                        btn.title = "Listen to Advisor";
                        this.activeVoiceBtn = null;
                    }
                    URL.revokeObjectURL(result.url);
                };
                audio.play();
                icon.className = 'bx bx-stop-circle'; // Show stop icon
                return;
            }

            // FALLBACK: Browser Native Speech Synthesis
            if (result && result.isSimulation) {
                showToast("Switching to local voice engine...", "info");
            }

            if ('speechSynthesis' in window) {
                // IMPORTANT: We clean the text for the local browser speech too!
                const cleanText = this._cleanTextForSpeech(text);
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                
                utterance.onstart = () => {
                    if (this.activeVoiceBtn === btn) {
                        icon.className = 'bx bx-stop-circle';
                    }
                };
                
                utterance.onend = () => {
                    if (this.activeVoiceBtn === btn) {
                        icon.className = originalClass;
                        btn.title = "Listen to Advisor";
                        this.activeVoiceBtn = null;
                    }
                };
                
                utterance.onerror = () => {
                    if (this.activeVoiceBtn === btn) {
                        icon.className = originalClass;
                        btn.title = "Listen to Advisor";
                        this.activeVoiceBtn = null;
                    }
                };

                window.speechSynthesis.speak(utterance);
            } else {
                throw new Error("Speech synthesis not supported.");
            }

        } catch (e) {
            console.error("Voice error:", e);
            icon.className = 'bx bx-error';
            setTimeout(() => {
                if (this.activeVoiceBtn === btn || !this.activeVoiceBtn) {
                     icon.className = originalClass;
                     this.activeVoiceBtn = null;
                }
            }, 2000);
        }
    }

    static _formatMessage(text) {
        if (!text) return "";
        let html = text
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            .replace(/[\s\S]*?<\/think>/gi, '')
            .replace(/\n\n/g, '</p><p style="margin-top:0.75rem">')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Parse Deep Links [[TAB:NAME]]
        html = html.replace(/\[\[TAB:(.*?)\]\]/g, (match, tab) => {
            let tabName = tab.trim().toUpperCase();
            const labelMap = { 'ACTIONS': 'Go to Actions', 'DATA': 'Manage Data', 'DASH': 'View Dashboard', 'DASHBOARD': 'View Dashboard', 'CLIENTS': 'View Clients' };
            const label = labelMap[tabName] || `Open ${tabName}`;
            
            // Normalize for switchTab
            let route = tabName.toLowerCase();
            if (route === 'dash') route = 'dashboard';
            
            return `<button onclick="window.switchTab('${route}')" 
                style="display: inline-flex; align-items: center; gap: 0.4rem; background: hsla(var(--p-h), var(--p-s), var(--p-l), 0.15); border: 1px solid var(--primary-color); color: var(--primary-color); padding: 0.35rem 0.75rem; border-radius: 10px; font-size: 0.75rem; font-weight: 800; cursor: pointer; margin-top: 0.5rem; transition: all 0.2s;"
                onmouseover="this.style.background='var(--primary-color)'; this.style.color='white';"
                onmouseout="this.style.background='hsla(var(--p-h), var(--p-s), var(--p-l), 0.15)'; this.style.color='var(--primary-color)';"
            ><i class='bx bxs-navigation'></i> ${label}</button>`;
        });

        return html;
    }

    static sendQuickPrompt(btn, text) {
        // Hide quick prompts
        const qp = document.getElementById('quick-prompts');
        if (qp) qp.style.display = 'none';

        document.getElementById('chat-input').value = text;
        AdvisorView.handleSend();
    }

    static scrollToBottom() {
        const el = document.getElementById('messages-container');
        if (el) el.scrollTop = el.scrollHeight;
    }

    static async handleSend() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send');
        const text = input.value.trim();
        if (!text) return;

        // Stop any active voice when sending new prompt
        this.stopAllVoice();

        // Hide quick prompts on first message

        const qp = document.getElementById('quick-prompts');
        if (qp) qp.style.display = 'none';

        this.appendUserMessage(text, true);

        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<i class='bx bx-loader-alt' style="animation: spin 1s linear infinite; font-size: 1.1rem;"></i>`;
        sendBtn.style.background = 'var(--surface-color)';

        const loaderId = 'loader-' + Date.now();
        this.appendTypingIndicator(loaderId);
        this.scrollToBottom();

        try {
            // Backend now tracks history; we just send the new message
            const data = await ApiClient.sendAdvisorMessage(text);
            document.getElementById(loaderId)?.remove();

            let formatted = this._formatMessage(data.reply);
            formatted = `<p>${formatted}</p>`;

            this.appendAiMessage(formatted, true, data.reply);
        } catch (err) {
            document.getElementById(loaderId)?.remove();
            this.appendAiMessage(`<span style="color: var(--danger-color);"><i class='bx bx-error'></i> Could not connect to the advisory engine. Please check your connection.</span>`);
        }

        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<i class='bx bx-send' style="font-size: 1.1rem;"></i>`;
        sendBtn.style.background = 'linear-gradient(135deg, var(--primary-color), #8b5cf6)';
        input.focus();
        this.scrollToBottom();
    }

    static appendUserMessage(text, persist = true) {
        if (persist) window._advisorHistory.push({ role: 'user', content: text });
        const messages = document.getElementById('messages-container');
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messages.insertAdjacentHTML('beforeend', `
            <div class="advisor-msg-user" style="display: flex; justify-content: flex-end; align-items: flex-start; gap: 0.65rem;">
                <div style="max-width: 78%;">
                    <div style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; text-align: right;">You · ${now}</div>
                    <div style="background: linear-gradient(135deg, var(--primary-color), #8b5cf6); border-radius: 18px 0 18px 18px; padding: 0.85rem 1.15rem; font-size: 0.9rem; line-height: 1.55; color: white; font-weight: 600; box-shadow: 0 4px 14px hsla(var(--p-h), var(--p-s), var(--p-l), 0.35);">
                        ${text}
                    </div>
                </div>
                <div style="width: 34px; height: 34px; border-radius: 12px; background: var(--surface-color); border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 22px;">
                    <i class='bx bx-user' style="font-size: 1rem; color: var(--text-secondary);"></i>
                </div>
            </div>
        `);
        this.scrollToBottom();
    }

    static appendAiMessage(html, persist = true, rawText = "") {
        if (persist) window._advisorHistory.push({ role: 'assistant', content: rawText });
        const messages = document.getElementById('messages-container');
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Escape rawText for attribute storage to avoid JS crashes in onclick handlers
        const escapedRaw = rawText.replace(/"/g, "&quot;");

        messages.insertAdjacentHTML('beforeend', `
            <div class="advisor-msg-ai" data-raw="${escapedRaw}" style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <div style="width: 34px; height: 34px; border-radius: 12px; background: linear-gradient(135deg, var(--primary-color), #8b5cf6); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 22px; box-shadow: 0 4px 12px hsla(var(--p-h), var(--p-s), var(--p-l), 0.3);">
                    <i class='bx bxs-zap' style="font-size: 1rem; color: white;"></i>
                </div>
                <div style="flex: 1; max-width: 88%;">
                    <div style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem;">Advisor · ${now}</div>
                    <div class="advisor-msg-bubble" style="background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 0 18px 18px 18px; padding: 1rem 1.15rem; font-size: 0.9rem; line-height: 1.7; color: var(--text-primary); font-weight: 500; position: relative;">
                        ${html}
                        <div style="display: flex; gap: 0.6rem; justify-content: flex-end; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid hsla(var(--border-h), var(--border-s), var(--border-l), 0.5);">
                            <button onclick="AdvisorView.generateVisual(this, this.closest('.advisor-msg-ai').getAttribute('data-raw'))" 
                                style="background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.3rem 0.6rem; display: flex; align-items: center; gap: 0.3rem; cursor: pointer; color: var(--text-secondary); transition: all 0.2s; font-size: 0.65rem; font-weight: 700;"
                                onmouseover="this.style.color='var(--success-color)'; this.style.borderColor='var(--success-color)'"
                                onmouseout="this.style.color='var(--text-secondary)'; this.style.borderColor='var(--border-color)'"
                                title="Generate Visual Strategy">
                                <i class='bx bx-image-add' style="font-size: 0.9rem;"></i> Visual
                            </button>
                            <button onclick="AdvisorView.playVoice(this, this.closest('.advisor-msg-ai').getAttribute('data-raw'))" 
                                style="background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.3rem 0.6rem; display: flex; align-items: center; gap: 0.3rem; cursor: pointer; color: var(--text-secondary); transition: all 0.2s; font-size: 0.65rem; font-weight: 700;"
                                onmouseover="this.style.color='var(--primary-color)'; this.style.borderColor='var(--primary-color)'"
                                onmouseout="this.style.color='var(--text-secondary)'; this.style.borderColor='var(--border-color)'"
                                title="Listen to Advisor">
                                <i class='bx bx-volume-full' style="font-size: 0.9rem;"></i> Listen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        this.scrollToBottom();
    }

    static async generateVisual(btn, text) {
        const icon = btn.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'bx bx-loader-alt bx-spin';
        btn.disabled = true;

        try {
            const result = await ApiClient.generateVisual(text);
            if (result && result.url) {
                if (result.isSimulation) {
                    showToast("Marketing Visual Simulation: Using generic strategy layout.", "warning");
                }
                const imageUrl = result.url;
                const bubble = btn.closest('.advisor-msg-ai').querySelector('.advisor-msg-bubble');
                
                if (!bubble) throw new Error("Could not find message bubble container.");
            
            const imgContainer = document.createElement('div');
            imgContainer.style.marginTop = '1rem';
            imgContainer.style.borderRadius = '12px';
            imgContainer.style.overflow = 'hidden';
            imgContainer.style.border = '1px solid var(--border-color)';
            imgContainer.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
            imgContainer.className = 'animate-fadeIn';
            
            imgContainer.innerHTML = `
                <img src="${imageUrl}" style="width: 100%; display: block; filter: brightness(0.95) contrast(1.1);">
                <div style="background: var(--bg-color); padding: 0.6rem; font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-align: center; border-top: 1px solid var(--border-color);">
                    <i class='bx bx-sparkles' style="color: var(--primary-color);"></i> AI GENERATED MARKETING STRATEGY VISUAL
                </div>
            `;
            bubble.appendChild(imgContainer);
            this.scrollToBottom();
            icon.className = 'bx bx-check';
            setTimeout(() => icon.className = 'bx bx-image-add', 3000);
            } else {
                icon.className = 'bx bx-error';
                setTimeout(() => icon.className = 'bx bx-image-add', 3000);
            }
        } catch (e) {
            console.error(e);
            icon.className = 'bx bx-error';
            setTimeout(() => icon.className = 'bx bx-image-add', 3000);
        } finally {
            btn.disabled = false;
        }
    }

    static appendTypingIndicator(id) {
        const messages = document.getElementById('messages-container');
        if (!messages) return;
        messages.insertAdjacentHTML('beforeend', `
            <div id="${id}" style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <div style="width: 34px; height: 34px; border-radius: 12px; background: linear-gradient(135deg, var(--primary-color), #8b5cf6); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class='bx bxs-zap' style="font-size: 1rem; color: white;"></i>
                </div>
                <div style="background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 0 18px 18px 18px; padding: 0.85rem 1.2rem; display: flex; align-items: center; gap: 0.35rem;">
                    <div style="width: 7px; height: 7px; background: var(--primary-color); border-radius: 50%; animation: dotBounce 1.2s ease-in-out infinite; animation-delay: 0s;"></div>
                    <div style="width: 7px; height: 7px; background: var(--primary-color); border-radius: 50%; animation: dotBounce 1.2s ease-in-out infinite; animation-delay: 0.2s;"></div>
                    <div style="width: 7px; height: 7px; background: var(--primary-color); border-radius: 50%; animation: dotBounce 1.2s ease-in-out infinite; animation-delay: 0.4s;"></div>
                </div>
            </div>
        `);
        this.scrollToBottom();
    }

    static scrollToBottom() {
        const container = document.getElementById('messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

window.AdvisorView = AdvisorView;
