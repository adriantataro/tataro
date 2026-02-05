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
        // Keep it reasonably short to avoid very large requests,
        // but high enough to usually include the whole page.
        var firstPageLimit = 6000;
        if (pageText.length > firstPageLimit) {
            pageText = pageText.slice(0, firstPageLimit);
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
            content: "You are an AI assistant for Adrian R. Tataro's personal website. For questions about this site (its pages, sections, projects, contact details, etc.), use the SITE CONTENT I give you below and follow it even if it disagrees with your general knowledge. For other questions, you may also use your own general knowledge. Be concise and friendly. If you truly don't know, say you're not sure. Do NOT say that the user 'provided' the site content or that you are basing answers on content they gave you. Instead, if you need to mention your source, say that you are using information from this website or from the pages of this site."
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

    // Track current text-to-speech audio so we can stop it
    var currentSpeechAudio = null;

    function stopCurrentSpeech() {
        try {
            if (currentSpeechAudio && typeof currentSpeechAudio.pause === 'function') {
                currentSpeechAudio.pause();
                try {
                    currentSpeechAudio.currentTime = 0;
                } catch (e) {
                    // Some audio objects may not allow setting currentTime
                }
            }
        } catch (e2) {
            console.warn('[AIDI Assistant] Failed to stop speech.', e2);
        }
        currentSpeechAudio = null;
    }

    // Optional safety cap in case of extremely long answers
    var MAX_TTS_CHARS = 8000;

    async function speakAssistantText(text) {
        if (!text) return;
        if (!window.puter || !puter.ai || typeof puter.ai.txt2speech !== 'function') return;

        // Stop anything currently speaking
        stopCurrentSpeech();

        var toSpeak = String(text).trim();
        if (!toSpeak) return;

        // Very high cap so we normally speak the full
        // answer from first line to last.
        if (toSpeak.length > MAX_TTS_CHARS) {
            toSpeak = toSpeak.slice(0, MAX_TTS_CHARS);
        }

        try {
            var audio = await puter.ai.txt2speech(toSpeak, {
                voice: 'Joanna',
                engine: 'neural',
                language: 'en-US'
            });

            if (audio && typeof audio.play === 'function') {
                currentSpeechAudio = audio;

                // Start playback
                try {
                    await audio.play();
                } catch (err) {
                    console.warn('[AIDI Assistant] Failed to play speech audio.', err);
                    currentSpeechAudio = null;
                    return;
                }

                // Wait until the audio finishes before resolving,
                // so callers can guarantee the whole text was spoken.
                await new Promise(function (resolve) {
                    var done = false;
                    function cleanup() {
                        if (done) return;
                        done = true;
                        resolve();
                    }
                    audio.addEventListener('ended', function () {
                        cleanup();
                    }, { once: true });
                    // Fallback: resolve after the duration if available
                    var durationMs = isFinite(audio.duration) && audio.duration > 0
                        ? audio.duration * 1000
                        : 15000; // 15s max fallback
                    setTimeout(cleanup, durationMs + 200);
                });
            }
        } catch (err) {
            console.warn('[AIDI Assistant] Text-to-speech failed.', err);
        }
    }

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
            // We keep knowledgeLoaded = false so askAssistant can
            // explain this limitation to the user in the chat UI.
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
            // Allow more total site text so the AI
            // can see nearly all content from every page.
            var maxTotalLength = 14000; // safety limit

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

                    // Per-page cap; high enough to usually
                    // include the whole page.
                    var perPageLimit = 2500;
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
            var greeting = "Hi, I'm the AIDI Site Assistant. You can ask me about anything on this website (pages, school, address, projects, contact details) or general questions.";
            chatHistory.push({
                role: 'assistant',
                content: greeting
            });
            renderChat();
            hasGreeted = true;
            saveChatHistory();
            // Speak the greeting when the assistant is opened the first time
            speakAssistantText(greeting);
        } else {
            // Always render existing chat when opening so
            // previous conversation shows immediately.
            renderChat();
        }
        setTimeout(function () { input.focus(); }, 50);
    }

    function closePopup() {
        popup.classList.remove('open');
        // Stop any ongoing speech when the assistant is closed
        stopCurrentSpeech();
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

    // If the user types a simple navigation command like
    // "view resume" or "open contact page", handle it here
    // by redirecting to the correct page instead of calling the AI.
    // We only treat it as navigation if there is an "action" word
    // (view, open, go to, show, see, etc.), so questions like
    // "what is the content of the resume" will NOT trigger redirect
    // and will instead be answered by the AI.
    async function handleNavigationCommand(text) {
        if (!text) return false;

        var q = String(text).toLowerCase();
        var target = null;
        var label = '';

        // Only treat as a navigation command if there's some
        // action verb indicating the user wants to move pages.
        var hasActionWord = (
            q.includes('view') ||
            q.includes('open') ||
            q.includes('go to') ||
            q.includes('goto') ||
            q.includes('show') ||
            q.includes('see') ||
            q.includes('take me') ||
            q.includes('redirect') ||
            q.includes('navigate')
        );

        if (!hasActionWord) {
            return false;
        }

        if (q.includes('resume') || q.includes('cv')) {
            target = 'resume.html';
            label = 'Resume page';
        } else if (q.includes('contact') || q.includes('email') || q.includes('phone')) {
            target = 'contact.html';
            label = 'Contact page';
        } else if (q.includes('gallery') || q.includes('photos') || q.includes('pictures')) {
            target = 'gallery.html';
            label = 'Gallery page';
        } else if (q.includes('about') || q.includes('information about you')) {
            target = 'about.html';
            label = 'About page';
        } else if (q.includes('home') || q.includes('homepage') || q.includes('start page') || q.includes('main page')) {
            target = 'index.html';
            label = 'Home page';
        }

        if (!target) {
            return false;
        }

        // If we are already on the requested page, do not redirect;
        // let the AI answer the question instead.
        try {
            var currentFile = window.location && window.location.pathname
                ? window.location.pathname.split('/').pop() || 'index.html'
                : 'index.html';
            if (currentFile.toLowerCase() === target.toLowerCase()) {
                return false;
            }
        } catch (eLoc) {
            // If anything goes wrong reading location, continue as normal.
        }

        var reply = "Got it, I'm going to redirect you to the " + label + ' in a moment.';
        chatHistory.push({ role: 'assistant', content: reply });
        saveChatHistory();
        renderChat();

        // Speak the reply first (if TTS is available) and
        // wait until the whole message has been spoken
        // before redirecting.
        try {
            if (typeof speakAssistantText === 'function') {
                await speakAssistantText(reply);
            }
        } catch (e) {
            // If TTS fails for any reason, still continue to redirect.
        }

        // Now that speech has finished, redirect immediately.
        window.location.href = target;

        return true;
    }

    async function askAssistant() {
        var userInput = input.value.trim();
        if (!userInput) {
            alert('Please enter a question!');
            return;
        }

        // If the assistant is currently talking, stop it as soon as
        // the user asks a new question.
        stopCurrentSpeech();

        // Clear the input box immediately after capturing the text
        input.value = '';

        // If the user typed something like "view resume" or
        // "open contact page", handle that by redirecting
        // instead of sending the question to the AI.
        if (await handleNavigationCommand(userInput)) {
            return;
        }

        // On the first question, try to load the rest of the
        // site's pages so the assistant has full knowledge.
        if (!knowledgeLoaded) {
            await loadSiteKnowledgeIfPossible();

            // If we are still not marked as loaded and the page
            // is opened via file://, explain this limitation to
            // the user so they know why cross-page knowledge is
            // not complete.
            if (!knowledgeLoaded && window.location && window.location.protocol === 'file:') {
                var note = 'Note: You are viewing this site directly from your computer (file://). Because of browser security, I can only see the text of the current page, not the other HTML files. To make me truly know ALL pages (index, resume, about, contact, gallery), please open this site using a local web server such as VS Code Live Server or any http:// URL.';
                chatHistory.push({ role: 'assistant', content: note });
                renderChat();
                saveChatHistory();
            }
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

            // Speak the latest assistant response
            speakAssistantText(text);
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