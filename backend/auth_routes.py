from bson.objectid import ObjectId
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_user, logout_user
from models import User, LoginUser

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user"""
    data = request.get_json()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    role = data.get("role", "Research User")

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password required"}), 400

    # Check if user already exists
    existing_user = User.find_by_email(email)
    if existing_user:
        return jsonify({"message": "Email already registered"}), 400

    try:
        user = User.create(name, email, password, role)
        # Set user ID for Flask-Login
        user["_id"] = (
            str(user["_id"]) if isinstance(user["_id"], ObjectId) else user["_id"]
        )
        login_user(LoginUser(user))
        return (
            jsonify(
                {
                    "user": User.to_dict(user),
                    "message": "Registration successful",
                }
            ),
            201,
        )
    except Exception as e:
        return jsonify({"message": f"Registration failed: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login a user"""
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    user = User.find_by_email(email)
    if not user or not User.check_password(user, password):
        return jsonify({"message": "Invalid email or password"}), 401

    try:
        # Set user ID for Flask-Login
        user["_id"] = (
            str(user["_id"]) if isinstance(user["_id"], ObjectId) else user["_id"]
        )
        login_user(LoginUser(user))
        return jsonify({"user": User.to_dict(user), "message": "Login successful"}), 200
    except Exception as e:
        return jsonify({"message": f"Login failed: {str(e)}"}), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Logout the current user"""
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    """Get the currently logged-in user's info"""
    if not current_user.is_authenticated:
        return jsonify({"user": None}), 200

    # Get fresh user data from database
    user_id = current_user.get_id()
    user = User.find_by_id(user_id)

    if user:
        return jsonify({"user": User.to_dict(user)}), 200
    return jsonify({"user": None}), 200
