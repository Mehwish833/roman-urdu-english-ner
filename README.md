# CogniTag NER Project

CogniTag is a Machine Learning-based Named Entity Recognition (NER) system developed for Roman Urdu–English code-mixed text. The project utilizes a fine-tuned XLM-RoBERTa transformer model to identify and classify named entities such as Persons (PER), Locations (LOC), and Organizations (ORG) from informal code-mixed text commonly found on social media platforms and online communication.

The system combines Natural Language Processing (NLP), Deep Learning, and Web Technologies to provide an interactive interface for entity extraction and analysis.

---

# Project Overview

The primary focus of this project is the development and deployment of a transformer-based NER model capable of handling the linguistic challenges of Roman Urdu–English code-mixed text.

The system consists of:

* Machine Learning Model: Fine-tuned XLM-RoBERTa Token Classification Model
* Backend: Flask REST API
* Database: MongoDB
* Authentication: Flask-Login Session Management
* Frontend: HTML, CSS, JavaScript

---

# Machine Learning Component

The core of the project is a fine-tuned XLM-RoBERTa model trained for Named Entity Recognition.

## Model Architecture

* Base Model: XLM-RoBERTa
* Task: Token Classification
* Framework: Hugging Face Transformers
* Deep Learning Library: PyTorch
* Entity Classes:

  * PER (Person)
  * LOC (Location)
  * ORG (Organization)

## Training Pipeline

The model was trained using:

* CoNLL-style annotated dataset
* BIO tagging scheme
* Roman Urdu–English code-mixed text
* Hugging Face Trainer API
* Token-level classification approach

## Inference Pipeline

During prediction:

1. Input text is normalized.
2. Text is converted to lowercase.
3. Sentence is tokenized using XLM-RoBERTa tokenizer.
4. Tokens are aligned with original words.
5. Model predicts entity labels.
6. First-subtoken strategy is applied.
7. Entity spans are reconstructed and returned.

---

# Features

## Machine Learning Features

* Transformer-based NER model
* Roman Urdu–English code-mixed text support
* Entity extraction and classification
* Token-level predictions
* Confidence score generation
* Real-time inference

## Application Features

* User Registration
* User Login
* Session Management
* Analysis History
* User-specific Records
* Entity Highlighting
* JSON Export
* Backend Health Monitoring
* Responsive User Interface

---

# Project Structure

```text
CogniTag/
│
├── backend/
│   ├── app.py
│   ├── auth_routes.py
│   ├── history_routes.py
│   ├── feedback_routes.py
│   ├── models.py
│   ├── requirements.txt
│   └── trained_model/
│
├── frontend/
│   ├── pages/
│   ├── js/
│   ├── css/
│   └── assets/
│
└── README.md
```

---

# Technologies Used

## Machine Learning

* Python
* PyTorch
* Hugging Face Transformers
* XLM-RoBERTa
* NumPy
* Pandas

## Backend

* Flask
* Flask-CORS
* Flask-Login
* MongoDB
* PyMongo

## Frontend

* HTML5
* CSS3
* JavaScript (ES6)

---

# Run the Backend

## Option 1

Double-click:

```text
backend/run_backend.bat
```

## Option 2

Run manually:

```bash
python -m venv .venv
```

```bash
.venv\Scripts\activate
```

```bash
pip install -r requirements.txt
```

```bash
python app.py
```

Backend URL:

```text
http://127.0.0.1:5000
```

---

# Open the Frontend

Open:

```text
frontend/pages/analyzer.html
```

Enter Roman Urdu–English text and click:

```text
Run Extraction
```

The frontend sends the input to the Flask backend, which loads the trained XLM-RoBERTa model, performs Named Entity Recognition, and returns prediction results.

---

# API Endpoints

## Health Check

```http
GET /health
```

Returns model loading and server status.

---

## Analyze Text

```http
POST /api/analyze
```

Request:

```json
{
  "text": "Ali Islamabad ja raha hai"
}
```

Response:

```json
{
  "processed_text": "...",
  "entities": [...],
  "tokens": [...],
  "model": {...}
}
```

---

## Authentication APIs

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

---

## History APIs

```http
GET    /api/history
POST   /api/history
DELETE /api/history/<id>
POST   /api/history/clear
```

---

# Database

MongoDB is used to store:

* User Accounts
* Authentication Data
* Analysis History
* Feedback Records

Each authenticated user maintains a separate analysis history.

---

# Important Accuracy Note

The backend follows the same inference pipeline used during model development and evaluation.

The preprocessing steps include:

* Unicode normalization
* Invisible character removal
* Whitespace normalization
* Lowercasing
* Word-level tokenization
* XLM-RoBERTa subword tokenization

Predictions are generated using the first-subtoken strategy to maintain alignment between tokens and entity labels.

---

# Research Contribution

This project addresses the challenge of Named Entity Recognition in Roman Urdu–English code-mixed text, a low-resource and linguistically complex domain. By leveraging transformer-based multilingual language models, the system improves entity recognition performance on informal text containing transliteration variations, spelling inconsistencies, and language mixing.

The project demonstrates the practical deployment of a fine-tuned XLM-RoBERTa model within a complete web-based NLP application.
