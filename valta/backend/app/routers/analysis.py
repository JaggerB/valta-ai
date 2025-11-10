from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import io

from app.database import get_db
from app.models.document import Document, Query
from app.services.ai_analyzer import AIAnalyzer
from app.services.pl_parser import PLParser
from app.services.account_mapper import AccountMapper
from app.services.waterfall_calculator import WaterfallCalculator

router = APIRouter()

# Request/Response models
class AnalysisRequest(BaseModel):
    question: str
    document_id: Optional[int] = None  # None for multi-document analysis

class SourceCitation(BaseModel):
    document_id: int
    document_name: str
    page_number: Optional[int]
    section: Optional[str]
    excerpt: str

class AnalysisResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    confidence_score: float
    processing_time: float

class KeyMetric(BaseModel):
    label: str
    value: str
    change: Optional[str] = None
    trend: Optional[str] = None  # "up", "down", "neutral"

class DocumentInsights(BaseModel):
    document_id: int
    document_name: str
    summary: str
    key_metrics: List[KeyMetric]
    insights: List[str]
    risks: List[str]
    opportunities: List[str]

class WorkbookSheet(BaseModel):
    name: str
    columns: List[str]
    rows: List[List]
    formulas: Optional[Dict[str, str]] = {}

class WorkbookResponse(BaseModel):
    title: str
    sheets: List[WorkbookSheet]
    summary: str
    conversation_id: str

# Initialize AI analyzer
ai_analyzer = AIAnalyzer()

@router.post("/ask", response_model=AnalysisResponse)
async def ask_question(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """Ask a question about one or more documents"""

    # Validate document exists if document_id provided
    if request.document_id:
        document = db.query(Document).filter(Document.id == request.document_id).first()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        if document.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document is still being processed"
            )

    # Process the question using AI analyzer
    result = await ai_analyzer.analyze_question(
        question=request.question,
        document_id=request.document_id,
        db=db
    )

    # Save query to database
    query = Query(
        document_id=request.document_id,
        question=request.question,
        answer=result["answer"],
        sources=result["sources"],
        confidence_score=result["confidence_score"],
        processing_time=result["processing_time"]
    )
    db.add(query)
    db.commit()

    return AnalysisResponse(
        answer=result["answer"],
        sources=[
            SourceCitation(
                document_id=source["document_id"],
                document_name=source["document_name"],
                page_number=source.get("page_number"),
                section=source.get("section"),
                excerpt=source["excerpt"]
            )
            for source in result["sources"]
        ],
        confidence_score=result["confidence_score"],
        processing_time=result["processing_time"]
    )

@router.get("/document/{document_id}/insights", response_model=DocumentInsights)
async def get_document_insights(document_id: int, db: Session = Depends(get_db)):
    """Get AI-generated insights for a specific document"""

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is still being processed"
        )

    # Generate insights using AI analyzer
    insights = await ai_analyzer.generate_document_insights(document_id, db)

    return DocumentInsights(
        document_id=document_id,
        document_name=document.original_filename,
        summary=insights.get("summary", ""),
        key_metrics=[
            KeyMetric(**metric) for metric in insights.get("key_metrics", [])
        ],
        insights=insights.get("insights", []),
        risks=insights.get("risks", []),
        opportunities=insights.get("opportunities", [])
    )

@router.get("/queries/recent")
async def get_recent_queries(limit: int = 10, db: Session = Depends(get_db)):
    """Get recent queries for the current user"""

    queries = db.query(Query).order_by(Query.created_at.desc()).limit(limit).all()

    return [
        {
            "id": query.id,
            "question": query.question,
            "answer": query.answer[:200] + "..." if len(query.answer) > 200 else query.answer,
            "confidence_score": query.confidence_score,
            "created_at": query.created_at.isoformat()
        }
        for query in queries
    ]


# ===== P&L Analysis Endpoints =====

class PLParseRequest(BaseModel):
    header_row: Optional[int] = None
    account_column: Optional[str] = None
    date_columns: Optional[List[str]] = None


class WaterfallRequest(BaseModel):
    metric: str  # e.g., 'revenue', 'gross_profit', 'operating_profit'
    period1_start: str  # YYYY-MM format
    period1_end: str  # YYYY-MM format
    period2_start: str  # YYYY-MM format
    period2_end: str  # YYYY-MM format
    top_n: int = 5


@router.post("/document/{document_id}/pl-parse")
async def parse_pl_document(
    document_id: int,
    request: PLParseRequest = None,
    db: Session = Depends(get_db)
):
    """
    Parse a P&L document and return structured data with account mappings
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get file path
    file_path = document.filename

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document file not found")

    # Parse P&L
    parser = PLParser()
    user_hints = {}

    if request:
        if request.header_row is not None:
            user_hints['header_row'] = request.header_row
        if request.account_column:
            user_hints['account_column'] = request.account_column
        if request.date_columns:
            user_hints['date_columns'] = request.date_columns

    try:
        parse_result = parser.parse_file(file_path, user_hints if user_hints else None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse P&L: {str(e)}")

    # Map accounts using AI
    mapper = AccountMapper(use_ai=True, ai_provider='claude')
    account_col = parse_result['metadata']['columns']['account']

    try:
        mapped_df = mapper.batch_categorize_dataframe(
            parse_result['data'],
            account_col
        )
    except Exception as e:
        # If mapping fails, continue without it
        mapped_df = parse_result['data']
        print(f"Account mapping failed: {e}")

    # Calculate available periods
    calc = WaterfallCalculator(mapped_df, account_col)
    available_periods = calc.get_available_periods()
    suggested_periods = calc.suggest_period_ranges(available_periods)
    metric_options = calc.get_metric_options()

    # Get items needing review
    items_needing_review = []
    if 'needs_review' in mapped_df.columns:
        review_df = mapped_df[mapped_df['needs_review'] == True]
        items_needing_review = review_df[[account_col, 'category', 'mapping_confidence']].to_dict('records')

    return {
        "success": True,
        "metadata": {
            "header_row": parse_result['metadata']['header_row'],
            "columns": parse_result['metadata']['columns'],
            "total_accounts": len(mapped_df),
            "total_periods": len(available_periods),
            "available_periods": available_periods,
            "suggested_period1": suggested_periods.get('period1', []),
            "suggested_period2": suggested_periods.get('period2', []),
            "metric_options": metric_options,
            "items_needing_review": items_needing_review
        }
    }


@router.post("/document/{document_id}/pl-waterfall")
async def get_pl_waterfall(
    document_id: int,
    request: WaterfallRequest,
    db: Session = Depends(get_db)
):
    """
    Generate waterfall bridge chart data for period comparison
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = document.filename
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document file not found")

    # Re-parse document (in production, cache this)
    parser = PLParser()
    try:
        parse_result = parser.parse_file(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse P&L: {str(e)}")

    # Map accounts
    mapper = AccountMapper(use_ai=True, ai_provider='claude')
    account_col = parse_result['metadata']['columns']['account']

    try:
        mapped_df = mapper.batch_categorize_dataframe(parse_result['data'], account_col)
    except:
        mapped_df = parse_result['data']

    # Find period columns
    value_cols = parse_result['metadata']['columns']['values']
    date_cols = [col for col in mapped_df.columns if col.endswith('_normalized')]

    # Filter columns for requested periods
    period1_cols = []
    period2_cols = []

    for value_col in value_cols:
        # Find corresponding date column
        col_idx = value_cols.index(value_col)
        if col_idx < len(date_cols):
            date_col = date_cols[col_idx]

            # Check if this column falls in period 1 or period 2
            for idx, row in mapped_df.head(1).iterrows():
                period_value = row.get(date_col)
                if period_value:
                    if request.period1_start <= period_value <= request.period1_end:
                        period1_cols.append(value_col)
                    elif request.period2_start <= period_value <= request.period2_end:
                        period2_cols.append(value_col)

    if not period1_cols or not period2_cols:
        raise HTTPException(status_code=400, detail="No data found for specified periods")

    # Calculate waterfall
    calc = WaterfallCalculator(mapped_df, account_col)

    try:
        # Check if metric is derived
        if request.metric in ['gross_profit', 'operating_profit', 'net_profit']:
            waterfall_data = calc.calculate_derived_metric(
                request.metric,
                period1_cols,
                period2_cols,
                request.top_n
            )
        else:
            # Map metric to category filter
            metric_category_map = {
                'revenue': 'Revenue',
                'cogs': 'Cost of Goods Sold',
                'opex': 'Operating Expenses'
            }

            metric_filter = metric_category_map.get(request.metric)

            waterfall_data = calc.calculate_waterfall(
                request.metric,
                period1_cols,
                period2_cols,
                request.top_n,
                metric_filter
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate waterfall: {str(e)}")

    return {
        "success": True,
        "waterfall": waterfall_data,
        "periods": {
            "period1": {"start": request.period1_start, "end": request.period1_end},
            "period2": {"start": request.period2_start, "end": request.period2_end}
        }
    }


@router.get("/document/{document_id}/pl-export")
async def export_pl_data(document_id: int, db: Session = Depends(get_db)):
    """
    Export cleansed P&L data as CSV
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = document.filename
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document file not found")

    # Parse and map
    parser = PLParser()
    parse_result = parser.parse_file(file_path)

    mapper = AccountMapper(use_ai=True, ai_provider='claude')
    account_col = parse_result['metadata']['columns']['account']
    mapped_df = mapper.batch_categorize_dataframe(parse_result['data'], account_col)

    # Convert to CSV
    csv_buffer = io.StringIO()
    mapped_df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)

    # Return as downloadable file
    return StreamingResponse(
        io.BytesIO(csv_buffer.getvalue().encode()),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=pl_export_{document_id}.csv"
        }
    )


# ===== Workbook Generation Endpoint =====

@router.post("/generate-workbook", response_model=WorkbookResponse)
async def generate_workbook(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Generate an Excel-style workbook based on user question and document data.
    Uses AI to analyze uploaded documents and create relevant financial tables.
    """
    import uuid
    import pandas as pd
    from app.models.document import DocumentChunk

    # Get all available documents or specific document
    if request.document_id:
        documents = db.query(Document).filter(
            Document.id == request.document_id,
            Document.status == "completed"
        ).all()
    else:
        # Use all completed documents
        documents = db.query(Document).filter(Document.status == "completed").all()

    if not documents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed documents found for analysis"
        )

    # Get document chunks for context
    document_ids = [doc.id for doc in documents]
    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id.in_(document_ids)
    ).limit(50).all()  # Limit chunks for performance

    # Create a mapping of document IDs to filenames
    doc_map = {doc.id: doc.original_filename for doc in documents}

    # Build context from chunks
    context_text = "\n\n".join([
        f"From {doc_map.get(chunk.document_id, 'Unknown')}:\n{chunk.content}"
        for chunk in chunks[:10]  # Use top 10 chunks for initial context
    ])

    # Use AI to generate workbook based on question
    workbook_data = await ai_analyzer.generate_workbook(
        question=request.question,
        context=context_text,
        documents=documents,
        db=db
    )

    conversation_id = str(uuid.uuid4())

    return WorkbookResponse(
        title=workbook_data["title"],
        sheets=[
            WorkbookSheet(
                name=sheet["name"],
                columns=sheet["columns"],
                rows=sheet["rows"],
                formulas=sheet.get("formulas", {})
            )
            for sheet in workbook_data["sheets"]
        ],
        summary=workbook_data["summary"],
        conversation_id=conversation_id
    )