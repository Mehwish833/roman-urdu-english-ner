import os
import re
import unicodedata
from pathlib import Path

import torch
from auth_routes import auth_bp
from dotenv import load_dotenv
from flask import Flask, jsonify, request

from flask_login import LoginManager, current_user
from history_routes import history_bp
from models import Analysis, User, LoginUser
from transformers import AutoModelForTokenClassification, AutoTokenizer
from flask_cors import CORS

app = Flask(__name__)

CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ]
)
print("=== CORS ENABLED ===")

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR
# Training used max_length=128 in tokenize_and_align_labels().
MAX_LENGTH = 128


# Flask configuration
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-key-change-in-production")

# Initialize Flask-Login for session management
login_manager = LoginManager()
login_manager.init_app(app)
@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({
        "message": "Authentication required"
    }), 401
# login_manager.login_view = "auth.login"


@login_manager.user_loader
def load_user(user_id):
    """Load user from MongoDB by ID"""
    user = User.find_by_id(user_id)

    if not user:
        return None

    return LoginUser(user)


# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(history_bp)

_tokenizer = None
_model = None
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def preprocess_text(text: str) -> str:
    """Match the Colab inference preprocessing.

    Your notebook's predict_sentence() does:
        sentence = sentence.lower()
        tokens = sentence.split()

    The backend keeps that behavior, with small safety cleanup before it:
    unicode normalization, invisible-control-character removal, lowercasing,
    and whitespace collapsing.
    """
    if text is None:
        return ""

    text = unicodedata.normalize("NFKC", str(text))
    text = "".join(
        char
        for char in text
        if unicodedata.category(char)[0] != "C" or char in {"\n", "\t", " "}
    )
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text


def load_model():
    """Lazy-load tokenizer and model once, then reuse for all requests."""
    global _tokenizer, _model

    if _tokenizer is None:
        _tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR), use_fast=True)

    if _model is None:
        _model = AutoModelForTokenClassification.from_pretrained(str(MODEL_DIR))
        _model.to(_device)
        _model.eval()

    return _tokenizer, _model


def _split_bio_label(label: str):
    if "-" not in label:
        return "B", label
    prefix, entity_group = label.split("-", 1)
    return prefix, entity_group


def get_word_spans(text: str):
    """Return words and offsets equivalent to sentence.split()."""
    return [
        {
            "word": match.group(0),
            "start": match.start(),
            "end": match.end(),
        }
        for match in re.finditer(r"\S+", text)
    ]


def split_text_segments(text: str, max_words_per_segment: int = 40):
    """Split long input into sentence-aware chunks.

    This keeps backend behavior close to Colab testing where many sentences were
    predicted one-by-one, while still supporting a single long input from UI.
    """
    if not text:
        return []

    sentence_matches = list(re.finditer(r"[^.!?؟۔\n]+[.!?؟۔\n]*", text))
    if not sentence_matches:
        sentence_matches = [re.match(r".*", text)]

    segments = []
    for match in sentence_matches:
        if match is None:
            continue

        sentence = match.group(0)
        sentence_start = match.start()
        if not sentence.strip():
            continue

        words = list(re.finditer(r"\S+", sentence))
        if not words:
            continue

        # Further split very long sentences to avoid truncation artifacts.
        for i in range(0, len(words), max_words_per_segment):
            group = words[i : i + max_words_per_segment]
            local_start = group[0].start()
            local_end = group[-1].end()
            segment_text = sentence[local_start:local_end]
            global_start = sentence_start + local_start
            segments.append(
                {
                    "text": segment_text,
                    "start": global_start,
                }
            )

    if not segments:
        return [{"text": text, "start": 0}]

    return segments


def decode_word_entities(text: str, word_predictions):
    """Merge first-subtoken word-level BIO predictions into entity spans."""
    entities = []
    current = None

    for item in word_predictions:
        label = item["entity"]
        if label == "O":
            if current:
                entities.append(current)
                current = None
            continue

        prefix, entity_group = _split_bio_label(label)
        should_start_new = (
            current is None
            or prefix == "B"
            or current["entity_group"] != entity_group
            or item["start"] > current["end"] + 1
        )

        if should_start_new:
            if current:
                entities.append(current)
            current = {
                "entity": f"B-{entity_group}",
                "entity_group": entity_group,
                "start": item["start"],
                "end": item["end"],
                "score_sum": item["score"],
                "token_count": 1,
            }
        else:
            current["end"] = item["end"]
            current["score_sum"] += item["score"]
            current["token_count"] += 1

    if current:
        entities.append(current)

    cleaned_entities = []
    for entity in entities:
        score = entity["score_sum"] / max(entity["token_count"], 1)
        cleaned_entities.append(
            {
                "word": text[entity["start"] : entity["end"]].strip(),
                "entity": entity["entity"],
                "entity_group": entity["entity_group"],
                "start": entity["start"],
                "end": entity["end"],
                "score": round(float(score), 4),
            }
        )

    return cleaned_entities


def predict_segment(segment_text: str, segment_start: int, tokenizer, model, id2label):
    word_spans = get_word_spans(segment_text)
    words = [item["word"] for item in word_spans]
    if not words:
        return []

    encoded = tokenizer(
        words,
        is_split_into_words=True,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=MAX_LENGTH,
    )
    word_ids = encoded.word_ids(batch_index=0)
    encoded = {key: value.to(_device) for key, value in encoded.items()}

    with torch.no_grad():
        outputs = model(**encoded)
        probabilities = torch.softmax(outputs.logits, dim=-1)[0]
        confidence_values, predictions = torch.max(probabilities, dim=-1)

    predictions = predictions.detach().cpu().tolist()
    confidence_values = confidence_values.detach().cpu().tolist()

    word_predictions = []
    previous_word_idx = None

    for token_idx, word_idx in enumerate(word_ids):
        if word_idx is None:
            continue

        if word_idx != previous_word_idx and word_idx < len(word_spans):
            label_id = int(predictions[token_idx])
            label = id2label[label_id]
            confidence = float(confidence_values[token_idx])
            span = word_spans[word_idx]
            word_predictions.append(
                {
                    "word": span["word"],
                    "entity": label,
                    "start": segment_start + span["start"],
                    "end": segment_start + span["end"],
                    "score": round(confidence, 4),
                }
            )

        previous_word_idx = word_idx

    return word_predictions


def predict_entities(raw_text: str):
    tokenizer, model = load_model()
    processed_text = preprocess_text(raw_text)

    if not processed_text:
        return {
            "text": raw_text or "",
            "processed_text": "",
            "entities": [],
            "tokens": [],
            "colab_style_output": [],
        }

    id2label = model.config.id2label
    if isinstance(next(iter(id2label.keys())), str):
        id2label = {int(key): value for key, value in id2label.items()}

    segments = split_text_segments(processed_text)
    word_predictions = []

    for segment in segments:
        segment_predictions = predict_segment(
            segment_text=segment["text"],
            segment_start=segment["start"],
            tokenizer=tokenizer,
            model=model,
            id2label=id2label,
        )
        word_predictions.extend(segment_predictions)

    word_predictions.sort(key=lambda item: item["start"])
    entities = decode_word_entities(processed_text, word_predictions)

    return {
        "text": raw_text,
        "processed_text": processed_text,
        "entities": entities,
        "tokens": word_predictions,
        "colab_style_output": [
            [item["word"], item["entity"]] for item in word_predictions
        ],
        "model": {
            "name": MODEL_DIR.name,
            "architecture": model.config.architectures[0]
            if model.config.architectures
            else "TokenClassification",
            "device": str(_device),
            "labels": model.config.id2label,
            "inference_style": "sentence/chunk-wise lowercase + split + is_split_into_words + first-subtoken labels",
            "max_length": MAX_LENGTH,
            "segments_processed": len(segments),
        },
    }


@app.route("/health")
def health():
    try:
        tokenizer, model = load_model()

        return jsonify({
            "status": "ok",
            "model_loaded": True,
            "model_type": model.config.model_type,
            "architecture": model.config.architectures[0]
            if model.config.architectures else None,
            "device": str(_device)
        })

    except Exception as exc:
        return jsonify({
            "status": "error",
            "model_loaded": False,
            "message": str(exc)
        }), 500


@app.post("/api/analyze")
def analyze():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")

    if not isinstance(text, str):
        return jsonify({"message": "Field 'text' must be a string."}), 400

    if len(text) > 5000:
        return jsonify(
            {"message": "Text is too long. Please send 5000 characters or fewer."}
        ), 400

    try:
        result = predict_entities(text)

        # Save to MongoDB if user is authenticated
        if current_user.is_authenticated:
            user_id = current_user.get_id()

            Analysis.create(
                user_id=user_id,
                input_text=text,
                processed_text=result["processed_text"],
                entities=result["entities"],
                tokens=result["tokens"],
            )

        return jsonify(result)

    except Exception as exc:
        return jsonify({"message": f"NER prediction failed: {exc}"}), 500
    
if __name__ == "__main__":
     load_model()
     app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False)