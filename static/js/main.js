document.addEventListener('DOMContentLoaded', function() {
    // --- 1. MOBILE MENU TOGGLE ---
    const mobileToggle = document.querySelector('.mobile-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (mobileToggle && mainNav) {
        mobileToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
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

    // --- 3. INITIATE PAYMENT ---
    window.initiatePayment = async function() {
        const phoneInput = document.getElementById('phone');
        const amountInput = document.getElementById('amount');
        const btn = document.getElementById('payBtn');

        if (!phoneInput || !amountInput || !statusDiv || !btn) return;

        const phone = phoneInput.value;
        const amount = amountInput.value;

        // Simple validation before processing
        if(!validatePhone(phone) || !amount || amount <= 0) {
            if(!validatePhone(phone)) showValidation('phone', 'Please enter a valid phone (e.g. 254712345678)');
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
                body: JSON.stringify({ phone: phone, amount: amount })
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

    // Handle case where app is already installed or launched from standalone
    window.addEventListener('appinstalled', (event) => {
        console.log('👍', 'appinstalled', event);
        // Clear the deferredPrompt so it can be garbage collected
        deferredPrompt = null;
        // Hide the banner
        if (pwaBanner) pwaBanner.style.display = 'none';
    });
});
