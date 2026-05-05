import firebase_admin
from firebase_admin import credentials, storage, db
import os

# Initialize variables to be exported
bucket = None

def initialize_firebase():
    """Initializes Firebase Admin SDK and returns the storage bucket."""
    global bucket
    
    # Path to your service account key file
    cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'ServiceAccountKey.json')
    
    # Storage bucket name
    bucket_name = 'teamenvironmentkenya-6242e.firebasestorage.app'
    
    # Realtime Database URL
    database_url = os.environ.get('FIREBASE_DATABASE_URL')

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': bucket_name,
            'databaseURL': database_url
        })
        print("✅ Firebase initialized successfully with Storage and Database.")
    
    bucket = storage.bucket()
    return bucket

# Run initialization immediately when module is imported
initialize_firebase()
