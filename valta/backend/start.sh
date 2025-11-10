#!/bin/bash
# Railway startup script
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
