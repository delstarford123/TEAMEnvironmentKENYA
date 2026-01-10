import requests
from flask import Flask, request, jsonify, render_template
from datetime import datetime
import base64

app = Flask(__name__)

# --- CONFIGURATION ---
# Note: It is generally safer not to post these keys publicly, 
# but since this is a Sandbox/Test environment, it is okay for now.
CONSUMER_KEY = 'mjpi9dRnBx6ZgredXiDbOK8U1gSnCds5TdJr7A3VrAdEg5a0'
CONSUMER_SECRET = 'CPiCSfv7qWx5faY0tfHElspd1OMA9IBIlJo86snqBMtGhtglvBKPwzP2mG3d33hD'
PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
BUSINESS_SHORT_CODE = '174379'  # Sandbox Paybill
CALLBACK_URL = 'https://your-ngrok-url.ngrok-free.app/callback' # You will need Ngrok for this later

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

# --- ROUTE 1: HOME PAGE (Fixes 404 Error) ---
@app.route('/')
def home():
    # This looks for index.html in the 'templates' folder
    return render_template('index.html')

# --- ROUTE 2: INITIATE PAYMENT ---
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
        "AccountReference": "IIG SMART FARMER",
        "TransactionDesc": "Payment for Goods"
    }

    stk_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    response = requests.post(stk_url, json=payload, headers=headers)
    
    return response.json()

# --- ROUTE 3: CALLBACK (Where M-Pesa sends the result) ---
@app.route('/callback', methods=['POST'])
def callback():
    data = request.json
    print("CALLBACK DATA:", data)
    return "OK"
from flask import Flask, render_template

app = Flask(__name__)

# 1. Route for the Homepage
@app.route('/')
@app.route('/index.html')
def home():
    return render_template('index.html')

# 2. Route for About Page
@app.route('/about.html')
@app.route('/about')
def about():
    return render_template('about.html')

# 3. Route for Services Page
@app.route('/services.html')
@app.route('/services')
def services():
    return render_template('services.html')

# 4. Route for Events Page
@app.route('/events.html')
@app.route('/events')
def events():
    return render_template('events.html')

# 5. Route for Blog Page
@app.route('/blog.html')
@app.route('/blog')
def blog():
    return render_template('blog.html')

# 6. Route for Contact Page
# Note: Matches both /contact-us (used in nav) and /contact.html
@app.route('/contact-us')
@app.route('/contact.html')
def contact():
    return render_template('contact.html')

if __name__ == '__main__':
    # Debug mode allows you to see changes without restarting the server
    app.run(debug=True, port=5000)
# --- RUN SERVER (Fixes 'Real Phone' connection) ---
if __name__ == '__main__':
    # host='0.0.0.0' allows your phone to connect to your laptop
    app.run(host='0.0.0.0', port=5000, debug=True)