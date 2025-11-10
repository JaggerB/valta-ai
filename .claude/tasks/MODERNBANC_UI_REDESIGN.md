# Modernbanc-Inspired UI Redesign for Valta

## Overview
Transform Valta from a traditional dashboard interface to a spreadsheet-first, Modernbanc-inspired professional financial workspace.

## Design Analysis from Screenshots

### Layout Structure
1. **Left Sidebar (200px fixed)**
   - Workspace selector at top
   - "Ask AI" prominent button
   - Navigation tree: Workbooks, Inbox, Bank connections
   - Collapsible sections (Revenue, Expenses, Quick actions)
   - Pinned workbooks section

2. **Main Content Area (Spreadsheet)**
   - Excel-like grid with column headers (A, B, C, etc.)
   - Multiple sheets tabs at bottom (Sheet, Hiring Analysis)
   - Editable cells with formula support
   - Table-like sections with headers
   - Cell formatting toolbar (Bold, %, $, alignment)

3. **Right Sidebar (300px fixed)**
   - Top action buttons ("Calculate runway status")
   - Chat interface with "New chat" button
   - History panel showing edited cells
   - Collapsible AI insights

4. **Top Bar**
   - File menu (Runway analysis, File, Insert)
   - Sheet tabs
   - Formula/editing toolbar

### Color Palette
- Background: `#FAFAFA` (light gray)
- Sidebar: `#FFFFFF` (white)
- Borders: `#E5E7EB` (light gray)
- Primary Blue: `#3B82F6` (buttons, highlights)
- Text Primary: `#111827` (dark gray)
- Text Secondary: `#6B7280` (medium gray)
- Success: `#10B981` (green)
- Warning: `#F59E0B` (orange)
- Cell Selection: `#DBEAFE` (light blue)

### Typography
- Primary Font: `Inter` or `SF Pro` (system font)
- Monospace: `'Monaco', 'Menlo', 'Courier New'` for spreadsheet cells
- Sizes:
  - Headers: 14px-16px
  - Body: 13px
  - Small: 11px-12px

### Key Components to Build

#### 1. SpreadsheetGrid Component
```typescript
// Features:
- Virtual scrolling for large datasets
- Editable cells with inline editing
- Column/row headers
- Cell selection and keyboard navigation
- Formula bar integration
- Copy/paste support
- Cell formatting (currency, percentage, text)
```

#### 2. Sidebar Navigation
```typescript
// Features:
- Collapsible sections
- Workspace switcher
- Pinned items
- Search functionality
- "Ask AI" prominent button
```

#### 3. MetricsPanel (Right Sidebar)
```typescript
// Features:
- Editable metric inputs
- Live calculations
- Action buttons
- Formula explanations
- Copy to clipboard
```

#### 4. ChatInterface
```typescript
// Features:
- Message history
- New chat button
- Edit history
- Collapsible sections
```

## Implementation Plan

### Phase 1: Core Layout (Day 1)
- [ ] Create new layout with three-column structure
- [ ] Build Sidebar component with navigation tree
- [ ] Build TopBar component with tabs and toolbar
- [ ] Build RightPanel component skeleton
- [ ] Update color scheme and CSS variables

### Phase 2: Spreadsheet Component (Day 2-3)
- [ ] Install `@tanstack/react-table` for table management
- [ ] Build SpreadsheetGrid component
- [ ] Implement cell editing and navigation
- [ ] Add formula bar
- [ ] Add column/row headers
- [ ] Implement cell selection logic

### Phase 3: Data Integration (Day 4)
- [ ] Parse P&L documents into spreadsheet format
- [ ] Map financial data to rows/columns
- [ ] Add calculation formulas
- [ ] Implement auto-calculations
- [ ] Add editable metric inputs

### Phase 4: Polish & Interactions (Day 5)
- [ ] Add keyboard shortcuts
- [ ] Implement copy/paste
- [ ] Add cell formatting
- [ ] Add export to Excel
- [ ] Test responsive behavior

## Technical Stack

### New Dependencies
```json
{
  "@tanstack/react-table": "^8.11.0",  // Table state management
  "react-window": "^1.8.10",            // Virtual scrolling
  "react-spreadsheet": "^0.9.0",        // Alternative: pre-built spreadsheet
  "lucide-react": "^0.344.0"            // Icons
}
```

### File Structure
```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx              (NEW)
│   │   ├── TopBar.tsx               (NEW)
│   │   ├── RightPanel.tsx           (NEW)
│   │   └── MainLayout.tsx           (NEW)
│   ├── spreadsheet/
│   │   ├── SpreadsheetGrid.tsx      (NEW)
│   │   ├── Cell.tsx                 (NEW)
│   │   ├── FormulaBar.tsx           (NEW)
│   │   ├── SheetTabs.tsx            (NEW)
│   │   └── Toolbar.tsx              (NEW)
│   ├── navigation/
│   │   ├── WorkspaceSelector.tsx    (NEW)
│   │   ├── NavTree.tsx              (NEW)
│   │   └── NavItem.tsx              (NEW)
│   └── metrics/
│       ├── MetricsPanel.tsx         (REFACTOR from MetricsCard)
│       └── ChatInterface.tsx        (NEW)
├── styles/
│   ├── spreadsheet.css              (NEW)
│   └── modernbanc-theme.css         (NEW)
└── types/
    └── spreadsheet.ts               (NEW)
```

## Data Model for Spreadsheet

### P&L Data Structure
```typescript
interface SpreadsheetRow {
  id: string
  type: 'bank_account' | 'credit_card' | 'metric' | 'formula'
  cells: {
    [columnId: string]: CellValue
  }
}

interface CellValue {
  value: string | number
  formula?: string
  format?: 'currency' | 'percent' | 'number' | 'text'
  editable: boolean
}

interface Sheet {
  id: string
  name: string
  rows: SpreadsheetRow[]
  columns: Column[]
}
```

### Example P&L Sheet Layout
```
Column A: Account/Metric Name
Column B: Current Value
Column C: Previous Period
Column D: Change
Column E: Notes

Row 1: Headers
Row 2-5: Bank Accounts with balances
Row 6-8: Credit Cards with balances
Row 9: (blank)
Row 10-15: Metrics (Burn Rate, Runway, etc.) - some editable
Row 16: (blank)
Row 17-25: Expenses breakdown
```

## UI Improvements Over Current Design

### Before (Current Valta)
- Card-based dashboard layout
- Separate tabs for different views
- Limited data editing
- Static metric displays
- Basic chat interface

### After (Modernbanc-inspired)
- ✅ Spreadsheet-first with all data visible
- ✅ Inline editing for quick adjustments
- ✅ Formula transparency (users see calculations)
- ✅ Professional financial workspace feel
- ✅ Better for power users and analysts
- ✅ Export to Excel maintains familiarity
- ✅ Side-by-side chat and data
- ✅ Multi-sheet support for different analyses

## Success Metrics

1. **User can edit any metric** in the spreadsheet and see live recalculations
2. **Upload P&L → See full spreadsheet** in under 3 seconds
3. **Formula bar shows calculations** for transparency
4. **Export to Excel** maintains formatting
5. **Keyboard navigation** works (arrow keys, Enter, Tab)
6. **Visual polish** matches Modernbanc quality

## Competitive Advantages

### vs. Modernbanc
- ✅ **AI-first**: Commentary generation built-in
- ✅ **Startup-specific**: Pre-built burn/runway formulas
- ✅ **Faster setup**: Auto-parse P&L, no manual input
- ✅ **Free tier**: No $199/month pricing

### vs. Excel/Google Sheets
- ✅ **AI insights**: Auto-generated commentary
- ✅ **Pre-built templates**: Startup metrics out of the box
- ✅ **No formula writing**: Calculations automatic
- ✅ **Investor-ready**: Export formatted reports

## Next Steps

1. **Get approval** on this design direction
2. **Install dependencies** for spreadsheet components
3. **Build layout skeleton** (3-column structure)
4. **Create SpreadsheetGrid** MVP with sample data
5. **Iterate** based on user feedback

## Questions to Resolve

1. Do we want multi-sheet support in MVP? (Runway Analysis, Hiring Analysis, etc.)
2. Should we allow custom formulas or just pre-built calculations?
3. Do we need real-time collaboration (like Google Sheets)?
4. Should we build custom spreadsheet or use library like `react-spreadsheet`?
5. Do we want to support importing existing Excel files directly into the grid?
