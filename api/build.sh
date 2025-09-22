#!/bin/bash
set -e

# Upgrade pip and install build tools
python -m pip install --upgrade pip setuptools wheel

# Install requirements
python -m pip install -r requirements.txt

# Install the local package in editable mode
python -m pip install -e ..
