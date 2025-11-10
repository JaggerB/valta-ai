# Valta - AI Finance Analyst for Startups

**Upload your P&L and get instant burn rate, runway analysis, and investor-ready commentary in 60 seconds.**

Valta is an AI-powered finance analyst built specifically for startup founders who need to understand their burn, runway, and financial metrics without hiring a CFO. Upload your P&L spreadsheet and get instant AI-generated insights formatted for investor updates, board decks, and internal dashboards.

## Why Valta?

Every founder struggles with:
- ❌ Understanding burn rate and runway without a finance background
- ❌ Spending hours writing monthly investor updates
- ❌ Explaining financial changes in plain English to investors
- ❌ Not having budget for a full-time CFO

**Valta solves this** by automatically:
- ✅ Calculating burn rate, runway, and growth metrics
- ✅ Identifying key expense drivers and trends
- ✅ Generating investor-ready financial commentary
- ✅ Creating copy-paste summaries for updates and board decks

## Key Features

### 🔥 Burn Rate & Runway Analysis
- Automatic calculation of gross and net burn
- Runway projections based on current cash
- Trend analysis (increasing/decreasing)
- Warning alerts for critical runway (<6 months)

### 📈 Growth Metrics
- Month-over-month revenue growth
- Compound monthly growth rate (CMGR)
- Growth trend analysis (accelerating/decelerating)
- Benchmarking against typical startup metrics

### 💰 Cash Efficiency
- Burn multiple calculation
- Revenue per dollar spent
- Efficiency ratings (excellent/good/average/poor)

### 🤖 AI-Generated Commentary
- Executive summary for investor updates
- Plain-English explanations of financial changes
- Investor-ready language and framing
- One-click copy to clipboard

### 📊 Expense Driver Analysis
- Top expense categories breakdown
- Fastest growing expenses
- Month-over-month changes
- Context on typical startup spending

### 📝 Export & Sharing
- Markdown format for emails
- Plain text for copy-paste
- JSON for API integrations
- (Coming soon: PDF for board decks)

## Technology Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **SQLAlchemy** - Database ORM (SQLite/PostgreSQL)
- **Anthropic Claude** - AI financial analysis and commentary generation
- **OpenAI GPT-4V** - Fallback AI analysis
- **Pandas** - Financial data processing

### Frontend
- **Next.js 14** - React framework with TypeScript
- **Tailwind CSS** - Modern, responsive UI
- **Axios** - API communication
- **React Hot Toast** - User notifications

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- OpenAI API Key (get from [OpenAI Platform](https://platform.openai.com))
- Anthropic API Key (get from [Anthropic Console](https://console.anthropic.com))

### Backend Setup

1. Navigate to the backend directory:
```bash
cd valta/backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys:
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
```

5. Run the backend server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd valta/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional):
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
```

The web application will be available at `http://localhost:3000`

## Usage

### 1. Upload Your P&L

Upload a CSV or Excel file containing your Profit & Loss statement. Works with exports from:
- QuickBooks
- Xero
- Excel/Google Sheets P&L templates
- Custom accounting systems

**Required format**: Rows for account names, columns for time periods (months)

### 2. View Startup Dashboard

Instantly see:
- **Net Burn Rate** - Average monthly cash burn
- **Runway** - Months of cash remaining
- **MoM Growth** - Revenue growth percentage
- **Top Expenses** - Largest spending categories
- **Burn Trend** - Whether burn is increasing/decreasing

### 3. Get AI Commentary

Click "Generate Commentary" to get investor-ready analysis:
- Executive summary (2-3 sentences)
- Burn rate explanation
- Growth analysis
- Runway status
- Expense breakdown
- Key takeaways (bullet points)

### 4. Copy for Investor Updates

One-click copy formatted output:
```markdown
# Financial Update - October 2024

## Executive Summary
We're burning $50k/month with 18 months of runway, giving us comfortable
breathing room before our next raise. Revenue grew 15% month-over-month,
showing strong product-market fit...

## Key Metrics
| Metric | Value |
|--------|-------|
| Net Burn Rate | $50,000/month |
| Revenue Growth (MoM) | 15.0% |
| Runway | 18.0 months |
```

## Project Structure

```
valta/
├── backend/
│   ├── app/
│   │   ├── models/              # Database models
│   │   ├── routers/             # API endpoints
│   │   │   ├── startup_analytics.py  # Startup metrics endpoints
│   │   │   ├── documents.py     # Document management
│   │   │   └── analysis.py      # Generic analysis
│   │   ├── services/            # Business logic
│   │   │   ├── startup_metrics.py    # Metrics calculation
│   │   │   ├── commentary_generator.py  # AI commentary
│   │   │   ├── pl_parser.py     # P&L parsing
│   │   │   └── ai_analyzer.py   # AI integration
│   │   └── database.py          # Database configuration
│   ├── main.py                  # FastAPI application
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js app router
│   │   ├── components/          # React components
│   │   │   ├── StartupDashboard.tsx   # Main dashboard
│   │   │   ├── MetricsCard.tsx  # Metric display
│   │   │   ├── CommentaryPanel.tsx  # AI insights
│   │   │   └── ...
│   │   └── lib/
│   │       └── api.ts           # API client
│   ├── package.json             # Node.js dependencies
│   └── next.config.js           # Next.js configuration
└── README.md
```

## API Endpoints

### Startup Analytics

**POST** `/api/startup/analyze/{document_id}`
- Calculate startup metrics from P&L
- Parameters: `cash_balance`, `company_name`
- Returns: Burn rate, runway, growth, expense drivers

**GET** `/api/startup/commentary/{document_id}`
- Generate AI commentary
- Parameters: `regenerate` (boolean)
- Returns: Investor-ready text

**GET** `/api/startup/dashboard/{document_id}`
- Get all metrics + commentary in one call
- Parameters: `cash_balance`, `company_name`
- Returns: Complete dashboard data

**POST** `/api/startup/export/{document_id}`
- Export formatted report
- Parameters: `format` (markdown/text/json)
- Returns: Formatted output

### Documents

**POST** `/api/documents/upload`
- Upload P&L file
- Accepts: CSV, XLSX, XLS

**GET** `/api/documents/`
- List all uploaded documents

**DELETE** `/api/documents/{id}`
- Delete a document

## Example P&L Format

```csv
Account,Jan 2024,Feb 2024,Mar 2024
Revenue,100000,115000,125000
Cost of Goods Sold,30000,34500,37500
Engineering Salaries,40000,40000,45000
Marketing Spend,20000,25000,30000
Office Rent,5000,5000,5000
Software & Tools,3000,3500,4000
```

## Metrics Calculated

### Burn Rate
- **Gross Burn**: Total monthly expenses
- **Net Burn**: Expenses - Revenue
- **Burn Trend**: Increasing/decreasing/stable

### Runway
- **Months Remaining**: Cash / Avg Net Burn
- **Zero Cash Date**: Projected date of $0
- **Status**: Critical/Concerning/Comfortable/Strong
- **Urgency**: High/Medium/Low/None

### Growth
- **MoM Growth**: Month-over-month percentage
- **Overall Growth**: First to last period
- **CMGR**: Compound monthly growth rate
- **Trend**: Accelerating/decelerating/stable

### Efficiency
- **Burn Multiple**: Annual burn / ARR
- **Revenue per Dollar**: Rev / Expenses
- **Rating**: Excellent/Good/Average/Poor

## AI Commentary Examples

### Executive Summary
> "We're currently burning $50,000 per month with strong revenue growth of 15% month-over-month. With 18 months of runway, we're in a healthy position to continue scaling while maintaining optionality for our next fundraise."

### Burn Analysis
> "The current net burn rate of $50k/month is well-controlled for an early-stage B2B SaaS company. Burn has remained relatively stable over the past quarter, with the majority of spending allocated to product development and go-to-market activities."

### Growth Analysis
> "Revenue growth of 15% month-over-month is strong and above the typical 10-12% benchmark for early-stage SaaS companies. The growth trend shows consistent acceleration, indicating effective product-market fit and scaling potential."

## Roadmap

### ✅ Phase 1 - MVP (Current)
- [x] P&L parsing and analysis
- [x] Burn rate & runway calculations
- [x] Growth metrics
- [x] AI commentary generation
- [x] Startup dashboard
- [x] Export functionality

### 🚧 Phase 2 - Integrations (Next)
- [ ] QuickBooks integration
- [ ] Xero integration
- [ ] Stripe revenue sync
- [ ] Scheduled monthly reports
- [ ] Email investor updates

### 🔮 Phase 3 - Advanced Features
- [ ] Forecasting & projections
- [ ] Scenario planning
- [ ] Benchmark comparisons
- [ ] Team collaboration
- [ ] Custom metrics

### 🎯 Phase 4 - Full CFO Platform
- [ ] Fractional CFO marketplace
- [ ] Financial modeling
- [ ] Cap table management
- [ ] Fundraising tools

## Configuration

### Required Environment Variables

**Backend** (`.env`):
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./valta.db  # Or PostgreSQL URL
ALLOWED_ORIGINS=http://localhost:3000
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development

### Running Tests

Backend:
```bash
cd valta/backend
pytest
```

Frontend:
```bash
cd valta/frontend
npm test
```

### Code Quality

Backend:
```bash
black . && isort . && flake8
```

Frontend:
```bash
npm run lint
```

## Deployment

### Backend Deployment (e.g., Railway/Render)

1. Set environment variables
2. Use PostgreSQL for production
3. Update `DATABASE_URL`
4. Deploy from `backend/` directory

### Frontend Deployment (Vercel)

1. Connect GitHub repository
2. Set root directory to `frontend/`
3. Add environment variable: `NEXT_PUBLIC_API_URL`
4. Deploy

## Support & Contributing

### Getting Help

- 📧 Email: support@valta.ai
- 🐛 Issues: [GitHub Issues](https://github.com/valta-ai/valta/issues)
- 📖 Docs: [Full Documentation](https://docs.valta.ai)

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## About

Valta is built for founders, by founders. We understand the pain of explaining financial metrics to investors without a finance background. Our mission is to make financial analysis accessible to every startup.

**Made with ❤️ for the startup community**

---

## FAQ

### Q: What file formats are supported?
A: CSV, XLSX, and XLS files with rows for accounts and columns for time periods.

### Q: How accurate is the AI commentary?
A: The AI uses your actual financial data to generate commentary. All calculations are verified, and commentary is based on industry best practices.

### Q: Can I edit the generated commentary?
A: Yes! All commentary is editable and can be customized before sending to investors.

### Q: Is my financial data secure?
A: Yes. Data is stored securely and never shared. You can delete documents at any time.

### Q: How much does it cost?
A: Currently in beta - free for early users. Pricing will be announced for general availability.

### Q: Can I use this for non-startup companies?
A: Yes! While optimized for startups, Valta works for any business with a P&L statement.

### Q: What if my P&L format is unusual?
A: The parser handles most formats automatically. For complex cases, manual column mapping is available.

### Q: Can I integrate this into my existing tools?
A: Yes! Full REST API available. Integration guides coming soon.

---

**Ready to try Valta?** Upload your first P&L and get insights in 60 seconds → [Get Started](http://localhost:3000)
