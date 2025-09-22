#!/bin/bash
set -e

# Force Python 3.12 if available
export PYTHON_VERSION=3.12

# Install specific compatible versions first
python -m pip install --upgrade pip
python -m pip install setuptools==75.1.0 wheel==0.44.0

# Install requirements without building wheels that cause issues
python -m pip install --no-build-isolation -r requirements.txt

# Install the local package in editable mode
python -m pip install -e ..
