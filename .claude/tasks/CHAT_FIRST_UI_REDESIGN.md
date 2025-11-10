# Chat-First UI Redesign - Modernbanc Style

## Overview
Transform Valta into a chat-first AI CFO interface where users can ask questions and get answers with auto-generated workbooks showing the calculations.

## User Flow

### 1. Landing Page (Default View)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Left Sidebar]        [Center - Chat Interface]         [Right Panel]       │
│                                                                              │
│ • Documents           What can I help with?              • Upload New Doc   │
│   - doc1.csv          Your AI CFO to answer any          • Recent Analyses  │
│   - doc2.xlsx         question based on connected          - Startup Metrics│
│                       data about your startup               - Revenue Q1    │
│ • Chat History                                              - Burn Analysis │
│   - Revenue Q1        [What is my revenue?]                                 │
│   - Burn Analysis     [How much did we spend...]                            │
│                       [Can we afford another hire?]                         │
│ • Startup Analysis                                                          │
│                       ┌─────────────────────────────┐                       │
│ [Settings ⚙️]         │ Ask me anything...          │                       │
│                       └─────────────────────────────┘                       │
│                       [Ask →]                                               │
│                                                                              │
│                       Recents                                               │
│                       • Startup Metrics Analysis                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. After User Asks Question
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Left Sidebar]        [Center - Workbook]               [Right Panel]       │
│                                                                              │
│ • Documents           Revenue Summary 2025               💬 Chat            │
│   - doc1.csv                                                                │
│   - doc2.xlsx         ┌──────────────────────────────┐   User: What is my  │
│                       │ A          │ B               │   revenue?          │
│ • Chat History        │ Revenue Category │ Amount    │                     │
│   ▶ Revenue Q1        │ Operating Revenue│ $56,523   │   AI: I've created  │
│   - Burn Analysis     │ Interest Revenue │ $50,000   │   a revenue summary │
│                       │ Product Sales    │ $16,523   │   showing all...    │
│ • Startup Analysis    │ TOTAL           │ $123,046   │                     │
│                       └──────────────────────────────┘   [New chat +]      │
│ [Settings ⚙️]                                                               │
│                       [Export] [Copy]                    📝 History         │
│                                                          • Created sheet    │
│                       Ask follow-up...                   • Edited B2-B5     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Frontend Components

#### 1. ChatLanding.tsx (NEW)
```typescript
// Center area for landing page
- Hero heading
- Subtitle about AI CFO
- Suggested question pills
- Chat input box
- Recents section with links
```

#### 2. WorkbookView.tsx (NEW)
```typescript
// Center area after question is asked
- Spreadsheet-like table
- Auto-populated data from AI response
- Formulas visible in cells
- Export/Copy buttons
- Title based on question context
```

#### 3. ChatPanel.tsx (REFACTOR from ChatInterface)
```typescript
// Right panel chat interface
- Message history
- User/AI messages
- New chat button
- Input at bottom
- Auto-scroll
```

#### 4. AISettings.tsx (NEW)
```typescript
// Settings modal/panel
interface AISettings {
  systemPrompt: string
  companyContext: string
  model: 'claude-4' | 'gpt-4' | 'claude-sonnet'
  temperature: number
  customInstructions: string
}
```

#### 5. Sidebar.tsx (UPDATE)
```typescript
// Add sections:
- Chat History (collapsible, shows past conversations)
- Settings cog at bottom
- Keep Documents list
- Add "Startup Analysis" button
```

#### 6. RightPanel.tsx (UPDATE)
```typescript
// Landing page version:
- Upload New Document section
- Recent Analyses list with links
- Quick actions

// Chat mode version:
- ChatPanel component
- Edit history
```

### Backend Endpoints

#### 1. POST /api/chat/ask
```python
# New chat endpoint
Request:
{
  "question": "What is my revenue?",
  "document_ids": [1, 2],  # Optional, if empty search all
  "conversation_id": "uuid"  # Optional, for follow-ups
}

Response:
{
  "answer": "Your total revenue is $123,046...",
  "workbook": {
    "title": "Revenue Summary 2025",
    "sheets": [{
      "name": "Revenue Breakdown",
      "columns": ["Revenue Category", "Amount 2025"],
      "rows": [
        ["Operating Revenue", 56523.25],
        ["Interest Revenue", 50000.00],
        ...
      ],
      "formulas": {
        "B10": "=SUM(B2:B9)"
      }
    }]
  },
  "sources": [
    {"document_id": 1, "filename": "PnL_2025.csv"}
  ],
  "conversation_id": "uuid"
}
```

#### 2. GET /api/chat/history
```python
# Get chat history for sidebar
Response:
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Revenue Q1",  # Auto-generated from first question
      "created_at": "2025-01-15T10:30:00Z",
      "last_message": "Your total revenue is...",
      "workbook_id": 123
    }
  ]
}
```

#### 3. POST /api/settings/ai
```python
# Save AI settings
Request:
{
  "system_prompt": "You are a CFO...",
  "company_context": "Valta is a Series A SaaS startup...",
  "model": "claude-4",
  "temperature": 0.7,
  "custom_instructions": "Always show formulas..."
}
```

#### 4. POST /api/chat/detect-documents
```python
# Smart document detection
Request:
{
  "question": "What is my revenue?",
  "available_documents": [
    {"id": 1, "filename": "PnL_Q1.csv", "type": "profit_loss"},
    {"id": 2, "filename": "PnL_Q2.csv", "type": "profit_loss"}
  ]
}

Response:
{
  "needs_clarification": true,
  "message": "I found 2 P&L documents. Which one would you like me to use?",
  "options": [
    {"id": 1, "label": "Q1 2025 (Jan-Mar)"},
    {"id": 2, "label": "Q2 2025 (Apr-Jun)"}
  ]
}
# OR
{
  "needs_clarification": false,
  "selected_documents": [1, 2],
  "reasoning": "Using both Q1 and Q2 for full analysis"
}
```

### AI Prompt Engineering

#### System Prompt Template
```
You are Valta, an AI CFO assistant for startups. Your role is to:

1. Analyze financial documents (P&L, Balance Sheet, Trial Balance)
2. Answer questions with clear, actionable insights
3. Generate workbooks showing your calculations
4. Speak in plain English, not accounting jargon
5. Focus on metrics that matter to startups: burn rate, runway, growth

Company Context:
{company_context}

When answering questions:
- Always show your work in a spreadsheet format
- Use simple tables with formulas visible
- Cite which document(s) you used
- If multiple similar documents exist, ask for clarification
- Provide context (e.g., "This is concerning because..." or "This is healthy for your stage")

Custom Instructions:
{custom_instructions}
```

#### Workbook Generation Prompt
```
Based on the question "{question}" and the data from {document_names}, create a clean spreadsheet summary.

Format requirements:
1. Use simple tables with 2-3 columns max
2. Show formulas for calculated rows (e.g., "=SUM(B2:B9)")
3. Include totals and subtotals where relevant
4. Use clear category names
5. Format numbers as currency where applicable

Return JSON format:
{
  "title": "Revenue Summary 2025",
  "sheets": [...]
}
```

## Database Schema Updates

### New Tables

#### 1. conversations
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    title VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    user_id INTEGER,  -- Future: multi-user support
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 2. messages
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    workbook_data JSON,  -- Store generated workbook
    sources JSON,  -- Which documents were used
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```

#### 3. ai_settings
```sql
CREATE TABLE ai_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,  -- Future: per-user settings
    system_prompt TEXT,
    company_context TEXT,
    model VARCHAR(50) DEFAULT 'claude-4',
    temperature FLOAT DEFAULT 0.7,
    custom_instructions TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## File Structure

```
valta/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── chat.py                    (NEW)
│   │   │   └── ai_settings.py             (NEW)
│   │   ├── services/
│   │   │   ├── chat_service.py            (NEW)
│   │   │   ├── workbook_generator.py      (NEW)
│   │   │   └── document_detector.py       (NEW)
│   │   └── models/
│   │       ├── conversation.py            (NEW)
│   │       ├── message.py                 (NEW)
│   │       └── ai_settings.py             (NEW)
│   └── prompts/
│       ├── system_prompt.txt              (NEW)
│       └── workbook_generation.txt        (NEW)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatLanding.tsx            (NEW)
│       │   ├── WorkbookView.tsx           (NEW)
│       │   ├── ChatPanel.tsx              (NEW - refactor ChatInterface)
│       │   ├── AISettings.tsx             (NEW)
│       │   ├── SuggestedQuestions.tsx     (NEW)
│       │   └── layout/
│       │       ├── Sidebar.tsx            (UPDATE)
│       │       └── RightPanel.tsx         (UPDATE)
│       ├── lib/
│       │   └── api.ts                     (UPDATE - add chat endpoints)
│       └── app/
│           └── page.tsx                   (UPDATE - new default layout)
```

## Implementation Phases

### Phase 1: Backend Foundation (Day 1)
- [ ] Create database models (conversations, messages, ai_settings)
- [ ] Build chat router with /ask endpoint
- [ ] Implement basic workbook generation logic
- [ ] Create AI settings CRUD endpoints

### Phase 2: Frontend Layout (Day 2)
- [ ] Create ChatLanding component
- [ ] Build WorkbookView component
- [ ] Refactor ChatInterface → ChatPanel
- [ ] Update Sidebar with chat history
- [ ] Update page.tsx with new default layout

### Phase 3: AI Integration (Day 3)
- [ ] Implement document detection logic
- [ ] Build workbook auto-generation with Claude/GPT
- [ ] Add multi-document query support
- [ ] Implement conversation persistence

### Phase 4: Settings & Polish (Day 4)
- [ ] Create AISettings component
- [ ] Add settings cog to sidebar
- [ ] Implement settings save/load
- [ ] Add export/copy functionality to workbooks

### Phase 5: Testing & Refinement (Day 5)
- [ ] Test full user flow
- [ ] Handle edge cases (no docs, multiple PnLs)
- [ ] Polish animations and transitions
- [ ] Performance optimization

## Success Criteria

1. ✅ User can ask "What is my revenue?" and get instant answer + workbook
2. ✅ Workbook shows clear calculations and is exportable
3. ✅ Chat history saved in sidebar for easy access
4. ✅ Multi-document queries work (searches all docs if none selected)
5. ✅ If 2+ similar docs exist, asks user for clarification
6. ✅ Settings accessible and functional (model, prompt, temp)
7. ✅ Clean, professional Modernbanc-inspired UI
8. ✅ Clicking "Startup Analysis" opens chat with all docs in context

## Open Questions

1. **Export formats**: Excel, CSV, PDF, or all three?
2. **Real-time collaboration**: Should workbooks be editable by users?
3. **Conversation sharing**: Should users be able to share chat/workbook links?
4. **API rate limiting**: How many questions per minute?
