from bson.objectid import ObjectId
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from models import Analysis

history_bp = Blueprint("history", __name__, url_prefix="/api/history")


@history_bp.route("", methods=["GET"])
@login_required
def get_history():
    """Get all analyses for the current user"""
    try:
        user_id = (
            current_user.get("_id")
            if isinstance(current_user, dict)
            else str(current_user.get_id())
        )
        analyses = Analysis.find_by_user(user_id)
        return jsonify({"analyses": [Analysis.to_dict(a) for a in analyses]}), 200
    except Exception as e:
        return jsonify({"message": f"Failed to retrieve history: {str(e)}"}), 500


@history_bp.route("", methods=["POST"])
@login_required
def save_analysis():
    """Save a new analysis"""
    try:
        data = request.get_json()

        user_id = (
            current_user.get("_id")
            if isinstance(current_user, dict)
            else str(current_user.get_id())
        )

        print("DATA RECEIVED:")
        print(data)
        print(type(data))

        input_text = data.get("input_text", "")
        if not isinstance(input_text, str):
            input_text = str(input_text)

        processed_text = data.get("processed_text", "")
        if not isinstance(processed_text, str):
            processed_text = str(processed_text)

        entities = data.get("entities", [])
        tokens = data.get("tokens", [])

        if not input_text:
            return jsonify({"message": "input_text is required"}), 400

        analysis = Analysis.create(
            user_id=user_id,
            input_text=input_text,
            processed_text=processed_text,
            entities=entities,
            tokens=tokens,
        )

        return (
            jsonify(
                {
                    "analysis": Analysis.to_dict(analysis),
                    "message": "Analysis saved successfully",
                }
            ),
            201,
        )
    except Exception as e:
      print("SAVE ANALYSIS ERROR:", e)
      import traceback
      traceback.print_exc()

      return jsonify(
     {"message": f"Failed to save analysis: {str(e)}"}
      ), 500


@history_bp.route("/<analysis_id>", methods=["DELETE"])
@login_required
def delete_analysis(analysis_id):
    """Delete a specific analysis"""
    try:
        user_id = (
            current_user.get("_id")
            if isinstance(current_user, dict)
            else str(current_user.get_id())
        )

        # Check ownership
        analysis = Analysis.find_by_id(analysis_id)
        if not analysis:
            return jsonify({"message": "Analysis not found"}), 404

        # Convert both to strings for comparison
        analysis_user_id = str(analysis["user_id"])
        current_user_id = str(user_id)

        if analysis_user_id != current_user_id:
            return jsonify({"message": "Unauthorized"}), 403

        Analysis.delete(analysis_id)
        return jsonify({"message": "Analysis deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Failed to delete analysis: {str(e)}"}), 500


@history_bp.route("/clear", methods=["POST"])
@login_required
def clear_history():
    """Clear all analyses for the current user"""
    try:
        user_id = (
            current_user.get("_id")
            if isinstance(current_user, dict)
            else str(current_user.get_id())
        )
        deleted_count = Analysis.delete_all_by_user(user_id)
        return (
            jsonify(
                {
                    "message": f"Cleared {deleted_count} analyses from your history",
                    "deleted_count": deleted_count,
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"message": f"Failed to clear history: {str(e)}"}), 500
