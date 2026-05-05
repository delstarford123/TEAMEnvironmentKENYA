import os
import requests
from flask import Flask, request, jsonify, render_template
from datetime import datetime
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# --- CONFIGURATION ---
# Credentials are now loaded from environment variables for security.
CONSUMER_KEY = os.environ.get('CONSUMER_KEY')
CONSUMER_SECRET = os.environ.get('CONSUMER_SECRET')
PASSKEY = os.environ.get('PASSKEY')
BUSINESS_SHORT_CODE = '174379'  # Sandbox Paybill
CALLBACK_URL = os.environ.get('CALLBACK_URL', 'https://your-ngrok-url.ngrok-free.app/callback')

# --- HELPER: GET ACCESS TOKEN ---

def get_access_token():
    api_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    try:
        r = requests.get(api_url, auth=(CONSUMER_KEY, CONSUMER_SECRET))
        r.raise_for_status()
        return r.json()['access_token']
    except Exception as e:
        print(f"Error getting token: {e}")
        return None

# --- HELPER: GENERATE PASSWORD ---
def generate_password(timestamp):
    data_to_encode = BUSINESS_SHORT_CODE + PASSKEY + timestamp
    return base64.b64encode(data_to_encode.encode()).decode('utf-8')

# --- ROUTES ---

@app.route('/')
@app.route('/index.html')
def home():
    return render_template('main/index.html')

@app.route('/about.html')
@app.route('/about')
def about():
    return render_template('main/about.html')

@app.route('/services.html')
@app.route('/services')
def services():
    return render_template('main/services.html')

@app.route('/events.html')
@app.route('/events')
def events():
    return render_template('events/events.html')

@app.route('/blog.html')
@app.route('/blog')
def blog():
    return render_template('blog/blog.html')

@app.route('/contact-us')
@app.route('/contact.html')
def contact():
    return render_template('main/contact.html')

# --- PAYMENT ROUTES ---

@app.route('/pay', methods=['POST'])
def pay():
    data = request.json
    phone_number = data.get('phone') # Format: 2547XXXXXXXX
    amount = data.get('amount')

    access_token = get_access_token()
    if not access_token:
        return jsonify({"error": "Failed to authenticate"}), 500

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = generate_password(timestamp)

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    payload = {
        "BusinessShortCode": BUSINESS_SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_number,
        "PartyB": BUSINESS_SHORT_CODE,
        "PhoneNumber": phone_number,
        "CallBackURL": CALLBACK_URL,
        "AccountReference": "TEK",
        "TransactionDesc": "Payment for Goods"
    }

    stk_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    try:
        response = requests.post(stk_url, json=payload, headers=headers)
        return response.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/callback', methods=['POST'])
def callback():
    data = request.json
    print("CALLBACK DATA:", data)
    return "OK"

if __name__ == '__main__':
    # host='0.0.0.0' allows your phone to connect to your laptop
    app.run(host='0.0.0.0', port=5000, debug=True)
