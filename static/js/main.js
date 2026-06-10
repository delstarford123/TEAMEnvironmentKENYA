document.addEventListener('DOMContentLoaded', function() {
    // --- 1. HEADER SCROLL EFFECT ---
    const header = document.querySelector('.main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- 2. MOBILE MENU TOGGLE ---
    const mobileToggle = document.querySelector('.mobile-toggle');
    const mainNav = document.querySelector('.main-nav');
    const navOverlay = document.getElementById('nav-overlay');
    const body = document.body;

    function toggleMenu() {
        mainNav.classList.toggle('active');
        if (navOverlay) navOverlay.classList.toggle('active');
        header.classList.toggle('nav-open');
        const isOpen = mainNav.classList.contains('active');
        
        mobileToggle.setAttribute('aria-expanded', isOpen);
        
        // Toggle icon
        const icon = mobileToggle.querySelector('i');
        if (isOpen) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
            body.style.overflow = 'hidden'; // Lock scroll
            body.classList.add('menu-open');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
            body.style.overflow = ''; // Unlock scroll
            body.classList.remove('menu-open');
        }
    }

    if (mobileToggle && mainNav) {
        mobileToggle.addEventListener('click', toggleMenu);
        if (navOverlay) navOverlay.addEventListener('click', toggleMenu);

        // Close menu when clicking on a link (excluding dropdown parents on mobile)
        const navLinks = document.querySelectorAll('.nav-link:not(.has-dropdown > .nav-link)');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav.classList.contains('active')) {
                    toggleMenu();
                }
            });
        });

        // Dropdown toggle for mobile
        const dropdowns = document.querySelectorAll('.has-dropdown');
        dropdowns.forEach(dropdown => {
            const link = dropdown.querySelector('.nav-link');
            link.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault(); // Prevent immediate navigation
                    const isActive = dropdown.classList.contains('active');
                    
                    // Close other dropdowns
                    dropdowns.forEach(d => d.classList.remove('active'));
                    
                    // Toggle current
                    if (!isActive) {
                        dropdown.classList.add('active');
                    }
                    
                    link.setAttribute('aria-expanded', !isActive);
                }
            });
        });
    }

    // --- 2. MULTI-METHOD PAYMENT & MODAL LOGIC ---
    const modal = document.getElementById('mpesaModal');
    const statusDiv = document.getElementById('status-message');
    const formContainer = document.getElementById('modal-form-container');
    const processingContainer = document.getElementById('modal-processing-container');
    const processingStatus = document.getElementById('processing-status-message');

    window.openModal = function() {
        if (modal) {
            modal.classList.add('active');
            resetModal();
        }
    }

    window.closeModal = function() {
        if (modal) {
            modal.classList.remove('active');
        }
    }

    window.resetModal = function() {
        if (formContainer) formContainer.classList.remove('hidden');
        if (processingContainer) processingContainer.classList.remove('active');
        if (statusDiv) statusDiv.innerHTML = '';
        if (processingStatus) processingStatus.innerHTML = '';
        
        // Clear all validation errors
        ['donor_name', 'donor_email', 'amount', 'phone'].forEach(clearValidation);
    }

    // Close modal if clicking outside the box
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }

    // --- 3. DYNAMIC CONVERSION BADGE ---
    const amountField = document.getElementById('amount');
    const usdConvertedSpan = document.getElementById('usd-converted-amount');
    if (amountField && usdConvertedSpan) {
        amountField.addEventListener('input', function() {
            const value = parseFloat(this.value) || 0;
            usdConvertedSpan.innerText = '$' + (value / 130).toFixed(2);
        });
    }

    // --- 4. PAYMENT METHOD SWITCHER ---
    let paypalModalBtnRendered = false;

    window.switchPayment = function(method) {
        // Update tabs
        document.querySelectorAll('.payment-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${method}-tab`).classList.add('active');

        // Update method cards
        document.querySelectorAll('.method-card').forEach(card => card.classList.remove('active'));
        event.currentTarget.classList.add('active');

        // If PayPal is chosen, render Smart Buttons
        if (method === 'paypal') {
            renderModalPaypalButtons();
        }
    }

    // --- 5. UNIFIED VALIDATION HELPERS ---
    function validatePhone(phone) {
        const regex = /^(254|0)(7|1)\d{8}$/;
        return regex.test(phone);
    }

    function validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    function showValidation(id, message) {
        const input = document.getElementById(id);
        const msgDiv = document.getElementById(`${id}-validation`);
        if (input && msgDiv) {
            input.classList.add('invalid');
            msgDiv.innerText = message;
            msgDiv.classList.add('active');
        }
    }

    function clearValidation(id) {
        const input = document.getElementById(id);
        const msgDiv = document.getElementById(`${id}-validation`);
        if (input && msgDiv) {
            input.classList.remove('invalid');
            input.classList.add('valid');
            msgDiv.innerText = '';
            msgDiv.classList.remove('active');
        }
    }

    function validateModalForm() {
        const nameInput = document.getElementById('donor_name');
        const emailInput = document.getElementById('donor_email');
        const amountInput = document.getElementById('amount');
        if (!nameInput || !emailInput || !amountInput) return false;

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const amount = parseFloat(amountInput.value);

        let isValid = true;
        if (!name) { showValidation('donor_name', 'Full name is required'); isValid = false; }
        if (!validateEmail(email)) { showValidation('donor_email', 'Please enter a valid email'); isValid = false; }
        if (isNaN(amount) || amount <= 0) { showValidation('amount', 'Please enter a valid amount'); isValid = false; }

        return isValid;
    }

    // Attach real-time input cleaners
    ['donor_name', 'donor_email', 'amount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                if (id === 'donor_email') {
                    if (validateEmail(el.value)) clearValidation(id);
                } else if (id === 'amount') {
                    if (parseFloat(el.value) > 0) clearValidation(id);
                } else {
                    if (el.value.trim()) clearValidation(id);
                }
            });
        }
    });

    const modalPhone = document.getElementById('phone');
    if (modalPhone) {
        modalPhone.addEventListener('input', function() {
            if (validatePhone(this.value)) clearValidation('phone');
            else showValidation('phone', 'Format: 07XXXXXXXX');
        });
    }

    // --- 6. INITIATE PAYMENT FLOWS (M-PESA & PESAPAL & PAYPAL) ---
    
    // M-PESA STK Push
    window.initiatePayment = async function() {
        if (!validateModalForm()) return;
        
        const phoneInput = document.getElementById('phone');
        if (!phoneInput) return;
        const phone = phoneInput.value.trim();

        if (!validatePhone(phone)) {
            showValidation('phone', 'Phone number format: 07XXXXXXXX');
            return;
        }

        const name = document.getElementById('donor_name').value;
        const email = document.getElementById('donor_email').value;
        const amount = document.getElementById('amount').value;

        formContainer.classList.add('hidden');
        processingContainer.classList.add('active');
        statusDiv.innerHTML = '';
        processingStatus.innerHTML = '<i class="fas fa-mobile-alt"></i> Sending secure STK Push request to your phone...';

        try {
            const response = await fetch('/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: name,
                    email: email,
                    phone: phone, 
                    amount: amount 
                })
            });

            const result = await response.json();

            if (response.ok && result.ResponseCode === "0") {
                processingStatus.innerHTML = '<span class="status-success">✔ STK Push Sent! Enter your M-Pesa PIN on your phone to complete. We will email your receipt and certificate.</span>';
                setTimeout(closeModal, 8000);
            } else {
                processingContainer.classList.remove('active');
                formContainer.classList.remove('hidden');
                statusDiv.innerHTML = `<span class="status-error">❌ M-Pesa Error: ${result.CustomerMessage || result.errorMessage || result.error || 'STK Initiation failed'}</span>`;
            }
        } catch (error) {
            processingContainer.classList.remove('active');
            formContainer.classList.remove('hidden');
            statusDiv.innerHTML = '<span class="status-error">❌ Connection failed. Check your internet.</span>';
        }
    }

    // PESAPAL gateway redirect
    window.initiatePesapalPayment = async function() {
        if (!validateModalForm()) return;

        const name = document.getElementById('donor_name').value;
        const email = document.getElementById('donor_email').value;
        const amount = document.getElementById('amount').value;

        formContainer.classList.add('hidden');
        processingContainer.classList.add('active');
        statusDiv.innerHTML = '';
        processingStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Contacting secure PesaPal checkout...';

        try {
            const response = await fetch('/pay-pesapal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, amount })
            });

            const result = await response.json();

            if (response.ok && result.redirect_url) {
                processingStatus.innerHTML = '<span class="status-success">✔ Gateway secured! Redirecting to secure payment checkout...</span>';
                setTimeout(() => {
                    window.location.href = result.redirect_url;
                }, 1500);
            } else {
                processingContainer.classList.remove('active');
                formContainer.classList.remove('hidden');
                statusDiv.innerHTML = `<span class="status-error">❌ PesaPal Error: ${result.error || 'Checkout initiation failed'}</span>`;
            }
        } catch (error) {
            processingContainer.classList.remove('active');
            formContainer.classList.remove('hidden');
            statusDiv.innerHTML = '<span class="status-error">❌ Connection failed. Check your internet.</span>';
        }
    }

    // PAYPAL Smart Buttons Rendering & Capturing
    function renderModalPaypalButtons() {
        if (paypalModalBtnRendered) return;
        
        const container = document.getElementById('paypal-button-container-modal');
        if (!container) return;
        
        paypalModalBtnRendered = true;

        paypal.Buttons({
            onInit: function(data, actions) {
                actions.disable();
                
                const checkFields = () => {
                    if (validateModalForm()) {
                        actions.enable();
                    } else {
                        actions.disable();
                    }
                };

                // Listen to form inputs to enable/disable buttons
                ['donor_name', 'donor_email', 'amount'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.addEventListener('input', checkFields);
                });
                
                checkFields();
            },
            createOrder: function(data, actions) {
                const amountKes = parseFloat(document.getElementById('amount').value);
                const amountUsd = (amountKes / 130).toFixed(2);
                return actions.order.create({
                    purchase_units: [{
                        amount: { value: amountUsd },
                        description: "Donation to TEAMEnvironment KENYA"
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(async function(details) {
                    formContainer.classList.add('hidden');
                    processingContainer.classList.add('active');
                    statusDiv.innerHTML = '';
                    processingStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> finalising your transaction records & generating dynamic certificates...';

                    const amountKes = parseFloat(document.getElementById('amount').value);
                    const amountUsd = (amountKes / 130).toFixed(2);

                    try {
                        const res = await fetch('/save-paypal-donation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: document.getElementById('donor_name').value,
                                email: document.getElementById('donor_email').value,
                                amount_kes: amountKes,
                                amount_usd: amountUsd,
                                paypal_order_id: details.id
                            })
                        });

                        const resData = await res.json();
                        if (res.ok && resData.success) {
                            // Redirect to successful thank you page
                            window.location.href = `/donation-success?name=${encodeURIComponent(document.getElementById('donor_name').value)}&email=${encodeURIComponent(document.getElementById('donor_email').value)}&amount=${amountKes}&receipt_no=${resData.receipt_no}&filename=${resData.filename}`;
                        } else {
                            throw new Error(resData.message || 'Saving transaction details failed.');
                        }
                    } catch (error) {
                        processingContainer.classList.remove('active');
                        formContainer.classList.remove('hidden');
                        statusDiv.innerHTML = `<span class="status-error">❌ Document generation failed: ${error.message}</span>`;
                    }
                });
            },
            onError: function(err) {
                console.error("PayPal Error:", err);
                statusDiv.innerHTML = `<span class="status-error">❌ PayPal Checkout failed: ${err}</span>`;
            }
        }).render('#paypal-button-container-modal');
    }


    // Generic form validation for all pages
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const emailInput = form.querySelector('input[type="email"]');
        const phoneInput = form.querySelector('input[name*="phone"], input[id*="Phone"]');

        if (emailInput) {
            emailInput.addEventListener('blur', function() {
                if (!validateEmail(this.value)) {
                    this.classList.add('invalid');
                    // Add a small message if it doesn't exist
                    let msg = this.parentNode.querySelector('.validation-message');
                    if (!msg) {
                        msg = document.createElement('div');
                        msg.className = 'validation-message active';
                        this.parentNode.appendChild(msg);
                    }
                    msg.innerText = 'Please enter a valid email address.';
                } else {
                    this.classList.remove('invalid');
                    this.classList.add('valid');
                    const msg = this.parentNode.querySelector('.validation-message');
                    if (msg) msg.innerText = '';
                }
            });
        }

        if (phoneInput) {
            phoneInput.addEventListener('blur', function() {
                if (!validatePhone(this.value)) {
                    this.classList.add('invalid');
                    let msg = this.parentNode.querySelector('.validation-message');
                    if (!msg) {
                        msg = document.createElement('div');
                        msg.className = 'validation-message active';
                        this.parentNode.appendChild(msg);
                    }
                    msg.innerText = 'Enter a valid phone (e.g. 0712345678)';
                } else {
                    this.classList.remove('invalid');
                    this.classList.add('valid');
                    const msg = this.parentNode.querySelector('.validation-message');
                    if (msg) msg.innerText = '';
                }
            });
        }
    });

    // --- 5. PWA INSTALLATION LOGIC ---
    let deferredPrompt;
    const pwaBanner = document.getElementById('pwa-banner');
    const installBtn = document.getElementById('install-pwa-btn');
    const closeBtn = document.getElementById('close-pwa-banner');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        
        // Check if user has already dismissed it in this session
        if (!sessionStorage.getItem('pwa-banner-dismissed')) {
            // Update UI notify the user they can install the PWA
            if (pwaBanner) pwaBanner.style.display = 'flex';
        }
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            // Optionally, send analytics event with outcome of user choice
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, and can't use it again, throw it away
            deferredPrompt = null;
            // Hide the banner
            if (pwaBanner) pwaBanner.style.display = 'none';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (pwaBanner) pwaBanner.style.display = 'none';
            // Remember dismissal for this session
            sessionStorage.setItem('pwa-banner-dismissed', 'true');
        });
    }

    // --- 5. NEWSLETTER SIGNUP ---
    window.handleNewsletterSignup = async function(event) {
        event.preventDefault();
        const form = event.target;
        const emailInput = form.querySelector('input[name="email"]');
        const messageDiv = document.getElementById('newsletter-message');
        const btn = form.querySelector('button');

        if (!emailInput || !messageDiv || !btn) return;

        const email = emailInput.value;
        if (!validateEmail(email)) {
            messageDiv.innerHTML = '<span style="color: #e11d48;">Please enter a valid email address.</span>';
            return;
        }

        // UI State
        btn.disabled = true;
        btn.innerText = 'Joining...';
        messageDiv.innerHTML = '';

        try {
            const formData = new FormData();
            formData.append('email', email);

            const response = await fetch('/newsletter-signup', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                messageDiv.innerHTML = `<span style="color: #54B435;">✔ ${result.success}</span>`;
                form.reset();
            } else {
                messageDiv.innerHTML = `<span style="color: #e11d48;">❌ ${result.error || 'Failed to join. Try again.'}</span>`;
            }
        } catch (error) {
            messageDiv.innerHTML = '<span style="color: #e11d48;">❌ Connection error. Please try again.</span>';
        } finally {
            btn.disabled = false;
            btn.innerText = 'Join';
        }
    }

    // Handle case where app is already installed or launched from standalone
    window.addEventListener('appinstalled', (event) => {
        console.log('👍', 'appinstalled', event);
        // Clear the deferredPrompt so it can be garbage collected
        deferredPrompt = null;
        // Hide the banner
        if (pwaBanner) pwaBanner.style.display = 'none';
    });

    // --- 6. ANIMATED COUNTERS & PROGRESS BAR WITH NATIVE JS ---
    const animatedCounters = document.querySelectorAll('.counter');
    const animatedProgressFills = document.querySelectorAll('.progress-fill, .milestone-progress-fill');

    const animateOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                // Animating Counter Numbers
                if (element.classList.contains('counter')) {
                    const target = +element.getAttribute('data-target') || 0;
                    const duration = 1500; // 1.5 seconds
                    const startTime = performance.now();
                    
                    const updateCount = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        
                        // Ease out quad formula
                        const easeProgress = progress * (2 - progress);
                        const currentValue = Math.floor(easeProgress * target);
                        
                        element.innerText = currentValue.toLocaleString();
                        
                        if (progress < 1) {
                            requestAnimationFrame(updateCount);
                        } else {
                            element.innerText = target.toLocaleString();
                        }
                    };
                    requestAnimationFrame(updateCount);
                }
                
                // Animating Progress Fills
                if (element.classList.contains('progress-fill') || element.classList.contains('milestone-progress-fill')) {
                    const targetWidth = element.getAttribute('data-width') || 0;
                    element.style.width = targetWidth + '%';
                    
                    // Update matching progress percentage indicator if present
                    const parent = element.closest('.impact-progress-container') || element.parentElement.parentElement;
                    if (parent) {
                        const percentDisplay = parent.querySelector('.progress-percentage');
                        if (percentDisplay) {
                            const duration = 1500;
                            const startTime = performance.now();
                            
                            const updatePercent = (currentTime) => {
                                const elapsed = currentTime - startTime;
                                const progress = Math.min(elapsed / duration, 1);
                                const currentValue = Math.floor(progress * targetWidth);
                                
                                percentDisplay.innerText = currentValue + '%';
                                
                                if (progress < 1) {
                                    requestAnimationFrame(updatePercent);
                                } else {
                                    percentDisplay.innerText = targetWidth + '%';
                                }
                            };
                            requestAnimationFrame(updatePercent);
                        }
                    }
                }
                
                observer.unobserve(element);
            }
        });
    }, { threshold: 0.1 });

    animatedCounters.forEach(counter => animateOnScroll.observe(counter));
    animatedProgressFills.forEach(fill => animateOnScroll.observe(fill));

    // --- 7. INTERACTIVE MAP INITIALIZATION ---
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        // Center on Africa: [4.0, 16.0] at zoom level 3
        const map = L.map('map', {
            scrollWheelZoom: false // Disable accidental zoom while scrolling
        }).setView([4.0, 16.0], 3);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Custom Green Icon
        const greenIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        // African Country Locations
        const locations = [
            { key: "kenya", name: "Kenya", region: "TEAMENVIRONMENT KENYA", coords: [-1.286389, 36.817223], trees: "150,000", details: "Core restoration projects in Ngong Hills and Nyeri watersheds." },
            { key: "uganda", name: "Uganda", region: "TEAMENVIRONMENT UGANDA", coords: [0.3476, 32.5825], trees: "85,000", details: "Mabira Forest restoration and community agroforestry." },
            { key: "tanzania", name: "Tanzania", region: "TEAMENVIRONMENT TANZANIA", coords: [-6.1612, 35.7454], trees: "95,000", details: "Mount Kilimanjaro slopes conservation and Dodoma dryland regreening." },
            { key: "rwanda", name: "Rwanda", region: "TEAMENVIRONMENT RWANDA", coords: [-1.9403, 29.8739], trees: "60,000", details: "Terraced agroforestry and bamboo riverbank stabilization." },
            { key: "ethiopia", name: "Ethiopia", region: "TEAMENVIRONMENT ETHIOPIA", coords: [9.145, 40.4896], trees: "110,000", details: "Highland watershed restoration and native tree planting." },
            { key: "nigeria", name: "Nigeria", region: "TEAMENVIRONMENT NIGERIA", coords: [9.0820, 8.6753], trees: "125,000", details: "Great Green Wall forestation and Niger Delta mangrove recovery." },
            { key: "ghana", name: "Ghana", region: "TEAMENVIRONMENT GHANA", coords: [7.9465, -1.0232], trees: "75,000", details: "Riparian watershed protection and cocoa agroforestry." },
            { key: "senegal", name: "Senegal", region: "TEAMENVIRONMENT SENEGAL", coords: [14.4974, -14.4524], trees: "55,000", details: "Coastal mangrove reforestation and dryland windbreaks." },
            { key: "ivory-coast", name: "Ivory Coast", region: "TEAMENVIRONMENT IVORY COAST", coords: [7.5400, -5.5471], trees: "65,000", details: "Degraded national park recovery and cocoa soil enrichment." },
            { key: "egypt", name: "Egypt", region: "TEAMENVIRONMENT EGYPT", coords: [26.8206, 30.8025], trees: "45,000", details: "Desert afforestation using treated wastewater and Cairo urban greening." },
            { key: "morocco", name: "Morocco", region: "TEAMENVIRONMENT MOROCCO", coords: [31.7917, -7.0926], trees: "70,000", details: "Argan forest restoration in the Atlas mountains." },
            { key: "algeria", name: "Algeria", region: "TEAMENVIRONMENT ALGERIA", coords: [28.0339, 1.6596], trees: "50,000", details: "Green Dam pine forestation to combat desertification." },
            { key: "tunisia", name: "Tunisia", region: "TEAMENVIRONMENT TUNISIA", coords: [33.8869, 9.5375], trees: "40,000", details: "Semi-arid dryland olive tree integration and rainwater harvest." }
        ];

        locations.forEach(loc => {
            L.marker(loc.coords, { icon: greenIcon })
                .addTo(map)
                .bindPopup(`
                    <div style="font-family: 'Montserrat', sans-serif; padding: 5px; min-width: 200px;">
                        <h4 style="margin: 0 0 6px 0; color: #0f172a; font-weight: 700; font-size: 1.1rem; line-height: 1.2;">${loc.name}</h4>
                        <span style="font-size: 0.72rem; text-transform: uppercase; color: #54B435; font-weight: 800; letter-spacing: 1px; display: block; margin-bottom: 8px;">${loc.region}</span>
                        <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; margin: 0 0 12px 0;">${loc.details}</p>
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                            <span style="font-size: 0.8rem; color: #475569; font-weight: 700;"><i class="fas fa-tree" style="color: #54B435;"></i> ${loc.trees}</span>
                            <a href="/country/${loc.key}" style="background: #54B435; color: white; padding: 6px 12px; font-size: 0.75rem; border-radius: 50px; text-decoration: none; font-weight: 700; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(84, 180, 53, 0.2); display: inline-block;">Explore</a>
                        </div>
                    </div>
                `);
        });
    }

    // --- 8. CORPORATE PARTNERS SLIDER ---
    const logoSlider = document.querySelector('.logo-slider');
    if (logoSlider) {
        const partnerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    logoSlider.classList.add('is-visible');
                }
            });
        }, { threshold: 0.1 });

        partnerObserver.observe(logoSlider);
    }

    // --- 9. CONTACT FORM SUBMISSION ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('contactName').value;
            const email = document.getElementById('contactEmail').value;
            const subject = document.getElementById('contactSubject').value;
            const message = document.getElementById('contactMessage').value;
            const statusDiv = document.getElementById('contactStatus');
            const btn = document.getElementById('contactBtn');

            // Reset status
            statusDiv.innerHTML = '';
            
            // Basic Validation
            if (!name || !validateEmail(email) || !message) {
                statusDiv.innerHTML = '<span class="status-error">❌ Please fill in all required fields correctly.</span>';
                return;
            }

            // UI State
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            try {
                const response = await fetch('/submit-contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, subject, message })
                });

                const result = await response.json();

                if (response.ok) {
                    statusDiv.innerHTML = `<span class="status-success">✔ ${result.success}</span>`;
                    contactForm.reset();
                } else {
                    statusDiv.innerHTML = `<span class="status-error">❌ ${result.error || 'Failed to send message.'}</span>`;
                }
            } catch (error) {
                statusDiv.innerHTML = '<span class="status-error">❌ Connection error. Please try again later.</span>';
            } finally {
                btn.disabled = false;
                btn.innerText = 'Send Message';
            }
        });
    }

});
