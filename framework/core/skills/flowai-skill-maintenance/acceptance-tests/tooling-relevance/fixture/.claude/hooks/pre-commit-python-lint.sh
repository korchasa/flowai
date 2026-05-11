#!/bin/bash
# Pre-commit hook: run flake8 and black on Python files
flake8 . --max-line-length=120
black --check .
