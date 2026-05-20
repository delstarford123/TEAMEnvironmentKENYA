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

    // --- 2. M-PESA MODAL LOGIC ---
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
    }

    // Close modal if clicking outside the box
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }

    // --- 3. PAYMENT METHOD SWITCHER ---
    window.switchPayment = function(method) {
        // Update tabs
        document.querySelectorAll('.payment-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${method}-tab`).classList.add('active');

        // Update method cards
        document.querySelectorAll('.method-card').forEach(card => card.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }

    // --- 4. INITIATE PAYMENT ---
    window.initiatePayment = async function() {
        const nameInput = document.getElementById('donor_name');
        const emailInput = document.getElementById('donor_email');
        const phoneInput = document.getElementById('phone');
        const amountInput = document.getElementById('amount');
        const btn = document.getElementById('payBtn');

        if (!nameInput || !emailInput || !phoneInput || !amountInput || !btn) return;

        const name = nameInput.value;
        const email = emailInput.value;
        const phone = phoneInput.value;
        const amount = amountInput.value;

        // Validation
        if(!name || !validateEmail(email) || !validatePhone(phone) || !amount || amount <= 0) {
            if(!name) showValidation('donor_name', 'Please enter your full name');
            if(!validateEmail(email)) showValidation('donor_email', 'Please enter a valid email');
            if(!validatePhone(phone)) showValidation('phone', 'Please enter a valid phone');
            if(!amount || amount <= 0) showValidation('amount', 'Please enter a valid amount');
            return;
        }

        // Switch to processing state
        formContainer.classList.add('hidden');
        processingContainer.classList.add('active');
        statusDiv.innerHTML = '';

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

            if (response.ok) {
                processingStatus.innerHTML = '<span class="status-success">✔ STK Push Sent! Enter PIN on your phone.</span>';
                // Automatically close after 8 seconds if successful
                setTimeout(closeModal, 8000);
            } else {
                processingContainer.classList.remove('active');
                formContainer.classList.remove('hidden');
                statusDiv.innerHTML = `<span class="status-error">❌ Error: ${result.error || 'Payment failed'}</span>`;
            }
        } catch (error) {
            processingContainer.classList.remove('active');
            formContainer.classList.remove('hidden');
            statusDiv.innerHTML = '<span class="status-error">❌ Connection failed. Check your internet.</span>';
        }
    }

    // --- 4. INLINE VALIDATION HELPERS ---
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

    // Attach listeners to modal fields
    const modalPhone = document.getElementById('phone');
    if (modalPhone) {
        modalPhone.addEventListener('input', function() {
            if (validatePhone(this.value)) clearValidation('phone');
            else showValidation('phone', 'Format: 2547XXXXXXXX');
        });
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

    // --- 6. ANIMATED COUNTERS & PROGRESS BAR ---
    const statsSection = document.querySelector('.stats-section');
    const counters = document.querySelectorAll('.counter');
    const progressFills = document.querySelectorAll('.progress-fill');
    const progressPercentages = document.querySelectorAll('.progress-percentage');
    let animatedTracker = false;

    function startTrackerAnimations() {
        if (animatedTracker) return;
        
        // Counter Animation
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const duration = 2000; 
            const increment = target / (duration / 16);
            
            let current = 0;
            const updateCount = () => {
                current += increment;
                if (current < target) {
                    counter.innerText = Math.ceil(current).toLocaleString();
                    requestAnimationFrame(updateCount);
                } else {
                    counter.innerText = target.toLocaleString();
                }
            };
            updateCount();
        });

        // Progress Bar Animation
        progressFills.forEach((fill, index) => {
            const targetWidth = fill.getAttribute('data-width');
            fill.style.width = targetWidth + '%';
            
            let currentPercent = 0;
            const percentDisplay = progressPercentages[index];
            const interval = setInterval(() => {
                if (currentPercent < targetWidth) {
                    currentPercent++;
                    if (percentDisplay) percentDisplay.innerText = currentPercent + '%';
                } else {
                    clearInterval(interval);
                }
            }, 20);
        });

        animatedTracker = true;
    }

    const trackerObserverOptions = {
        threshold: 0.2
    };

    const trackerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                startTrackerAnimations();
            }
        });
    }, trackerObserverOptions);

    if (statsSection) {
        trackerObserver.observe(statsSection);
    }

    // --- 7. INTERACTIVE MAP INITIALIZATION ---
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        // Center of Kenya: [-1.286389, 36.817223] (Nairobi)
        const map = L.map('map', {
            scrollWheelZoom: false // Disable accidental zoom while scrolling
        }).setView([-0.023559, 37.906193], 6.5); // Center on Kenya

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

        // Project Locations
        const locations = [
            {
                name: "Nairobi (HQ)",
                coords: [-1.286389, 36.817223],
                details: "Headquarters and Urban Greening Initiatives."
            },
            {
                name: "Ngong Hills",
                coords: [-1.3611, 36.6569],
                details: "Restoration of 180,000 seedlings in the Ngong Hills Ecosystem."
            },
            {
                name: "Nyeri",
                coords: [-0.4167, 36.9500],
                details: "Watershed conservation and community agroforestry."
            },
            {
                name: "Nakuru",
                coords: [-0.3031, 36.0613],
                details: "Green City Project and climate resilience programs."
            },
            {
                name: "Kakamega",
                coords: [0.2827, 34.7519],
                details: "Indigenous forest restoration in partnership with KALRO."
            }
        ];

        locations.forEach(loc => {
            L.marker(loc.coords, { icon: greenIcon })
                .addTo(map)
                .bindPopup(`<h4>${loc.name}</h4><p>${loc.details}</p>`);
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
