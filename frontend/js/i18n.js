/**
 * SmartCustomer AI — Centralized i18n Translation Engine
 * After every view render, call window.I18n.apply() to translate the DOM.
 * Supports: English (en), Hindi (hi), Marathi (mr), Tamil (ta)
 */

window.I18n = (function () {

    const translations = {
        hi: {
            // --- Navigation ---
            "Dash": "डैश",
            "Actions": "कार्य",
            "Sync": "सिंक",
            "Clients": "ग्राहक",
            "Suite": "सूट",

            // --- Dashboard ---
            "Urban HQ": "अर्बन मुख्यालय",
            "Rural Store": "ग्रामीण स्टोर",
            "AI Layer Active": "AI परत सक्रिय",
            "Offline Operations": "ऑफ़लाइन संचालन",
            "Revenue": "राजस्व",
            "Total Base": "कुल ग्राहक",
            "Active Records": "सक्रिय रिकॉर्ड",
            "Health Score": "स्वास्थ्य स्कोर",
            "Strategy Insights": "रणनीति अंतर्दृष्टि",
            "AI Analysis Pending": "AI विश्लेषण प्रतीक्षित",
            "Upload your business data to generate real-time growth strategies.": "रियल-टाइम विकास रणनीति बनाने के लिए अपना व्यापार डेटा अपलोड करें।",
            "Customer Segmentation": "ग्राहक विभाजन",
            "Cash vs Credit Flow": "नकद बनाम उधार प्रवाह",
            "CASH PAYMENTS": "नकद भुगतान",
            "UDHAAR (CREDIT)": "उधार (क्रेडिट)",
            "customers paid cash": "ग्राहकों ने नकद भुगतान किया",
            "customers have udhaar": "ग्राहकों का उधार है",
            "pending": "बकाया",
            "CONSULTING AI ADVISOR...": "AI सलाहकार से संपर्क हो रहा है...",

            // --- Actions ---
            "Daily Roadmap": "दैनिक रोडमैप",
            "Your ML-driven prioritized tasks for maximum growth.": "अधिकतम विकास के लिए ML-संचालित प्राथमिकता कार्य।",
            "SIMULATING MARKET SCENARIOS...": "बाज़ार परिदृश्यों का अनुकरण हो रहा है...",
            "Priority Pipeline": "प्राथमिकता पाइपलाइन",
            "Updated Now": "अभी अपडेट हुआ",
            "Critical Priority": "गंभीर प्राथमिकता",
            "Recommended": "अनुशंसित",
            "AI Logic:": "AI तर्क:",
            "WhatsApp": "व्हाट्सऐप",
            "SMS": "SMS",
            "Peak Efficiency Reached": "अधिकतम दक्षता प्राप्त",
            "No critical performance gaps detected for today.": "आज कोई गंभीर प्रदर्शन अंतराल नहीं मिला।",
            "Upload Data to Activate": "सक्रिय करने के लिए डेटा अपलोड करें",
            "Sync Business Data": "व्यापार डेटा सिंक करें",
            "Festival Business Opportunities": "उत्सव व्यापार अवसर",
            "DAYS LEFT": "दिन बाकी",
            "Strategy:": "रणनीति:",
            "This Week!": "इस सप्ताह!",
            "Coming Soon": "जल्द आ रहा है",
            "Upcoming": "आने वाला",
            "Deploying...": "तैनात हो रहा है...",
            "Completed": "पूर्ण",

            // --- Data Ingest ---
            "Data Management": "डेटा प्रबंधन",
            "Sync CSV Records": "CSV रिकॉर्ड सिंक करें",
            "Enterprise Retail Data Format": "एंटरप्राइज़ रिटेल डेटा फ़ॉर्मेट",
            "Drop file here or click to select": "फ़ाइल यहाँ छोड़ें या चुनने के लिए क्लिक करें",
            "Analyze & Ingest Data": "डेटा का विश्लेषण और प्रवेश करें",
            "Sales Entry Form": "बिक्री प्रवेश फ़ॉर्म",
            "Customer Name": "ग्राहक का नाम",
            "Amount (₹)": "राशि (₹)",
            "Credit (Udhaar)?": "उधार?",
            "Log Transaction": "लेनदेन दर्ज करें",
            "Cloud Sync Hub": "क्लाउड सिंक हब",
            "Sync to Cloud": "क्लाउड पर सिंक करें",
            "Offline Items": "ऑफ़लाइन आइटम",
            "No local records pending sync.": "सिंक के लिए कोई स्थानीय रिकॉर्ड नहीं।",
            "Danger Zone": "खतरनाक क्षेत्र",
            "Reset Workspace": "वर्कस्पेस रीसेट करें",

            // --- Customers ---
            "Customer Ledger": "ग्राहक खाता",
            "Client Hub": "क्लाइंट हब",
            "Your synced rural customers & Udhaar records": "आपके ग्रामीण ग्राहक और उधार रिकॉर्ड",
            "Segmentation & AI Persona Management": "विभाजन और AI पर्सोना प्रबंधन",
            "Search names or IDs...": "नाम या ID खोजें...",
            "Customers Found": "ग्राहक मिले",
            "Profiles Found": "प्रोफ़ाइल मिली",
            "Rural Mode": "ग्रामीण मोड",
            "Total Value": "कुल मूल्य",
            "Visits": "भ्रमण",
            "Last Visit": "अंतिम भ्रमण",
            "Udhaar Txns": "उधार लेन-देन",
            "No Customers Yet": "अभी कोई ग्राहक नहीं",
            "No customer records found": "कोई ग्राहक रिकॉर्ड नहीं मिला",

            // --- Settings ---
            "Settings": "सेटिंग्स",
            "App Preferences & Configuration": "ऐप प्राथमिकताएँ और कॉन्फ़िगरेशन",
            "Enterprise Plan": "एंटरप्राइज़ प्लान",
            "Theme": "थीम",
            "Interface appearance": "इंटरफ़ेस रूप",
            "Dark": "गहरा",
            "Light": "हल्का",
            "Language": "भाषा",
            "Display language for the app": "ऐप की प्रदर्शन भाषा",
            "Smart Alerts": "स्मार्ट अलर्ट",
            "Churn risk & revenue drop alerts": "ग्राहक-छोड़ने और राजस्व गिरावट के अलर्ट",
            "Business Mode": "व्यापार मोड",
            "Currently active database partition": "वर्तमान में सक्रिय डेटाबेस विभाजन",
            "Reset All Business Data": "सारा व्यापार डेटा रीसेट करें",
            "Sign Out": "साइन आउट",

            // --- Advisor ---
            "Business Advisor": "व्यापार सलाहकार",
            "Ask me anything about your business...": "अपने व्यापार के बारे में कुछ भी पूछें...",
            "Send": "भेजें",
            "Thinking...": "सोच रहा हूँ...",

            // --- Suite/More ---
            "Business Suite": "व्यापार सूट",
            "ML Predictor": "ML भविष्यवक्ता",
            "ROI Simulator": "ROI सिमुलेटर",
            "Compare Periods": "अवधि तुलना",
            "Data Quality": "डेटा गुणवत्ता",
            "Export Reports": "रिपोर्ट निर्यात",
            "Anomaly Detect": "विसंगति पहचान",

            // --- General ---
            "Loading...": "लोड हो रहा है...",
            "Error": "त्रुटि",
            "Retry": "पुनः प्रयास",
            "Save": "सहेजें",
            "Cancel": "रद्द करें",
            "Confirm": "पुष्टि करें",
            "Delete": "हटाएं",
            "Edit": "संपादित करें",
            "Search": "खोजें",
            "Back": "वापस",
            "Next": "अगला",
            "Submit": "जमा करें",
            "success": "सफलता",
            "failed": "विफल",
            "UDHAAR": "उधार",
            "PAID": "भुगतान हुआ",
        },

        mr: {
            // Navigation
            "Dash": "डॅश",
            "Actions": "कृती",
            "Sync": "सिंक",
            "Clients": "ग्राहक",
            "Suite": "सूट",
            // Dashboard
            "Urban HQ": "शहरी मुख्यालय",
            "Rural Store": "ग्रामीण दुकान",
            "AI Layer Active": "AI स्तर सक्रिय",
            "Revenue": "महसूल",
            "Total Base": "एकूण ग्राहक",
            "Active Records": "सक्रिय नोंदी",
            "Health Score": "आरोग्य गुण",
            "Strategy Insights": "धोरण अंतर्दृष्टी",
            "Cash vs Credit Flow": "रोख विरुद्ध उधार प्रवाह",
            "CASH PAYMENTS": "रोख देयके",
            "UDHAAR (CREDIT)": "उधार (क्रेडिट)",
            // Data Ingest
            "Sales Entry Form": "विक्री नोंद फॉर्म",
            "Customer Name": "ग्राहकाचे नाव",
            "Amount (₹)": "रक्कम (₹)",
            "Credit (Udhaar)?": "उधार?",
            "Log Transaction": "व्यवहार नोंदवा",
            // Settings
            "Settings": "सेटिंग्ज",
            "Language": "भाषा",
            "Theme": "थीम",
            "Dark": "गडद",
            "Light": "हलका",
            "Sign Out": "साइन आउट",
        },

        ta: {
            // Navigation
            "Dash": "டாஷ்",
            "Actions": "செயல்கள்",
            "Sync": "ஒத்திசை",
            "Clients": "வாடிக்கையாளர்கள்",
            "Suite": "தொகுப்பு",
            // Dashboard
            "Urban HQ": "நகர்ப்புற தலைமையகம்",
            "Rural Store": "கிராமப்புற கடை",
            "AI Layer Active": "AI அடுக்கு செயலில்",
            "Revenue": "வருவாய்",
            "Total Base": "மொத்த வாடிக்கையாளர்கள்",
            "Active Records": "செயலில் உள்ள பதிவுகள்",
            "Health Score": "ஆரோக்கிய மதிப்பெண்",
            "Strategy Insights": "உத்தி நுண்ணறிவு",
            "Cash vs Credit Flow": "பணம் vs கடன் ஓட்டம்",
            // Data Ingest
            "Sales Entry Form": "விற்பனை உள்ளீட்டு படிவம்",
            "Customer Name": "வாடிக்கையாளர் பெயர்",
            "Amount (₹)": "தொகை (₹)",
            "Log Transaction": "பரிவர்த்தனை பதிவு செய்",
            // Settings
            "Settings": "அமைப்புகள்",
            "Language": "மொழி",
            "Theme": "தீம்",
            "Dark": "இருண்ட",
            "Light": "ஒளி",
            "Sign Out": "வெளியேறு",
        }
    };

    /**
     * Walks all text nodes in #main-content and translates them.
     * Skips script/style tags and icon elements.
     */
    function applyToNode(node, dict) {
        if (!node) return;

        // Skip tags that shouldn't have text translated
        const skipTags = new Set(['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'I', 'SVG', 'OPTION']);
        if (skipTags.has(node.nodeName)) return;

        // Recurse into children
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                const original = child.textContent.trim();
                if (!original || original.length < 2) return;

                // Full match first
                if (dict[original]) {
                    child.textContent = child.textContent.replace(original, dict[original]);
                    return;
                }

                // Partial phrase match (for strings with dynamic values)
                for (const [en, translated] of Object.entries(dict)) {
                    if (en.length > 4 && child.textContent.includes(en)) {
                        child.textContent = child.textContent.replace(en, translated);
                    }
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                applyToNode(child, dict);
            }
        });

        // Also translate placeholder attributes
        if (node.nodeType === Node.ELEMENT_NODE) {
            const placeholder = node.getAttribute?.('placeholder');
            if (placeholder && dict[placeholder]) {
                node.setAttribute('placeholder', dict[placeholder]);
            }
        }
    }

    function apply() {
        const lang = localStorage.getItem('lang') || 'en';
        if (lang === 'en') return; // English is default — no translation needed

        const dict = translations[lang];
        if (!dict) return;

        // Translate the main content area
        const mainContent = document.getElementById('main-content');
        if (mainContent) applyToNode(mainContent, dict);

        // Also translate bottom nav labels
        const nav = document.querySelector('.bottom-nav');
        if (nav) applyToNode(nav, dict);
    }

    // Expose public API
    return { apply, translations };
})();
