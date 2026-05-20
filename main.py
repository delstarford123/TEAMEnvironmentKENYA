import os
import requests
import base64
import smtplib
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash

# ==========================================
#  0. SENTRY INITIALIZATION
# ==========================================
sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    integrations=[FlaskIntegration()],
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    traces_sample_rate=1.0,
    # Set profiles_sample_rate to 1.0 to profile every transaction.
    profiles_sample_rate=1.0,
)
from datetime import datetime
from functools import wraps
from werkzeug.utils import secure_filename
from firebase_config import initialize_firebase, db
from dotenv import load_dotenv
from receipt_utils import generate_donation_receipt

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default_secret_key')

# ==========================================
#  1. FIREBASE INITIALIZATION
# ==========================================
bucket = initialize_firebase()

# ==========================================
#  2. CONFIGURATION (M-PESA & ADMIN)
# ==========================================
CONSUMER_KEY = os.environ.get('CONSUMER_KEY')
CONSUMER_SECRET = os.environ.get('CONSUMER_SECRET')
PASSKEY = os.environ.get('PASSKEY')
BUSINESS_SHORT_CODE = '174379'
CALLBACK_URL = os.environ.get('CALLBACK_URL', 'https://teamenvironmentkenya.onrender.com/callback')

ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# ==========================================
#  3. HELPER FUNCTIONS & DECORATORS
# ==========================================

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def upload_to_firebase(file, folder="uploads"):
    """Uploads a file to Firebase Storage and returns the public URL."""
    if not file:
        return None
    
    filename = secure_filename(file.filename)
    # Add timestamp to filename to prevent collisions
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
    blob = bucket.blob(f"{folder}/{filename}")
    
    # Set content type (optional but recommended)
    blob.upload_from_file(file, content_type=file.content_type)
    blob.make_public()
    return blob.public_url

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

def send_email(subject, recipient, body, attachment_path=None):
    from email.mime.application import MIMEApplication
    SMTP_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com') 
    SMTP_PORT = int(os.environ.get('MAIL_PORT', 587)) 
    SENDER_EMAIL = os.environ.get('MAIL_USERNAME')
    SENDER_PASSWORD = os.environ.get('MAIL_PASSWORD')

    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("❌ Email credentials missing.")
        return False

    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = recipient
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    # Optional Attachment
    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, "rb") as f:
            attach = MIMEApplication(f.read(), _subtype="pdf")
            attach.add_header('Content-Disposition', 'attachment', filename=os.path.basename(attachment_path))
            msg.attach(attach)

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False

# ==========================================
#  4. WEBSITE ROUTES (Navigation)
# ==========================================

@app.route('/')
@app.route('/index.html')
def home():
    return render_template('main/index.html')

@app.route('/about')
@app.route('/about.html')
def about():
    return render_template('main/about.html')

@app.route('/services')
@app.route('/services.html')
def services():
    return render_template('main/services.html')

@app.route('/events')
@app.route('/events.html')
def events():
    # Fetch events from Firebase
    events_ref = db.reference('events')
    events_data = events_ref.get()
    
    upcoming_events = []
    past_events = []
    
    if events_data:
        for event_id, event in events_data.items():
            event['id'] = event_id
            if event.get('status') == 'upcoming':
                upcoming_events.append(event)
            else:
                past_events.append(event)
    
    return render_template('events/events.html', upcoming_events=upcoming_events, past_events=past_events)

@app.route('/activities')
@app.route('/activities.html')
def activities():
    # Fetch activities from Firebase
    activities_ref = db.reference('activities')
    activities_data = activities_ref.get()
    
    activities_list = []
    if activities_data:
        for act_id, act in activities_data.items():
            act['id'] = act_id
            activities_list.append(act)
    
    # Sort by date (newest first)
    activities_list.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    return render_template('main/activities.html', activities=activities_list)



@app.route('/register')
@app.route('/register.html')
def register():
    return render_template('auth/register.html')

@app.route('/blog')
@app.route('/blog.html')
def blog():
    # Example of passing dynamic SEO variables for a page
    return render_template(
        'blog/blog.html',
        page_title='Our Impact Stories',
        page_description='Read the latest updates and success stories from TEAMEnvironment KENYA\'s conservation efforts.',
        feature_image_url=url_for('static', filename='images/Climate resilience.jpeg', _external=True)
    )

@app.route('/our-team')
@app.route('/our-team.html')
def team():
    return render_template('main/team.html')

@app.route('/contact')
@app.route('/contact.html')
def contact():
    return render_template('main/contact.html')

@app.route('/work')
@app.route('/work.html')
def work():
    return render_template('main/work.html')

@app.route('/privacy')
@app.route('/privacy-policy')
def privacy():
    return render_template('main/privacy.html')

@app.route('/terms')
@app.route('/terms-of-service')
def terms():
    return render_template('main/terms.html')

@app.route('/impact')
def impact():
    # In a real scenario, you would fetch these numbers from Firebase
    stats = {
        "trees_planted": "150,000+",
        "volunteers": "5,000+",
        "communities": "120+",
        "acres_restored": "2,500+"
    }
    return render_template('main/impact.html', stats=stats)

@app.route('/resources')
def resources():
    # You could fetch documents from Firebase Storage or a list in DB
    documents = [
        {"title": "TEK & KFS MOU", "filename": "TEK & KFS MOU for Ngong Hills Adoption for Rehabilitation and Restoration...pdf"},
        {"title": "Sustainable Restoration Cost", "filename": "KFS - Team Environment Kenya... Ngong Hills Ecosystem... SUSTAINABLE RESTORATION COST...pdf"},
        {"title": "Tree Forest Cover Commitment", "filename": "TEK'S COMMITMENT TOWARDS THE ATTAINMENT OF 30% (TREE) FOREST COVER BY 2032.pdf"}
    ]
    return render_template('main/resources.html', documents=documents)

@app.route('/faq')
def faq():
    return render_template('main/faq.html')

@app.route('/offline')
def offline():
    return render_template('main/offline.html')

# ==========================================
#  5. ADMIN ROUTES
# ==========================================

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid credentials!', 'danger')
            
    return render_template('admin/login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('home'))

@app.route('/admin')
@login_required
def admin_dashboard():
    events_ref = db.reference('events')
    events = events_ref.get()
    bookings_ref = db.reference('bookings')
    bookings = bookings_ref.get()
    activities_ref = db.reference('activities')
    activities = activities_ref.get()
    return render_template('admin/admin.html', events=events, bookings=bookings, activities=activities)

@app.route('/admin/add-event', methods=['POST'])
@login_required
def add_event():
    # Handle image upload
    image_file = request.files.get('image')
    image_url = upload_to_firebase(image_file, "events") if image_file else request.form.get('image_url')

    event_data = {
        'title': request.form.get('title'),
        'date': request.form.get('date'),
        'location': request.form.get('location'),
        'description': request.form.get('description'),
        'image_url': image_url,
        'status': request.form.get('status', 'upcoming'),
        'created_at': datetime.now().isoformat()
    }
    db.reference('events').push(event_data)
    flash('Event added successfully!', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/delete-event/<event_id>')
@login_required
def delete_event(event_id):
    db.reference(f'events/{event_id}').delete()
    flash('Event deleted successfully!', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/add-activity', methods=['POST'])
@login_required
def add_activity():
    title = request.form.get('title')
    description = request.form.get('description')
    media_file = request.files.get('media')
    
    if not title or not media_file:
        flash('Title and Media are required!', 'danger')
        return redirect(url_for('admin_dashboard'))
    
    # Determine if it's a video or image based on content type
    media_type = 'video' if media_file.content_type.startswith('video') else 'image'
    media_url = upload_to_firebase(media_file, "activities")
    
    activity_data = {
        'title': title,
        'description': description,
        'media_url': media_url,
        'media_type': media_type,
        'created_at': datetime.now().isoformat()
    }
    
    db.reference('activities').push(activity_data)
    flash('Activity posted successfully!', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/delete-activity/<activity_id>')
@login_required
def delete_activity(activity_id):
    db.reference(f'activities/{activity_id}').delete()
    flash('Activity deleted successfully!', 'success')
    return redirect(url_for('admin_dashboard'))

# ==========================================
#  6. BOOKING & APPLICATIONS
# ==========================================

@app.route('/book-event', methods=['POST'])
def book_event():
    data = request.json
    event_id = data.get('event_id')
    event_title = data.get('event_title')
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    
    booking_data = {
        'event_id': event_id,
        'event_title': event_title,
        'name': name,
        'email': email,
        'phone': phone,
        'booked_at': datetime.now().isoformat()
    }
    
    # Save to Firebase
    db.reference('bookings').push(booking_data)
    
    # Send Email to Admin
    admin_body = f"""
    New Event Booking Received:
    Event: {event_title}
    Name: {name}
    Email: {email}
    Phone: {phone}
    """
    send_email(f"New Booking: {event_title}", 'teamenvironment.ke@gmail.com', admin_body)
    
    # Send Confirmation to User
    user_body = f"""
    Hi {name},
    
    Thank you for booking for the event: {event_title}.
    We have received your application and will contact you soon with more details.
    
    Best regards,
    TEAMEnvironment KENYA
    """
    send_email(f"Booking Confirmation: {event_title}", email, user_body)
    
    return jsonify({"success": "Booking successful! Check your email for confirmation."}), 200

@app.route('/submit-application', methods=['POST'])
def submit_application():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    position = data.get('position')
    message = data.get('message')
    
    if not name or not email or not phone:
        return jsonify({"error": "Please fill in all required fields."}), 400
       
    body = f"New Job Application from {name}\nPosition: {position}\nPhone: {phone}\nEmail: {email}\nMessage: {message}"
    email_sent = send_email(f"Job Application: {name}", 'teamenvironment.ke@gmail.com', body)

    return jsonify({"success": "Application received!"}), 200

# ==========================================
#  7. PAYMENT ROUTES (M-PESA)
# ==========================================

@app.route('/pay', methods=['POST'])
def pay():
    data = request.json
    phone = data.get('phone')
    amount = data.get('amount')

    if not phone or not amount:
        return jsonify({"error": "Phone and Amount are required"}), 400

    if phone.startswith('0'):
        phone = '254' + phone[1:]
    elif phone.startswith('+254'):
        phone = phone[1:]
    
    access_token = get_access_token()
    if not access_token:
        return jsonify({"error": "Failed to generate M-Pesa Token"}), 500

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = generate_password(timestamp)

    payload = {
        "BusinessShortCode": BUSINESS_SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone,
        "PartyB": BUSINESS_SHORT_CODE,
        "PhoneNumber": phone,
        "CallBackURL": CALLBACK_URL,
        "AccountReference": "TEAMEnvironment KENYA",
        "TransactionDesc": "Donation"
    }

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers=headers
        )
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/callback', methods=['POST'])
def callback():
    data = request.json
    db.reference('payments').push(data)
    
    # Process successful payment
    try:
        if data and 'Body' in data and 'stkCallback' in data:
            callback_data = data['Body']['stkCallback']
            result_code = callback_data.get('ResultCode')
            
            if result_code == 0:
                # Payment successful
                metadata = callback_data.get('CallbackMetadata', {}).get('Item', [])
                
                payment_info = {}
                for item in metadata:
                    payment_info[item['Name']] = item.get('Value')
                
                amount = payment_info.get('Amount')
                receipt_no = payment_info.get('MpesaReceiptNumber')
                phone = payment_info.get('PhoneNumber')
                
                # In a real app, you'd look up the user by phone or session
                # For now, we use a generic name or look up from a 'pending_donations' table
                donor_name = "Valued Supporter"
                
                # Generate PDF Receipt
                pdf_path = generate_donation_receipt(donor_name, amount, receipt_no)
                print(f"✅ Receipt generated: {pdf_path}")
                
                # Optional: If you had the donor's email, you'd send it here
                # send_email("Your Donation Receipt", donor_email, "Thank you...", pdf_path)
                
    except Exception as e:
        print(f"❌ Error processing callback: {str(e)}")
        
    return "OK"

@app.route('/projects')
@app.route('/projects.html')
def projects():
    # Fetch specific projects/sites from Firebase
    projects_ref = db.reference('projects')
    projects_data = projects_ref.get()
    
    projects_list = []
    if projects_data:
        for p_id, p in projects_data.items():
            p['id'] = p_id
            projects_list.append(p)
    
    return render_template('main/work.html', projects=projects_list) # Reusing work.html or creating projects.html

@app.route('/gift-a-tree')
def gift_a_tree():
    return render_template('payments/pay.html', gift_mode=True)

@app.route('/transparency')
def transparency():
    # In a real scenario, you would fetch these numbers from Firebase
    stats = {
        "trees_planted": "150,000+",
        "volunteers": "5,000+",
        "communities": "120+",
        "acres_restored": "2,500+"
    }
    # Fetch impact reports
    reports = [
        {"title": "Annual Impact Report 2025", "url": "#"},
        {"title": "Financial Transparency 2024", "url": "#"},
        {"title": "Tree Survival Audit", "url": "#"}
    ]
    return render_template('main/impact.html', reports=reports, stats=stats)

@app.route('/calculator')
def calculator():
    return render_template('main/calculator.html')

@app.route('/corporate')
def corporate():
    return render_template('main/services.html', corporate_mode=True)

@app.route('/ambassadors')
def ambassadors():
    return render_template('main/team.html', ambassadors_mode=True)

@app.route('/newsletter-signup', methods=['POST'])
def newsletter_signup():
    email = request.form.get('email')
    if email:
        db.reference('newsletter_subs').push({'email': email, 'signed_up_at': datetime.now().isoformat()})
        return jsonify({"success": "Thank you for joining our mission!"}), 200
    return jsonify({"error": "Email is required"}), 400

@app.route('/sw.js')
def serve_sw():
    return app.send_static_file('sw.js')

@app.route('/manifest.json')
def serve_manifest():
    return app.send_static_file('manifest.json')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)