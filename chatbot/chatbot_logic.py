import random
import re
from datetime import datetime
from chatbot.chatbot_brain import ChatbotBrain
from firebase_config import db

class ChatbotLogic:
    def __init__(self, model_dir, kb_data=None):
        self.brain = ChatbotBrain(model_dir)
        self.kb = kb_data or {}
        
        self.jokes = [
            "Why did the tree go to the dentist? To get a root canal!",
            "What is a tree's favorite shape? A tree-angle!",
            "How do trees access the internet? They log in!"
        ]

    def find_user_name_by_email(self, email):
        # Scan tables: bookings, payments, contact_messages
        tables = ['bookings', 'payments', 'contact_messages']
        for table in tables:
            try:
                # Try indexed query first
                results = db.reference(table).order_by_child('email').equal_to(email).get()
                if results:
                    for val in results.values():
                        if isinstance(val, dict) and val.get('name'):
                            return val['name']
            except Exception as e:
                print(f"Error querying {table} by email: {e}")
                
            # Fallback manual scan
            try:
                records = db.reference(table).get()
                if records:
                    for val in records.values():
                        if isinstance(val, dict) and val.get('email') == email and val.get('name'):
                            return val['name']
            except Exception as e:
                print(f"Fallback error reading {table}: {e}")
        return None

    def process_request(self, query, session_data):
        q = query.lower().strip()
        
        # Ensure session_data acts as a dictionary
        if session_data is None:
            session_data = {}
            
        # Get current user name from session
        user_name = session_data.get('chat_user_name', '')
        
        # 0. Check for direct M-Pesa STK Push triggers
        # e.g., "donate 1000 to 0712345678" or "gift 5 trees to 0712345678"
        stk_match = re.search(r'\b(?:donate|gift|pay|send|stk)\s+(\d+)\s*(trees?)?\s+to\s+(\+?\d{9,12})\b', q, re.I)
        if stk_match:
            val = int(stk_match.group(1))
            is_trees = stk_match.group(2) is not None
            phone = stk_match.group(3).strip()
            
            amount = val * 500 if is_trees else val
            
            if len(phone) >= 9:
                session_data['stk_push_pending'] = {
                    'phone': phone,
                    'amount': amount
                }
                name_part = f" {user_name}" if user_name else ""
                return f"Initiating an M-Pesa STK Push of KES {amount:,} to phone {phone}{name_part}... Please check your phone for the Safaricom PIN prompt!"

        # 1. Check for name disclosure in the query
        name_match = re.search(r'\b(?:my name is|i am|call me)\s+([a-zA-Z]{2,}(?:\s+[a-zA-Z]{2,})?)', q, re.I)
        if name_match:
            proposed_name = name_match.group(1).strip().title()
            if proposed_name.lower() not in ["hungry", "sad", "happy", "fine", "a bot", "a human", "a user", "tired", "good", "asking"]:
                session_data['chat_user_name'] = proposed_name
                user_name = proposed_name
                return f"Nice to meet you, {proposed_name}! How can I assist you with TEAMEnvironment KENYA today?"
                
        # 2. Check for email disclosure and query Firebase DB
        email_match = re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', query)
        if email_match:
            email = email_match.group(0).lower().strip()
            found_name = self.find_user_name_by_email(email)
            if found_name:
                session_data['chat_user_name'] = found_name
                session_data['chat_user_email'] = email
                return f"Welcome back, {found_name}! I found your records under {email}. How can I assist you with TEAMEnvironment today?"
            else:
                return f"Thank you for sharing your email ({email}). However, I couldn't find any bookings or donations registered with this email. You can still tell me your name directly, and I'll remember it!"

        # 3. Time awareness checks
        now = datetime.now()
        date_str = now.strftime("%B %d, %Y")
        time_str = now.strftime("%I:%M %p")
        
        time_queries = ["what is the time", "what time is it", "tell me the time", "current time", "what's the time"]
        date_queries = ["date today", "what is today's date", "what day is it today", "current date", "today's date", "what date is it"]
        
        if any(t in q for t in time_queries):
            name_part = f", {user_name}" if user_name else ""
            return f"The current local time is <b>{time_str}</b>{name_part}."
            
        if any(d in q for d in date_queries):
            name_part = f", {user_name}" if user_name else ""
            return f"Today's date is <b>{date_str}</b>{name_part}."

        # 4. Greetings and Small Talk
        greeting_words = ["hi", "hello", "hey", "greetings", "yo"]
        query_words = re.findall(r'\b\w+\b', q)
        
        # Compile a time-of-day greeting prefix
        if now.hour < 12:
            greeting_pref = "Good morning"
        elif now.hour < 17:
            greeting_pref = "Good afternoon"
        else:
            greeting_pref = "Good evening"
            
        name_part = f" {user_name}" if user_name else ""
        
        # Exact greeting match
        if any(w in greeting_words for w in query_words) and len(query_words) < 5:
            return f"Hi! I am the TEAMEnvironment AI BOT{name_part}. Ask me any questions about our mission, projects, volunteering, or MoU with KFS, and I will find the answers for you!"
            
        if "how are you" in q:
            if user_name:
                return f"I am doing great, thank you for asking, {user_name}! How are you doing? How can I help you today?"
            else:
                return "I am doing great, thank you for asking! How are you doing? How can I assist you today?"
                
        if "joke" in q:
            return random.choice(self.jokes)
            
        if any(word in q for word in ["thank", "thanks"]):
            name_part = f", {user_name}" if user_name else ""
            return f"You're welcome{name_part}! Let's keep working together for a cleaner, greener future. Let me know if you have more questions."

        # 5. Check if they ask "who am i" or "do you know me"
        if any(w in q for w in ["who am i", "do you know me", "what is my name", "my name"]):
            if user_name:
                return f"You are <b>{user_name}</b>! That's what you told me."
            else:
                return "I don't know your name yet! You can tell me your name (e.g., 'My name is Jane') or provide your email so I can search my database for you."

        # 6. Hardcoded TEK Facts
        if any(word in q for word in ["who are you", "what are you", "about team", "about tek", "about teamenvironment"]):
            return (
                f"I am the <b>TEAMEnvironment AI BOT</b>{name_part}, your virtual guide to our mission. "
                "TEAMEnvironment KENYA is a Socio-economic, Environmental and Humanitarian Membership Association dedicated to Greening, "
                "climate resilience, and environmental conservation in Kenya. Our philosophy is to build a heritage of a cleaner, greener, "
                "food and water secure, and peaceful environment."
            )
            
        if any(word in q for word in ["contact", "phone", "email", "reach", "call"]):
            return (
                "You can reach our team at <b>+254 718 052745</b> or via email at "
                "<a href='mailto:teamenvironment.ke@gmail.com'>teamenvironment.ke@gmail.com</a>. "
                "You can also use our <a href='/contact'>Contact Form</a>."
            )
            
        if any(word in q for word in ["location", "office", "where are you", "headquarters"]):
            return (
                "TEAMEnvironment KENYA is based in <b>Nairobi, Kenya</b>. "
                "Our core active restoration and greening projects are hosted in the <b>Ngong Hills Ecosystem</b>, "
                "Nyeri watersheds, Nakuru, and other regions across Kenya and Africa."
            )
            
        if any(word in q for word in ["donate", "payment", "support", "m-pesa", "mpesa", "paypal", "pay", "gift"]):
            return (
                "You can support our tree-planting efforts by clicking the "
                "<a href='#' onclick='openModal(); return false;'>Donate Now</a> or "
                "<a href='/gift-a-tree'>Gift a Tree</a> links directly!<br><br>"
                "We accept M-Pesa (via STK push), PesaPal, and PayPal. Every KES 500 plants and cares for a tree.<br><br>"
                "Alternatively, you can trigger a direct M-Pesa STK Push here! "
                "Just reply with the amount and phone number in this format:<br>"
                "<b>donate [amount] to [phone]</b> (e.g. <i>donate 1000 to 0712345678</i>) or "
                "<b>gift [number of trees] trees to [phone]</b> (e.g. <i>gift 5 trees to 0712345678</i>)."
            )
            
        if any(word in q for word in ["volunteer", "join", "involved", "membership", "activities"]):
            return (
                "We would love to have you join our Green Army! You can check upcoming events and book a slot "
                "on our <a href='/activities'>Volunteer / Activities</a> page. "
                "We also offer an <a href='/work'>Ambassadors Program</a> and a <a href='/work'>Careers/Internships</a> portal."
            )
            
        if any(word in q for word in ["services", "what do you do", "offerings", "eia", "consultancy"]):
            return (
                "We offer a wide range of services including:<br>"
                "<ul>"
                "  <li><b>Tree Planting & Reforestation:</b> Forest adoption and corporate greening.</li>"
                "  <li><b>Environmental Impact Assessments (EIA):</b> Professional NEMA-compliant audits.</li>"
                "  <li><b>Climate Consultancy:</b> Carbon offset strategy and sustainability reporting.</li>"
                "  <li><b>Seedlings Supply:</b> Propagation of high-quality indigenous and fruit trees.</li>"
                "  <li><b>Landscape Design:</b> Beautification of school, community, and corporate zones.</li>"
                "</ul>"
                "Learn more on our <a href='/services'>Services page</a>."
            )
            
        if any(word in q for word in ["calculator", "carbon", "footprint"]):
            return (
                "You can compute your household, travel, and lifestyle carbon footprint using our custom "
                "<a href='/calculator'>Carbon Footprint Calculator</a>, which also recommends how many trees to plant to offset it."
            )

        if any(word in q for word in ["mou", "agreement", "kfs", "forest service", "ngong"]):
            return (
                "TEAMEnvironment KENYA has a direct MOU (Memorandum of Understanding) with the <b>Kenya Forest Service (KFS)</b> "
                "for the adoption of degraded plots in the <b>Ngong Hills Ecosystem</b> for rehabilitation, restoration, and periodic survival rate auditing."
            )

        # 7. Brain (Document & Template Search)
        match, url, source, score = self.brain.find_best_match(q)
        
        # Link suffix formatting
        link_str = ""
        if url:
            if url.startswith('/static/documents/'):
                link_str = f"<br><br>📄 Document source: <a href='{url}' target='_blank'>{source}</a>"
            elif url.startswith('/country/'):
                link_str = f"<br><br>🌍 Learn more on our <a href='{url}'>{source}</a> page."
            else:
                link_str = f"<br><br>🔗 For more details, see <a href='{url}'>{source}</a>."

        if match and score > 0.25:
            return f"Here is what I found regarding your inquiry:<br><br><i>\"{match}\"</i>{link_str}"
        elif match and score > 0.12:
            return f"I found some related information in our documents:<br><br><i>\"{match}\"</i>{link_str}"
        else:
            return (
                f"I couldn't find a specific answer to that in our documents{name_part}. "
                "Feel free to email us at <a href='mailto:teamenvironment.ke@gmail.com'>teamenvironment.ke@gmail.com</a> "
                "or call <b>+254 718 052745</b> and one of our human team members will assist you!"
            )
