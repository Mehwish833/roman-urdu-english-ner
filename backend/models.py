import os
from datetime import datetime

from flask_login import UserMixin
from pymongo import MongoClient
from pymongo.collection import Collection
from werkzeug.security import check_password_hash, generate_password_hash

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/cognitag")
client = MongoClient(MONGODB_URL)
db = client.cognitag

# Collections
users_collection: Collection = db.users
analyses_collection: Collection = db.analyses
feedback_collection: Collection = db.feedback

# Create indexes
users_collection.create_index("email", unique=True)
analyses_collection.create_index("user_id")
feedback_collection.create_index("user_id")

class LoginUser(UserMixin):
    def __init__(self, user_doc):
        self.user_doc = user_doc
        self.id = str(user_doc["_id"])

    def get_id(self):
        return self.id

    @property
    def name(self):
        return self.user_doc.get("name")

    @property
    def email(self):
        return self.user_doc.get("email")

    @property
    def role(self):
        return self.user_doc.get("role")

class User:
    """User document model"""

    @staticmethod
    def create(name, email, password, role="Research User"):
        """Create a new user"""
        user_data = {
            "name": name,
            "email": email.lower(),
            "password_hash": generate_password_hash(password),
            "role": role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        result = users_collection.insert_one(user_data)
        return User.find_by_id(result.inserted_id)

    @staticmethod
    def find_by_email(email):
        """Find user by email"""
        return users_collection.find_one({"email": email.lower()})

    @staticmethod
    def find_by_id(user_id):
        """Find user by ID"""
        from bson.objectid import ObjectId

        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        return users_collection.find_one({"_id": user_id})

    @staticmethod
    def check_password(user, password):
        """Verify password"""
        return check_password_hash(user["password_hash"], password)

    @staticmethod
    def to_dict(user):
        """Convert user to dictionary"""
        return {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "created_at": user["created_at"].isoformat()
            if isinstance(user["created_at"], datetime)
            else user["created_at"],
        }


class Analysis:
    """Analysis document model"""

    @staticmethod
    def create(user_id, input_text, processed_text, entities, tokens):
        """Create a new analysis"""
        from bson.objectid import ObjectId

        if isinstance(user_id, str):
            user_id = ObjectId(user_id)

        analysis_data = {
            "user_id": user_id,
            "input_text": input_text,
            "processed_text": processed_text,
            "entities": entities,
            "tokens": tokens,
            "created_at": datetime.utcnow(),
        }
        result = analyses_collection.insert_one(analysis_data)
        return Analysis.find_by_id(result.inserted_id)

    @staticmethod
    def find_by_id(analysis_id):
        """Find analysis by ID"""
        from bson.objectid import ObjectId

        if isinstance(analysis_id, str):
            analysis_id = ObjectId(analysis_id)
        return analyses_collection.find_one({"_id": analysis_id})

    @staticmethod
    def find_by_user(user_id):
        """Find all analyses for a user"""
        from bson.objectid import ObjectId

        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        return list(
            analyses_collection.find({"user_id": user_id}).sort("created_at", -1)
        )

    @staticmethod
    def delete(analysis_id):
        """Delete an analysis"""
        from bson.objectid import ObjectId

        if isinstance(analysis_id, str):
            analysis_id = ObjectId(analysis_id)
        result = analyses_collection.delete_one({"_id": analysis_id})
        return result.deleted_count > 0

    @staticmethod
    def delete_all_by_user(user_id):
        """Delete all analyses for a user"""
        from bson.objectid import ObjectId

        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        result = analyses_collection.delete_many({"user_id": user_id})
        return result.deleted_count

    @staticmethod
    def to_dict(analysis):
        """Convert analysis to dictionary"""
        return {
            "id": str(analysis["_id"]),
            "input_text": analysis["input_text"],
            "processed_text": analysis["processed_text"],
            "entities": analysis["entities"],
            "tokens": analysis["tokens"],
            "created_at": analysis["created_at"].isoformat()
            if isinstance(analysis["created_at"], datetime)
            else analysis["created_at"],
        }


class Feedback:
    """Feedback document model"""

    @staticmethod
    def create(name, email, organization, message, user_id=None):
        """Create a new feedback"""
        from bson.objectid import ObjectId

        feedback_data = {
            "user_id": ObjectId(user_id)
            if user_id and isinstance(user_id, str)
            else user_id,
            "name": name,
            "email": email,
            "organization": organization,
            "message": message,
            "created_at": datetime.utcnow(),
        }
        result = feedback_collection.insert_one(feedback_data)
        return Feedback.find_by_id(result.inserted_id)

    @staticmethod
    def find_by_id(feedback_id):
        """Find feedback by ID"""
        from bson.objectid import ObjectId

        if isinstance(feedback_id, str):
            feedback_id = ObjectId(feedback_id)
        return feedback_collection.find_one({"_id": feedback_id})

    @staticmethod
    def to_dict(feedback):
        """Convert feedback to dictionary"""
        return {
            "id": str(feedback["_id"]),
            "name": feedback.get("name"),
            "email": feedback.get("email"),
            "organization": feedback.get("organization"),
            "message": feedback["message"],
            "created_at": feedback["created_at"].isoformat()
            if isinstance(feedback["created_at"], datetime)
            else feedback["created_at"],
        }
