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
       AI Voice Assistant (Google Gemini Live API WebSockets)
       ========================================================================= */
    const aiBtn = document.getElementById('ai-mic-btn');
    const aiTooltip = document.querySelector('.ai-status-tooltip');

    let isListening = false;
    let ws = null;
    let audioContext = null;
    let mediaStream = null;
    let processor = null;

    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_API_KEY_HERE";
    const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;

    function updateTooltip(text) {
        aiTooltip.textContent = text;
        aiTooltip.classList.add('show');
    }

    async function startLiveSession() {
        if (!geminiApiKey || geminiApiKey === "YOUR_API_KEY_HERE") {
            updateTooltip("API Key not found in build.");
            setTimeout(() => aiTooltip.classList.remove('show'), 3000);
            return;
        }

        try {
            updateTooltip('Connecting...');
            aiBtn.classList.add('thinking');

            // 1. Connect WebSocket
            ws = new WebSocket(WS_URL);

            ws.onopen = async () => {
                // Send initial config with persona
                const setupMessage = {
                    setup: {
                        model: "models/gemini-2.5-flash",
                        systemInstruction: {
                            parts: [{
                                text: "You are 'SquaredTech AI', a highly professional, polite, and sophisticated luxury real estate concierge for SquaredTech Properties Ltd in Nigeria. You must speak like a young Nigerian woman with a slight accent. Keep answers conversational, helpful, and very brief (1-2 sentences). Do not use markdown."
                            }]
                        },
                        generationConfig: {
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: "Aoede" // Female voice, we'll configure system prompt to drive the accent
                                    }
                                }
                            }
                        }
                    }
                };
                ws.send(JSON.stringify(setupMessage));

                // 2. Start Microphone
                await startMicrophone();
                isListening = true;
                aiBtn.classList.remove('thinking');
                aiBtn.classList.add('listening');
                updateTooltip('Listening...');
            };

            ws.onmessage = async (event) => {
                const response = JSON.parse(event.data);
                if (response.serverContent && response.serverContent.modelTurn) {
                    const parts = response.serverContent.modelTurn.parts;
                    for (const part of parts) {
                        if (part.inlineData && part.inlineData.data) {
                            // Play received PCM audio chunk
                            playAudioChunk(part.inlineData.data);
                        }
                    }
                }
            };

            ws.onclose = () => {
                stopLiveSession();
            };

            ws.onerror = (err) => {
                console.error("WebSocket Error:", err);
                updateTooltip("Connection error.");
                stopLiveSession();
            };

        } catch (error) {
            console.error("Failed to start session:", error);
            updateTooltip("Failed to access microphone.");
            stopLiveSession();
        }
    }

    async function startMicrophone() {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000
            }
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(mediaStream);

        processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (!isListening || !ws || ws.readyState !== WebSocket.OPEN) return;

            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = float32ToPcm16(inputData);
            const base64Data = arrayBufferToBase64(pcm16.buffer);

            ws.send(JSON.stringify({
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Data
                    }]
                }
            }));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
    }

    function stopLiveSession() {
        isListening = false;
        aiBtn.classList.remove('listening', 'thinking', 'speaking');

        if (ws) {
            ws.close();
            ws = null;
        }
        if (processor) {
            processor.disconnect();
            processor = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
        }

        updateTooltip('Ask SquaredTech AI...');
        setTimeout(() => aiTooltip.classList.remove('show'), 2000);
    }

    aiBtn.addEventListener('click', () => {
        if (isListening) {
            stopLiveSession();
        } else {
            startLiveSession();
        }
    });

    // --- Audio Helpers ---

    let playbackContext = null;
    let nextPlayTime = 0;

    async function playAudioChunk(base64Data) {
        if (!playbackContext) {
            playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            nextPlayTime = playbackContext.currentTime;
        }

        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 32768.0;
        }

        const audioBuffer = playbackContext.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = playbackContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(playbackContext.destination);

        const startTime = Math.max(playbackContext.currentTime, nextPlayTime);
        source.start(startTime);
        nextPlayTime = startTime + audioBuffer.duration;

        aiBtn.classList.remove('listening', 'thinking');
        aiBtn.classList.add('speaking');

        source.onended = () => {
            if (playbackContext.currentTime >= nextPlayTime - 0.1) {
                aiBtn.classList.remove('speaking');
                aiBtn.classList.add('listening');
            }
        };
    }

    function float32ToPcm16(floatData) {
        let pcm = new Int16Array(floatData.length);
        for (let i = 0; i < floatData.length; ++i) {
            let s = Math.max(-1, Math.min(1, floatData[i]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return pcm;
    }

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
});
