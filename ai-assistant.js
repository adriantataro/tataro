document.addEventListener('DOMContentLoaded', function () {
    const popup = document.getElementById('ai-assistant-popup');
    const toggleBtn = document.getElementById('ai-assistant-toggle');
    const closeBtn = document.getElementById('ai-assistant-close');
    const input = document.getElementById('ai-assistant-input');
    const responseDiv = document.getElementById('ai-assistant-response');
    const sendBtn = document.getElementById('ai-assistant-send');
    const aiContainer = document.getElementById('ai-assistant');
    const openMenuBtn = document.querySelector('.openMenu');
    const closeMenuBtn = document.querySelector('.closeMenu');
    const mainMenu = document.querySelector('.mainMenu');

    if (!popup || !toggleBtn || !input || !responseDiv || !sendBtn) {
        return; // do nothing if markup isn't present
    }

    // Capture text content from the current page to use as knowledge
    var pageText = '';
    try {
        pageText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
        // Keep it reasonably short to avoid very large requests
        if (pageText.length > 4000) {
            pageText = pageText.slice(0, 4000);
        }
    } catch (e) {
        pageText = '';
    }

    // Start with the current page, but we will expand this
    // to include the other HTML pages on the site.
    var siteKnowledge = pageText || '';
    var knowledgeLoaded = false;

    // Conversation history so the AI can keep context.
    // It should rely on this site content for questions about the site,
    // but it can also use its general knowledge for other questions.
    var conversation = [
        {
            role: 'system',
            content: "You are an AI assistant for Adrian R. Tataro's personal website. For questions about this site (its pages, sections, projects, contact details, etc.), use the SITE CONTENT I give you below and follow it even if it disagrees with your general knowledge. For other questions, you may also use your own general knowledge. Be concise and friendly. If you truly don't know, say you're not sure."
        },
        {
            role: 'system',
            content: 'SITE CONTENT FROM THIS WEBSITE (current page only so far):\n' + siteKnowledge
        }
    ];

    var chatHistory = [];
    var hasGreeted = false;
    var CHAT_STORAGE_KEY = 'aidi_site_chat_v1';

    // Track whether we are currently loading knowledge from other pages
    var knowledgeLoading = false;

    // Load text from the other HTML pages in the site so the
    // assistant can answer questions about all of them, not
    // just the currently open page.
    async function loadSiteKnowledgeIfPossible() {
        if (knowledgeLoaded || knowledgeLoading) {
            return;
        }

        // When opened directly from the filesystem (file://), most browsers
        // block reading sibling HTML files. In that case we can only use
        // the current page as knowledge.
        if (window.location && window.location.protocol === 'file:') {
            console.warn('[AIDI Assistant] Page is opened via file:// so I cannot read other .html files. Serve the site over http:// (for example with Live Server) to enable full-site knowledge.');
            return;
        }

        knowledgeLoading = true;

        try {
            // Collect all HTML pages linked from this site (e.g., in the navbar)
            var pageSet = new Set();
            pageSet.add('index.html');

            var links = document.querySelectorAll('a[href$=".html"]');
            for (var li = 0; li < links.length; li++) {
                var href = links[li].getAttribute('href') || '';
                var name = href.split('?')[0].split('#')[0].split('/').pop();
                if (name) {
                    pageSet.add(name);
                }
            }

            var pages = Array.from(pageSet);
            var current = window.location && window.location.pathname
                ? window.location.pathname.split('/').pop() || 'index.html'
                : 'index.html';

            var parser = new DOMParser();
            var maxTotalLength = 8000; // safety limit

            for (var i = 0; i < pages.length; i++) {
                var page = pages[i];
                if (page === current) {
                    continue; // we already added current page text
                }

                if (siteKnowledge.length >= maxTotalLength) {
                    break;
                }

                try {
                    var res = await fetch(page);
                    if (!res.ok) {
                        continue;
                    }

                    var html = await res.text();
                    var doc = parser.parseFromString(html, 'text/html');
                    var bodyText = doc.body ? (doc.body.innerText || doc.body.textContent || '') : '';
                    bodyText = bodyText.replace(/\s+/g, ' ').trim();
                    if (!bodyText) {
                        continue;
                    }

                    var perPageLimit = 1500;
                    if (bodyText.length > perPageLimit) {
                        bodyText = bodyText.slice(0, perPageLimit);
                    }

                    var header = '\n\n[PAGE: ' + page + ']\n';
                    if (siteKnowledge.length + header.length + bodyText.length > maxTotalLength) {
                        bodyText = bodyText.slice(0, maxTotalLength - siteKnowledge.length - header.length);
                    }

                    siteKnowledge += header + bodyText;
                } catch (e2) {
                    console.warn('[AIDI Assistant] Failed to load page for knowledge:', page, e2);
                }
            }

            knowledgeLoaded = true;
            conversation[1].content = 'SITE CONTENT FROM THIS WEBSITE:\n' + siteKnowledge;
        } catch (e3) {
            console.error('[AIDI Assistant] Failed to load site knowledge.', e3);
        } finally {
            knowledgeLoading = false;
        }
    }

    function openPopup() {
        popup.classList.add('open');
        input.value = '';
        if (!hasGreeted && chatHistory.length === 0) {
            chatHistory.push({
                role: 'assistant',
                content: "Hi, I'm the AIDI Site Assistant. You can ask me about anything on this website (pages, school, address, projects, contact details) or general questions."
            });
            renderChat();
            hasGreeted = true;
            saveChatHistory();
        } else {
            // Always render existing chat when opening so
            // previous conversation shows immediately.
            renderChat();
        }
        setTimeout(function () { input.focus(); }, 50);
    }

    function closePopup() {
        popup.classList.remove('open');
    }

    toggleBtn.addEventListener('click', function () {
        if (popup.classList.contains('open')) {
            closePopup();
        } else {
            openPopup();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closePopup);
    }

    // Hide the AI icon when the mobile menu is opened,
    // and show it again only after the menu's transition ends.
    function showAiAfterMenuTransition() {
        if (!aiContainer) return;

        // If we don't have the menu element or there is no transition,
        // just show it immediately.
        if (!mainMenu) {
            aiContainer.style.display = '';
            return;
        }

        var done = false;
        function onEnd() {
            if (done) return;
            done = true;
            mainMenu.removeEventListener('transitionend', onEnd);
            aiContainer.style.display = '';
        }

        // Listen for the end of any transition on the menu
        mainMenu.addEventListener('transitionend', onEnd);

        // Fallback in case no transitionend fires
        setTimeout(onEnd, 600);
    }

    if (openMenuBtn && aiContainer) {
        openMenuBtn.addEventListener('click', function () {
            aiContainer.style.display = 'none';
        });
    }

    if (closeMenuBtn && aiContainer) {
        closeMenuBtn.addEventListener('click', function () {
            showAiAfterMenuTransition();
        });
    }

    sendBtn.addEventListener('click', askAssistant);

    input.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            askAssistant();
        }
    });

    function renderChat() {
        var html = '';
        for (var i = 0; i < chatHistory.length; i++) {
            var msg = chatHistory[i];
            var who = msg.role === 'user' ? 'You' : 'Site Assistant';
            var cls = msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant';
            html += '<div class="ai-msg ' + cls + '"><div class="ai-msg-who">' + who + ':</div><div class="ai-msg-text">' + escapeHtml(msg.content) + '</div></div>';
        }
        if (!html) {
            html = '<span class="ai-msg-placeholder">Ask me anything about this site.</span>';
        }
        responseDiv.innerHTML = html;
        responseDiv.scrollTop = responseDiv.scrollHeight;
    }

    function saveChatHistory() {
        try {
            if (typeof sessionStorage === 'undefined') return;
            sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
        } catch (e) {
            console.warn('[AIDI Assistant] Failed to save chat history.', e);
        }
    }

    function loadChatHistory() {
        try {
            if (typeof sessionStorage === 'undefined') return;
            var raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
            if (!raw) return;
            var saved = JSON.parse(raw);
            if (!Array.isArray(saved) || !saved.length) return;

            chatHistory = saved;

            // Rebuild the conversation with past user/assistant messages
            for (var i = 0; i < saved.length; i++) {
                var msg = saved[i];
                if (!msg || typeof msg.content !== 'string') continue;
                if (msg.role === 'user' || msg.role === 'assistant') {
                    conversation.push({ role: msg.role, content: msg.content });
                }
            }

            hasGreeted = saved.some(function (m) { return m.role === 'assistant'; });
            renderChat();
        } catch (e) {
            console.warn('[AIDI Assistant] Failed to load chat history.', e);
        }
    }

    // Restore any previous chat when the page loads so
    // the conversation can continue across different pages.
    loadChatHistory();

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function askAssistant() {
        var userInput = input.value.trim();
        if (!userInput) {
            alert('Please enter a question!');
            return;
        }

        // Clear the input box immediately after capturing the text
        input.value = '';

        // On the first question, try to load the rest of the
        // site's pages so the assistant has full knowledge.
        if (!knowledgeLoaded) {
            await loadSiteKnowledgeIfPossible();
        }

        responseDiv.classList.add('show');
        chatHistory.push({ role: 'user', content: userInput });
        saveChatHistory();
        renderChat();

        // Show small loading hint under the last message, using
        // the same structure as other chat bubbles
        var loadingHtml = '' +
            '<div class="ai-msg ai-msg-assistant">' +
                '<div class="ai-msg-who">Site Assistant:</div>' +
                '<div class="ai-msg-text"><span class="ai-loading"></span> Thinking...</div>' +
            '</div>';
        responseDiv.innerHTML += loadingHtml;
        responseDiv.scrollTop = responseDiv.scrollHeight;

        try {
            // Add the latest user message to the conversation
            conversation.push({
                role: 'user',
                content: userInput
            });

            // Ask the AI, keeping the whole conversation so far
            const completion = await puter.ai.chat(conversation);

            const text = completion && completion.message && completion.message.content
                ? completion.message.content
                : String(completion || '');

            conversation.push({ role: 'assistant', content: text });
            chatHistory.push({ role: 'assistant', content: text });
            renderChat();
            saveChatHistory();
        } catch (error) {
            chatHistory.push({
                role: 'assistant',
                content: 'Sorry, something went wrong: ' + (error && error.message ? error.message : error)
            });
            renderChat();
            saveChatHistory();
            console.error('AI Assistant Error:', error);
        }
    }
});