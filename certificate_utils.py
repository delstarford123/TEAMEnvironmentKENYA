import os
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib import colors
from datetime import datetime

def generate_certificate(name, certificate_type="Donor", impact_details="", output_dir="certificates"):
    """
    Generates a professional Certificate of Impact using ReportLab.
     certificate_type: "Donor" or "Volunteer"
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"Certificate_{certificate_type}_{name.replace(' ', '_')}_{timestamp}.pdf"
    file_path = os.path.join(output_dir, filename)

    # Create a landscape A4 canvas
    c = canvas.Canvas(file_path, pagesize=landscape(A4))
    width, height = landscape(A4)

    # --- Draw Background / Border ---
    c.setStrokeColor(colors.HexColor("#54B435")) # TEK Green
    c.setLineWidth(10)
    c.rect(0.2*inch, 0.2*inch, width - 0.4*inch, height - 0.4*inch)
    
    c.setStrokeColor(colors.HexColor("#0F172A")) # TEK Dark
    c.setLineWidth(2)
    c.rect(0.3*inch, 0.3*inch, width - 0.6*inch, height - 0.6*inch)

    # --- Header ---
    c.setFont("Helvetica-Bold", 40)
    c.setFillColor(colors.HexColor("#0F172A"))
    c.drawCentredString(width/2, height - 1.5*inch, "CERTIFICATE OF IMPACT")
    
    c.setFont("Helvetica", 18)
    c.setFillColor(colors.HexColor("#54B435"))
    c.drawCentredString(width/2, height - 2*inch, "Presented by TEAMEnvironment KENYA")

    # --- Body Text ---
    c.setFont("Helvetica", 20)
    c.setFillColor(colors.HexColor("#0F172A"))
    c.drawCentredString(width/2, height - 3.2*inch, "This is to certify that")
    
    c.setFont("Helvetica-Bold", 48)
    c.setFillColor(colors.HexColor("#54B435"))
    c.drawCentredString(width/2, height - 4.2*inch, name.upper())

    c.setFont("Helvetica", 20)
    c.setFillColor(colors.HexColor("#0F172A"))
    if certificate_type == "Donor":
        text = "has made a significant contribution towards our mission of"
    else:
        text = "has successfully dedicated their time and effort as a Volunteer for"
    
    c.drawCentredString(width/2, height - 5*inch, text)
    
    c.setFont("Helvetica-BoldOblique", 22)
    c.drawCentredString(width/2, height - 5.5*inch, "GREENING KENYA & CLIMATE RESILIENCE")

    if impact_details:
        c.setFont("Helvetica-Oblique", 16)
        c.drawCentredString(width/2, height - 6.2*inch, impact_details)

    # --- Footer / Signatures ---
    c.setStrokeColor(colors.HexColor("#0F172A"))
    c.setLineWidth(1)
    
    # Signature Line 1
    c.line(1.5*inch, 1.5*inch, 4*inch, 1.5*inch)
    c.setFont("Helvetica", 12)
    c.drawCentredString(2.75*inch, 1.3*inch, "Joseph Kithyaka")
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(2.75*inch, 1.1*inch, "National Chairman & Patron")

    # Signature Line 2
    c.line(width - 4*inch, 1.5*inch, width - 1.5*inch, 1.5*inch)
    c.drawCentredString(width - 2.75*inch, 1.3*inch, "Ochanda Mathew")
    c.drawCentredString(width - 2.75*inch, 1.1*inch, "Executive Director")

    # Date
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, 1.3*inch, f"Date: {datetime.now().strftime('%B %d, %Y')}")

    # --- Branding ---
    # In a real app, you'd use c.drawImage("static/images/TEK.jpeg", ...)
    # For now we use text branding
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(colors.HexColor("#54B435"))
    c.drawCentredString(width/2, 0.7*inch, "www.teamenvironment.org")

    c.save()
    return file_path
