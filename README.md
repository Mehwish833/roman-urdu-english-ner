# CogniTag NER Project

This project connects the static frontend in `frontend` with the trained Hugging Face NER model stored in `backend`.

## What was added

- `backend/app.py` - Flask API that loads the local XLM-RoBERTa token classification model and serves predictions.
- `backend/requirements.txt` - Python packages required by the backend.
- `backend/run_backend.bat` - Windows helper script to create a virtual environment, install dependencies, and run Flask.
- Updated `frontend/js/config.js` - points the frontend to `http://127.0.0.1:5000`.
- Updated `frontend/js/api.js` - calls `/health` and `/analyze` and preserves backend error messages.
- Updated `frontend/js/analyzer.js` - renders entity spans using backend character offsets for more accurate highlighting.

## Run the backend

Option 1: Double-click this file:

`backend/run_backend.bat`

Option 2: Run manually from the backend folder:

1. `python -m venv .venv`
2. `.venv\Scripts\activate`
3. `pip install -r requirements.txt`
4. `python app.py`

The backend will run at:

`http://127.0.0.1:5000`

## Open the frontend

Open this file in your browser:

`frontend/pages/analyzer.html`

Type text and click **Run Extraction**. The frontend will send the text to Flask, Flask will load the model from `backend`, preprocess the text using the same inference style from your Colab notebook, run NER, and return entities to the frontend.

## API endpoints

### Health check

`GET /health`

Returns model loading status.

### Analyze text

`POST /analyze`

Request body:

`{"text": "Ali Islamabad ja raha hai"}`

Response includes:

- `processed_text`
- `entities`
- `tokens`
- `model`

## Important accuracy note

The backend now follows your Colab `predict_sentence()` inference style: lowercase the sentence, split by whitespace, tokenize with `is_split_into_words=True`, and keep the first subtoken prediction for each word. It also performs small safety cleanup first: unicode normalization, invisible-control-character removal, and whitespace cleanup.
