# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan & Review

### Before starting work
- Always in plan mode to make a plan
- After get the plan, make sure you write the plan to `.claude/tasks/TASK_NAME.md`
- The plan should be a detailed implementation plan and the reasoning behind them, as well as tasks broken down
- If the task requires external knowledge or a certain package, also research to get the latest knowledge (use Task tool for research)
- Don’t over plan it, always think MVP
- Once you write the plan, firstly ask me to review it. Do not continue until I approve the plan

### While implementing
- You should update the plan as you work
- After you complete tasks in the plan, you should update and append detailed descriptions of the changes you made, so following tasks can be easily handed over to other engineers

## Project Status

Valta AI Financial Assistant MVP has been implemented. Full-stack application with FastAPI backend and Next.js frontend for AI-powered financial document analysis.

## Development Commands

### Backend (FastAPI)
```bash
cd valta/backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys (OpenAI, Anthropic)
python main.py  # or python run.py
```

### Frontend (Next.js)
```bash
cd valta/frontend
npm install
cp .env.example .env.local
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
```

### Testing
```bash
# Backend tests
cd valta/backend && pytest

# Frontend tests
cd valta/frontend && npm test
```

## Architecture Overview

### Backend Architecture
- **FastAPI Application** (`main.py`) - ASGI server with CORS and routing
- **Database Layer** (`app/database.py`) - SQLAlchemy with SQLite/PostgreSQL support
- **Models** (`app/models/`) - Document, DocumentChunk, Query entities
- **Services** (`app/services/`) - Document processing (Docling) and AI analysis (GPT-4V + Claude)
- **Routers** (`app/routers/`) - REST API endpoints for documents, analysis, auth

### Frontend Architecture
- **Next.js 14** with TypeScript and App Router
- **Components** (`src/components/`) - DocumentUpload, DocumentList, ChatInterface, Header
- **API Client** (`src/lib/api.ts`) - Axios-based client with error handling
- **Styling** - Tailwind CSS with custom design system

### Key Integrations
- **Docling** - Document parsing (PDF/DOCX) with table/figure extraction
- **OpenAI GPT-4V** - Document understanding and fallback analysis
- **Anthropic Claude 4** - Primary financial analysis and insights
- **React Hot Toast** - User notifications
- **React Dropzone** - File upload interface

### Data Flow
1. Document Upload → Validation → File Storage → Database Record
2. Background Processing → Docling Parse → AI Extract → Chunk Creation → Status Update
3. User Query → Semantic Search → AI Analysis → Response with Citations

## Important Notes

- **API Keys Required**: OpenAI and Anthropic API keys must be configured in backend `.env`
- **File Storage**: Documents stored in `uploads/` directory (ensure write permissions)
- **Database**: SQLite for development, easily configurable for PostgreSQL production
- **CORS**: Frontend/backend communication enabled for localhost development
- **Error Handling**: Comprehensive error boundaries and user feedback throughout
- **Security**: File validation, size limits, and input sanitization implemented
- **Performance**: Async processing prevents blocking, chunked content for large documents