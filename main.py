import os
import requests
import base64
from flask import Flask, request, jsonify, render_template
from datetime import datetime

app = Flask(__name__)

# ==========================================
#  1. CONFIGURATION (M-PESA CREDENTIALS)
# ==========================================
# Note: These are Sandbox keys. For production, never expose these in code.
# In main.py
CONSUMER_KEY = os.environ.get('CONSUMER_KEY')
CONSUMER_SECRET = os.environ.get('CONSUMER_SECRET')
PASSKEY = os.environ.get('PASSKEY')
BUSINESS_SHORT_CODE = '174379'
# ==========================================
#  2. HELPER FUNCTIONS
# ==========================================
import os  # Add this at the very top

# ... inside your configuration section ...

# Use environment variable if available, otherwise default to a placeholder
CALLBACK_URL = os.environ.get('CALLBACK_URL', 'https://your-app.onrender.com/callback')
def get_access_token():
    """Generates an OAuth Access Token from Safaricom."""
    api_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    try:
        r = requests.get(api_url, auth=(CONSUMER_KEY, CONSUMER_SECRET))
        r.raise_for_status()
        return r.json()['access_token']
    except Exception as e:
        print(f"Error getting token: {e}")
        return None

def generate_password(timestamp):
    """Generates the base64 encoded password required for STK Push."""
    data_to_encode = BUSINESS_SHORT_CODE + PASSKEY + timestamp
    return base64.b64encode(data_to_encode.encode()).decode('utf-8')

# ==========================================
#  3. WEBSITE ROUTES (Navigation)
# ==========================================

@app.route('/')
@app.route('/index.html')
def home():
    return render_template('index.html')

@app.route('/about.html')
@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/services.html')
@app.route('/services')
def services():
    return render_template('services.html')

@app.route('/events.html')
@app.route('/events')
def events():
    return render_template('events.html')


@app.route('/register.html')
@app.route('/register')
def register():
    return render_template('register.html')
   
@app.route('/base.html')
@app.route('/base')
def base():
    return render_template('base.html')

@app.route('/blog.html')
@app.route('/blog')
def blog():
    return render_template('blog.html')
@app.route('/our-team.html')
@app.route('/our-team')
def team():
    # Make sure your file is named 'team.html' inside the templates folder
    return render_template('team.html')
@app.route('/contact')
@app.route('/contact.html')
def contact():
    return render_template('contact.html')

# ==========================================
#  4. PAYMENT ROUTES (M-PESA)
# ==========================================
# ... (Keep your imports and configuration at the top)
# --- 1. Route to Render the Work Page ---
@app.route('/work.html')
@app.route('/work')
def work():
    return render_template('work.html')

# --- 2. Route to Handle Job Applications ---
@app.route('/submit-application', methods=['POST'])
def submit_application():
    data = request.json
    
    # Extract data
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    position = data.get('position')
    message = data.get('message')

    # Basic Validation
    if not name or not email or not phone:
        return jsonify({"error": "Please fill in all required fields."}), 400

    # In a real app, you would save this to a database or send an email here.
    # For now, we print it to the terminal.
    print("---------------------------------------")
    print("NEW JOB APPLICATION RECEIVED:")
    print(f"Name: {name}")
    print(f"Email: {email}")
    print(f"Phone: {phone}")
    print(f"Position: {position}")
    print(f"Message: {message}")
    print("---------------------------------------")

    return jsonify({"success": "Application received successfully! We will contact you soon."}), 200
@app.route('/pay', methods=['POST'])
def pay():
    data = request.json
    phone = data.get('phone')
    amount = data.get('amount')

    # 1. VALIDATION
    if not phone or not amount:
        return jsonify({"error": "Phone and Amount are required"}), 400

    # 2. FORMAT PHONE NUMBER (Crucial for M-Pesa)
    # This converts 0722000000 or +254722000000 to 254722000000
    if phone.startswith('0'):
        phone = '254' + phone[1:]
    elif phone.startswith('+254'):
        phone = phone[1:]
    
    # 3. GET TOKEN
    access_token = get_access_token()
    if not access_token:
        print("❌ Error: Could not generate Access Token")
        return jsonify({"error": "Failed to generate M-Pesa Token"}), 500

    # 4. PREPARE PAYLOAD
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = generate_password(timestamp)

    payload = {
        "BusinessShortCode": BUSINESS_SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount), # Ensure amount is an integer
        "PartyA": phone,
        "PartyB": BUSINESS_SHORT_CODE,
        "PhoneNumber": phone,
        "CallBackURL": CALLBACK_URL, # Ensure this is your active Ngrok URL
        "AccountReference": "TEAMEnvironment KENYA",
        "TransactionDesc": "Donation"
    }

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    # 5. SEND TO SAFARICOM
    try:
        print(f"📡 Sending STK Push to: {phone} for Amount: {amount}")
        response = requests.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers=headers
        )
        
        response_data = response.json()
        
        # 6. PRINT THE EXACT RESPONSE FROM SAFARICOM (Check your terminal for this!)
        print("------------------------------------------------")
        print("SAFARICOM RESPONSE:", response_data)
        print("------------------------------------------------")

        # 7. CHECK FOR SUCCESS (ResponseCode '0' means success)
        if response_data.get('ResponseCode') == '0':
            return jsonify(response_data)
        else:
            # If Safaricom refused, send the error back to the frontend
            error_message = response_data.get('errorMessage', 'Unknown Error')
            return jsonify({"error": error_message}), 400

    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return jsonify({"error": str(e)}), 500
@app.route('/callback', methods=['POST'])
def callback():
    """
    Receives the payment result from Safaricom.
    This route will only work if your laptop is exposed via Ngrok.
    """
    data = request.json
    print("---------------------------------------")
    print("M-PESA CALLBACK RECEIVED:")
    print(data)
    print("---------------------------------------")
    
    # In a real app, you would save this data to a database here.
    return "OK"

# ==========================================
#  5. RUN SERVER
# ==========================================

if __name__ == '__main__':
    # host='0.0.0.0' allows access from other devices on the same Wi-Fi (e.g., your phone)
    app.run(host='0.0.0.0', port=5000, debug=True)