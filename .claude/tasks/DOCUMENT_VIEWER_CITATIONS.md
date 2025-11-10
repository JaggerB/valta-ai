# Document Viewer with Citation Highlighting

## Goal
Enable users to click on citations in AI responses to view the original document with the cited content highlighted. For example, when the AI says "rent revenue is $2,426 located here", clicking should open the document and highlight that specific location.

## Research Findings

### Technical Approach
1. **Document Rendering**: Use PDF.js for PDF viewing, react-file-viewer or custom component for Excel/DOCX
2. **Citation Data**: Backend needs to return precise location data (page number, text snippet, coordinates)
3. **Highlighting**: Implement text search and highlight within the viewer
4. **Modal/Sidebar**: Display document viewer in modal or side panel

## Implementation Plan

### Phase 1: Backend - Enhanced Citation Data
**Tasks:**
1. Update AI analyzer to return precise citation locations
   - Page number for PDFs
   - Sheet name + cell reference for Excel
   - Section/paragraph for DOCX
   - Exact text snippet for matching

2. Modify document processing to store page/section metadata
   - Extract page boundaries during Docling processing
   - Store chunk metadata with precise locations

3. Update API response format for citations
   - Add `citation_location` object with: `{ type, page, text, coordinates }`

### Phase 2: Frontend - Document Viewer Component
**Tasks:**
1. Create `DocumentViewer` component
   - PDF viewer using react-pdf or @react-pdf-viewer/core
   - Excel viewer using SheetJS + custom renderer
   - DOCX viewer using mammoth.js

2. Implement citation highlighting
   - Text search and highlight functionality
   - Scroll to highlighted location
   - Visual indicator (yellow highlight, border, etc.)

3. Add modal/sidebar for document display
   - Responsive design
   - Close/minimize functionality
   - Document controls (zoom, pan, navigate)

### Phase 3: Integration
**Tasks:**
1. Update ChatInterface to handle citation clicks
   - Parse citations from AI responses
   - Make citations clickable
   - Pass location data to DocumentViewer

2. Add document retrieval endpoint
   - GET /api/documents/{id}/view to serve original files
   - Security: verify user has access to document

3. State management for viewer
   - Track open document + highlight location
   - Handle multiple citations in same document

## Technical Decisions

### Document Viewer Libraries
- **PDF**: react-pdf (proven, good performance)
- **Excel**: SheetJS + custom renderer (most flexible)
- **DOCX**: mammoth.js (converts to HTML, easy highlighting)

### Citation Format
```json
{
  "text": "The answer is $2,426",
  "citations": [
    {
      "document_id": "123",
      "document_name": "Financial_Report.pdf",
      "location": {
        "type": "pdf",
        "page": 5,
        "text": "Rent Revenue: $2,426",
        "bbox": [100, 200, 300, 220]  // optional: x1, y1, x2, y2
      }
    }
  ]
}
```

### UI/UX Flow
1. User sees AI response with inline citations (e.g., "[1]" or underlined text)
2. Click citation → Modal opens with document viewer
3. Document loads and auto-scrolls to citation location
4. Cited text is highlighted in yellow
5. User can browse document, close modal, or click other citations

## Dependencies to Install
- Frontend: `react-pdf`, `sheetjs`, `mammoth`, `react-modal`
- Backend: No new dependencies (use existing Docling data)

## Testing Strategy
- Test with PDFs (text-based and scanned)
- Test with Excel files (multiple sheets)
- Test with DOCX files (complex formatting)
- Verify citation accuracy across document types
- Mobile responsiveness testing

## Success Criteria
✅ Citations are clickable in AI responses
✅ Document viewer opens with correct document
✅ Cited text is highlighted and visible
✅ Supports PDF, Excel, and DOCX formats
✅ Mobile-friendly viewer experience

---

## Implementation Complete ✅

### Backend Changes

**1. AI Analyzer Updates** (`valta/backend/app/services/ai_analyzer.py`)
- Enhanced `financial_analysis_prompt` to request exact quoted text from documents
- Added `_find_exact_location()` method to locate quoted text in document content
- Updated `_extract_sources()` to parse quoted text and generate precise citation locations
- Citation format includes: `citation_text`, `location.type`, `location.page_number`, `location.sheet_name`, `location.row_number`, `location.char_position`

**2. Document Processing Updates** (`valta/backend/app/services/document_processor.py`)
- Added `_extract_text_with_pages()` method to preserve page boundaries in PDF text extraction
- Text now includes `[Page N]` markers for accurate page tracking
- Page metadata stored with start/end positions for each page
- Supports both PDF (via Docling) and Excel (existing structure)

**3. API Endpoints** (`valta/backend/app/routers/documents.py`)
- Added `GET /api/documents/{id}/file` endpoint to serve original files
- Returns files with correct MIME types for browser viewing
- FileResponse for efficient file streaming

### Frontend Changes

**1. DocumentViewer Component** (`valta/frontend/src/components/DocumentViewer.tsx`)
- Enhanced to support PDF, Excel, and text documents
- PDF rendering using `react-pdf` with page navigation
- Excel rendering using existing table-based viewer with sheet tabs
- Text highlighting using DOM TreeWalker for precise text matching
- Auto-scroll to highlighted citations
- Yellow highlight animation for cited text
- Modal overlay with close functionality

**2. ChatInterface Updates** (`valta/frontend/src/components/ChatInterface.tsx`)
- Added DocumentViewer integration
- Citations in sources are now clickable buttons
- `handleCitationClick()` opens DocumentViewer with citation data
- Displays citation preview text in source list
- Shows page/sheet information for each citation

**3. Configuration**
- PDF.js worker configured via `src/lib/pdf-config.ts`
- Next.js webpack config updated to handle PDF.js dependencies
- Installed packages: `react-pdf`, `pdfjs-dist`, `xlsx`, `mammoth`

### Key Features Implemented

1. **Clickable Citations**: Sources in AI responses are interactive buttons
2. **Smart Document Detection**: Automatically detects file type (PDF/Excel/DOCX) from filename
3. **Precise Highlighting**:
   - PDF: Navigates to correct page and displays citation info
   - Excel: Highlights specific cells/rows with yellow background
   - Text: Searches and highlights exact quoted text
4. **Smooth UX**: Modal overlay, scroll-to-highlight, loading states
5. **Backward Compatible**: Supports both new citation format and legacy location format

### Citation Flow

1. User asks: "What is the rent revenue for 2022?"
2. AI analyzes document and quotes: "Rent Revenue: $2,426"
3. Backend returns citation with:
   - `citation_text`: "Rent Revenue: $2,426"
   - `location`: { type: "excel", sheet_name: "Income", row_number: 45 }
4. Frontend displays source as clickable button
5. Click opens DocumentViewer → Loads sheet "Income" → Highlights row 45
6. User sees exact cell with rent revenue value

### Files Modified/Created

**Backend:**
- `valta/backend/app/services/ai_analyzer.py` (modified)
- `valta/backend/app/services/document_processor.py` (modified)
- `valta/backend/app/routers/documents.py` (modified)

**Frontend:**
- `valta/frontend/src/components/DocumentViewer.tsx` (modified)
- `valta/frontend/src/components/ChatInterface.tsx` (modified)
- `valta/frontend/src/lib/pdf-config.ts` (created)
- `valta/frontend/next.config.js` (modified)
- `valta/frontend/package.json` (dependencies added)

### Next Steps for Testing

1. Start backend: `cd valta/backend && python main.py`
2. Start frontend: `cd valta/frontend && npm run dev`
3. Upload a financial document (PDF or Excel)
4. Ask questions that reference specific values
5. Click on sources to view highlighted citations in original documents
