import os
from flask import render_template
from weasyprint import HTML
from datetime import datetime

def generate_donation_receipt(donor_name, amount, mpesa_receipt_number, date=None, payment_method='M-Pesa'):
    """
    Generates a professional PDF receipt from an HTML template.
    Returns the absolute file path to the generated PDF.
    
    Requires: pip install weasyprint
    """
    if date is None:
        date = datetime.now().strftime('%d %B, %Y %I:%M %p')

    # Data to pass into the HTML template
    receipt_data = {
        'donor_name': donor_name,
        'amount': amount,
        'mpesa_receipt_number': mpesa_receipt_number,
        'date': date,
        'payment_method': payment_method
    }

    # Render HTML from template
    rendered_html = render_template('payments/receipt_template.html', **receipt_data)

    # Define temporary file path
    receipts_dir = os.path.join(os.getcwd(), 'temp_receipts')
    if not os.path.exists(receipts_dir):
        os.makedirs(receipts_dir)

    filename = f"Receipt_{mpesa_receipt_number}.pdf"
    file_path = os.path.join(receipts_dir, filename)

    # Convert HTML to PDF using WeasyPrint
    HTML(string=rendered_html).write_pdf(file_path)

    return file_path

# --- Integration Example for SMTP ---
# def send_receipt_email(recipient_email, donor_name, amount, receipt_no):
#     from email.mime.application import MIMEApplication
#     
#     # 1. Generate the PDF
#     pdf_path = generate_donation_receipt(donor_name, amount, receipt_no)
#     
#     # 2. Setup Email
#     msg = MIMEMultipart()
#     msg['Subject'] = f"Your TEK Donation Receipt: {receipt_no}"
#     # ... (other headers)
#     
#     # 3. Attach PDF
#     with open(pdf_path, "rb") as f:
#         attach = MIMEApplication(f.read(), _subtype="pdf")
#         attach.add_header('Content-Disposition', 'attachment', filename=os.path.basename(pdf_path))
#         msg.attach(attach)
#     
#     # 4. Send via smtplib
#     # ...
