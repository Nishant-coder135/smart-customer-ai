class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.commands = [
            { id: 'mode_urban', title: 'Switch to Urban Mode', icon: 'bx-buildings', section: 'Quick Actions', action: () => this.switchMode('urban') },
            { id: 'mode_rural', title: 'Switch to Rural Mode', icon: 'bx-landscape', section: 'Quick Actions', action: () => this.switchMode('rural') },
            { id: 'nav_data', title: 'Go to Data Ingestion', icon: 'bx-upload', section: 'Navigation', action: () => switchTab('data') },
            { id: 'nav_advisor', title: 'Chat with AI Advisor', icon: 'bx-bot', section: 'Navigation', action: () => switchTab('advisor') },
            { id: 'nav_actions', title: 'Open Actions Hub', icon: 'bx-list-check', section: 'Navigation', action: () => switchTab('actions') },
            { id: 'run_strategy', title: 'Generate New Strategy', icon: 'bx-magic-wand', section: 'Intelligence', action: () => switchTab('advisor') },
            { id: 'export_report', title: 'Export Business Report', icon: 'bx-export', section: 'Operations', action: () => window.ExportView && ExportView.render() }
        ];
        this.init();
    }

    init() {
        // Only initialize once
        if (document.getElementById('command-palette')) return;

        const el = document.createElement('div');
        el.id = 'command-palette';
        el.className = 'glass-panel';
        el.style.cssText = `
            position: fixed;
            top: 15%;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            width: 90%;
            max-width: 600px;
            max-height: 450px;
            z-index: 10000;
            display: none;
            flex-direction: column;
            box-shadow: var(--shadow-float), var(--shadow-glow);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            backdrop-filter: blur(25px) saturate(200%);
            -webkit-backdrop-filter: blur(25px) saturate(200%);
        `;

        el.innerHTML = `
            <div style="padding: 1.25rem; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; gap: 1rem;">
                <i class='bx bx-search' style="font-size: 1.5rem; color: var(--primary-color);"></i>
                <input type="text" id="cmd-input" placeholder="Search commands... (Tab to navigate)" 
                    style="background: transparent; border: none; outline: none; color: var(--text-primary); width: 100%; font-size: 1.1rem; font-weight: 600;">
                <div style="font-size: 0.7rem; color: var(--text-secondary); background: var(--primary-light); padding: 0.3rem 0.6rem; border-radius: 6px; font-weight: 800;">ESC</div>
            </div>
            <div id="cmd-list" style="overflow-y: auto; padding: 0.75rem; flex: 1;"></div>
        `;

        document.body.appendChild(el);

        const backdrop = document.createElement('div');
        backdrop.id = 'cmd-backdrop';
        backdrop.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0,0,0,0.4); z-index: 9999; display: none; opacity: 0;
            transition: opacity 0.3s; backdrop-filter: blur(4px);
        `;
        document.body.appendChild(backdrop);

        this.el = el;
        this.backdrop = backdrop;
        this.input = el.querySelector('#cmd-input');
        this.list = el.querySelector('#cmd-list');

        this.setupListeners();
        this.renderList();
    }

    setupListeners() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.isOpen) this.close();
        });

        this.backdrop.addEventListener('click', () => this.close());

        this.input.addEventListener('input', () => this.renderList(this.input.value));
        
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const first = this.list.querySelector('.search-item');
                if (first) first.click();
            }
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.backdrop.style.display = 'block';
        this.el.style.display = 'flex';
        setTimeout(() => {
            this.backdrop.style.opacity = '1';
            this.el.style.opacity = '1';
            this.el.style.transform = 'translateX(-50%) translateY(0)';
            this.input.focus();
        }, 10);
    }

    close() {
        this.isOpen = false;
        this.backdrop.style.opacity = '0';
        this.el.style.opacity = '0';
        this.el.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
            this.backdrop.style.display = 'none';
            this.el.style.display = 'none';
            this.input.value = '';
            this.renderList();
        }, 300);
    }

    renderList(filter = '') {
        const filtered = this.commands.filter(c => 
            c.title.toLowerCase().includes(filter.toLowerCase()) || 
            c.section.toLowerCase().includes(filter.toLowerCase())
        );

        let html = '';
        let lastSection = '';

        filtered.forEach(cmd => {
            if (cmd.section !== lastSection) {
                html += `<div style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); margin: 0.75rem 0.5rem 0.4rem; letter-spacing: 0.1em;">${cmd.section}</div>`;
                lastSection = cmd.section;
            }
            html += `
                <div class="search-item" onclick="window.commandPalette.execute('${cmd.id}')"
                    style="padding: 0.85rem 1rem; border-radius: 12px; display: flex; align-items: center; gap: 0.85rem; cursor: pointer; transition: all 0.2s; color: var(--text-primary);">
                    <i class='bx ${cmd.icon}' style="font-size: 1.3rem; color: var(--primary-color);"></i>
                    <span style="font-weight: 600; font-size: 0.95rem;">${cmd.title}</span>
                </div>
            `;
        });

        if (filtered.length === 0) {
            html = `<div style="padding: 2rem; text-align: center; color: var(--text-secondary); font-weight: 600;">No commands found for "${filter}"</div>`;
        }

        this.list.innerHTML = html;

        // Add hover styles via CSS injection once
        if (!document.getElementById('cmd-styles')) {
            const style = document.createElement('style');
            style.id = 'cmd-styles';
            style.textContent = `
                .search-item:hover { background: var(--primary-light); transform: translateX(5px); }
                .search-item:active { transform: scale(0.98); }
            `;
            document.head.appendChild(style);
        }
    }

    execute(id) {
        const cmd = this.commands.find(c => c.id === id);
        if (cmd) {
            this.close();
            cmd.action();
        }
    }

    switchMode(mode) {
        localStorage.setItem('businessMode', mode);
        window.location.reload();
    }
}

// Global instance
window.commandPalette = new CommandPalette();
