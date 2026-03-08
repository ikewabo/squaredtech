document.addEventListener('DOMContentLoaded', () => {

    /* =========================================================================
       Navbar Scroll Effect
       ========================================================================= */
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    /* =========================================================================
       Scroll Reveal Animation
       ========================================================================= */
    const revealElements = document.querySelectorAll('.reveal');

    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function (entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');

                // Trigger countup if it's the stats band
                if (entry.target.classList.contains('stats-band')) {
                    startCountUp();
                }

                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // Manually trigger the hero reveal since it's above the fold
    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.classList.add('active');
        }
    }, 500);

    /* =========================================================================
       CountUp Animation for Stats
       ========================================================================= */
    let countUpStarted = false;

    function startCountUp() {
        if (countUpStarted) return;
        countUpStarted = true;

        const counters = document.querySelectorAll('.countup');
        const speed = 200; // The lower the slower

        counters.forEach(counter => {
            const updateCount = () => {
                const target = +counter.getAttribute('data-target');
                const count = +counter.innerText;

                // Lower inc to slow and higher to speed up
                const inc = target / speed;

                if (count < target) {
                    // Add inc to count and output in counter
                    counter.innerText = Math.ceil(count + inc);
                    // Call function every ms
                    setTimeout(updateCount, 15);
                } else {
                    counter.innerText = target;
                }
            };

            updateCount();
        });
    }

    /* =========================================================================
       Filter Tabs Interaction
       ========================================================================= */
    const tabs = document.querySelectorAll('.filter-tabs .tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked
            tab.classList.add('active');

            // In a real app, you would filter the grid items here.
            // For the prototype, we just animate the cards briefly to simulate loading
            const cards = document.querySelectorAll('.property-card');
            cards.forEach(card => {
                card.style.opacity = '0.5';
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }, 300);
            });
        });
    });

    /* =========================================================================
       Agents Carousel Controls
       ========================================================================= */
    const carouselBtnLeft = document.querySelectorAll('.carousel-btn')[0];
    const carouselBtnRight = document.querySelectorAll('.carousel-btn')[1];
    const carousel = document.querySelector('.agents-carousel');

    if (carouselBtnLeft && carouselBtnRight && carousel) {
        const scrollAmount = 300; // rough width of a card + gap

        carouselBtnLeft.addEventListener('click', () => {
            carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });

        carouselBtnRight.addEventListener('click', () => {
            carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    }

    /* =========================================================================
       AI Voice Assistant (Google Gemini + Web Speech API)
       ========================================================================= */
    const aiBtn = document.getElementById('ai-mic-btn');
    const aiTooltip = document.querySelector('.ai-status-tooltip');
    const apiModal = document.getElementById('api-key-modal');
    const apiInput = document.getElementById('gemini-api-key-input');
    const apiSave = document.getElementById('api-modal-save');
    const apiCancel = document.getElementById('api-modal-cancel');

    let isListening = false;
    let recognition = null;
    let finalTranscript = '';

    // PLACE YOUR FREE GOOGLE AI STUDIO API KEY HERE
    let geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('shaka_gemini_key') || "YOUR_API_KEY_HERE";

    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isListening = true;
            aiBtn.classList.add('listening');
            aiBtn.classList.remove('thinking', 'speaking');
            updateTooltip('Listening...');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            if (interimTranscript) updateTooltip(interimTranscript);
        };

        recognition.onend = () => {
            isListening = false;
            aiBtn.classList.remove('listening');

            // If they stopped talking and we have transcript, send it to Gemini
            if (finalTranscript.trim() !== '') {
                aiBtn.classList.add('thinking');
                updateTooltip('Thinking...');
                sendToGemini(finalTranscript);
                finalTranscript = ''; // Reset for next time
            } else {
                updateTooltip('Ask Shaka AI...');
                setTimeout(() => aiTooltip.classList.remove('show'), 2000);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            updateTooltip('Error connecting to mic.');
            isListening = false;
            aiBtn.className = 'ai-mic-btn';
            setTimeout(() => aiTooltip.classList.remove('show'), 3000);
        };
    } else {
        updateTooltip('Voice AI not supported in this browser.');
        aiBtn.style.opacity = '0.5';
        aiBtn.style.pointerEvents = 'none';
    }

    function updateTooltip(text) {
        aiTooltip.textContent = text;
        aiTooltip.classList.add('show');
    }

    // Toggle Mic Button
    aiBtn.addEventListener('click', () => {
        // If speaking, stop speaking
        if (aiBtn.classList.contains('speaking')) {
            window.speechSynthesis.cancel();
            aiBtn.classList.remove('speaking');
            updateTooltip('Ask Shaka AI...');
            return;
        }

        if (!geminiApiKey) {
            apiModal.classList.add('active');
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            // Cancel any ongoing speech before listening
            window.speechSynthesis.cancel();
            finalTranscript = ''; // Always clear previous before starting new session
            recognition.start();
        }
    });

    // API Modal Logic
    apiSave.addEventListener('click', () => {
        const key = apiInput.value.trim();
        if (key) {
            localStorage.setItem('shaka_gemini_key', key);
            geminiApiKey = key;
            apiModal.classList.remove('active');
            updateTooltip('Key saved! Tap to speak.');
            setTimeout(() => aiTooltip.classList.remove('show'), 3000);
        }
    });

    apiCancel.addEventListener('click', () => {
        apiModal.classList.remove('active');
    });

    // Call Gemini REST API
    async function sendToGemini(text) {
        const promptContext = `
            You are "Shaka AI", a highly professional, polite, and brief luxury real estate concierge for Shaka Properties in Nigeria.
            Shaka Properties was founded in 2007, operates primarily in Ibeju-Lekki, Lagos, and handles premium waterfront villas, penthouses, and commercial estates.
            You must reply in 2 sentences or less. Do not use asterisks or markdown formatting. Keep answers conversational, helpful, and sophisticated.
            User query: "${text}"
        `;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptContext }] }]
                })
            });

            if (!response.ok) {
                if (response.status === 400 || response.status === 403) {
                    throw new Error('Invalid API Key. Please clear your site data and enter a valid key.');
                }
                throw new Error('API Request Failed');
            }

            const data = await response.json();
            const reply = data.candidates[0].content.parts[0].text;

            aiBtn.classList.remove('thinking');
            updateTooltip(reply);
            speakResponse(reply);

        } catch (error) {
            console.error(error);
            aiBtn.classList.remove('thinking');
            updateTooltip('Sorry, communication error. Check console.');

            // Check if it was auth error so they can re-enter
            if (error.message.includes('API Key')) {
                localStorage.removeItem('shaka_gemini_key');
                geminiApiKey = null;
                apiModal.classList.add('active');
            }
        }
    }

    // Text to Speech using browser synthesis
    function speakResponse(text) {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel(); // kill existing speech

        const utterance = new SpeechSynthesisUtterance(text);

        // Find best english voice (prefer UK or female for typical concierge feel if available)
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const preferredVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-US'));
            if (preferredVoice) utterance.voice = preferredVoice;
        }

        utterance.rate = 0.95; // slightly slower for better enunciation
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            aiBtn.classList.add('speaking');
        };

        utterance.onend = () => {
            aiBtn.classList.remove('speaking');
            setTimeout(() => aiTooltip.classList.remove('show'), 2000);
        };

        utterance.onerror = () => {
            aiBtn.classList.remove('speaking');
        }

        window.speechSynthesis.speak(utterance);
    }

    // Ensure voices are loaded (Chrome bug w/ speechSynthesis)
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = window.speechSynthesis.getVoices;
    }
});
