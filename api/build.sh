#!/bin/bash
set -e

# Install packages individually to avoid build issues
python -m pip install --upgrade pip

# Install core packages first
python -m pip install fastapi==0.104.1
python -m pip install uvicorn==0.24.0
python -m pip install python-multipart==0.0.6
python -m pip install PyPDF2==3.0.1
python -m pip install pdfplumber==0.10.3
python -m pip install openai==1.3.0
python -m pip install numpy==1.24.3
python -m pip install scikit-learn==1.3.0
python -m pip install python-dotenv==1.0.0

# Install the local package in editable mode
python -m pip install -e ..
