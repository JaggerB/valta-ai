"""
Startup Analytics Router

API endpoints for startup-specific financial analysis:
- /analyze - Calculate startup metrics from P&L
- /commentary - Generate AI investor commentary
- /dashboard - Get all data for dashboard
- /export - Export formatted reports
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import pandas as pd

from app.database import get_db
from app.models.document import Document
from app.services.pl_parser import PLParser
from app.services.startup_metrics import StartupMetricsCalculator
from app.services.commentary_generator import CommentaryGenerator


router = APIRouter(prefix="/api/startup", tags=["startup-analytics"])


class AnalyzeRequest(BaseModel):
    """Request model for analysis endpoint"""
    cash_balance: Optional[float] = Field(None, description="Current cash balance")
    company_name: Optional[str] = Field(None, description="Company name for reports")


class DashboardResponse(BaseModel):
    """Response model for dashboard endpoint"""
    success: bool
    metrics: Dict[str, Any]
    commentary: Optional[Dict[str, Any]] = None
    document_info: Dict[str, str]


@router.post("/analyze/{document_id}")
async def analyze_startup_metrics(
    document_id: int,
    request: AnalyzeRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze P&L document and calculate startup metrics

    Args:
        document_id: ID of uploaded P&L document
        request: Analysis parameters (cash_balance, company_name)

    Returns:
        Calculated startup metrics including burn, runway, growth
    """
    # Get document from database
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check if document is a P&L (check file extension)
    file_ext = document.filename.lower().split('.')[-1]
    if file_ext not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=400,
            detail="Document must be a P&L file (CSV or Excel)"
        )

    try:
        # Parse P&L document
        parser = PLParser()
        parsed_data = parser.parse_file(document.file_path)

        # Calculate startup metrics
        calculator = StartupMetricsCalculator(
            df=parsed_data['line_items'],
            metadata=parsed_data['metadata']
        )

        metrics = calculator.calculate_all_metrics(
            cash_balance=request.cash_balance
        )

        # Store metrics in document custom_data
        document.custom_data = document.custom_data or {}
        document.custom_data['startup_metrics'] = metrics
        document.custom_data['company_name'] = request.company_name
        db.commit()

        return {
            'success': True,
            'document_id': document_id,
            'metrics': metrics,
            'message': 'Startup metrics calculated successfully'
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing document: {str(e)}"
        )


@router.get("/commentary/{document_id}")
async def generate_commentary(
    document_id: int,
    regenerate: bool = Query(False, description="Force regenerate commentary"),
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered investor commentary

    Args:
        document_id: ID of analyzed document
        regenerate: Whether to regenerate cached commentary

    Returns:
        AI-generated investor update commentary
    """
    # Get document from database
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check if metrics have been calculated
    if not document.custom_data or 'startup_metrics' not in document.custom_data:
        raise HTTPException(
            status_code=400,
            detail="Please analyze the document first using /analyze endpoint"
        )

    # Check for cached commentary
    if not regenerate and 'ai_commentary' in document.custom_data:
        return {
            'success': True,
            'document_id': document_id,
            'commentary': document.custom_data['ai_commentary'],
            'cached': True
        }

    try:
        # Generate commentary
        generator = CommentaryGenerator()
        metrics = document.custom_data['startup_metrics']
        company_name = document.custom_data.get('company_name')

        # Determine period label from document name or metadata
        period_label = _extract_period_label(document)

        commentary = generator.generate_full_commentary(
            metrics=metrics,
            company_name=company_name,
            period_label=period_label
        )

        # Cache commentary
        document.custom_data['ai_commentary'] = commentary
        db.commit()

        return {
            'success': True,
            'document_id': document_id,
            'commentary': commentary,
            'cached': False
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating commentary: {str(e)}"
        )


@router.get("/dashboard/{document_id}")
async def get_dashboard_data(
    document_id: int,
    cash_balance: Optional[float] = Query(None, description="Current cash balance"),
    company_name: Optional[str] = Query(None, description="Company name"),
    db: Session = Depends(get_db)
):
    """
    Get all data needed for startup dashboard in one call

    Combines metrics calculation and commentary generation
    for efficient frontend loading.

    Args:
        document_id: ID of P&L document
        cash_balance: Current cash balance (optional)
        company_name: Company name (optional)

    Returns:
        Complete dashboard data including metrics and commentary
    """
    # Get document from database
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Check if metrics already calculated
        if document.custom_data and 'startup_metrics' in document.custom_data:
            metrics = document.custom_data['startup_metrics']

            # Update cash balance if provided
            if cash_balance is not None:
                calculator = StartupMetricsCalculator(
                    df=pd.DataFrame(),  # Not needed for runway recalc
                    metadata={}
                )
                burn_avg = metrics.get('burn_rate', {}).get('net_burn_avg', 0)
                if burn_avg:
                    runway = calculator._calculate_runway(cash_balance, burn_avg)
                    metrics['runway'] = runway

        else:
            # Calculate metrics for the first time
            file_ext = document.filename.lower().split('.')[-1]
            if file_ext not in ['csv', 'xlsx', 'xls']:
                raise HTTPException(
                    status_code=400,
                    detail="Document must be a P&L file (CSV or Excel)"
                )

            parser = PLParser()
            parsed_data = parser.parse_file(document.file_path)

            calculator = StartupMetricsCalculator(
                df=parsed_data['line_items'],
                metadata=parsed_data['metadata']
            )

            metrics = calculator.calculate_all_metrics(cash_balance=cash_balance)

            # Store in database
            document.custom_data = document.custom_data or {}
            document.custom_data['startup_metrics'] = metrics
            if company_name:
                document.custom_data['company_name'] = company_name
            db.commit()

        # Generate or retrieve commentary
        if document.custom_data and 'ai_commentary' in document.custom_data:
            commentary = document.custom_data['ai_commentary']
        else:
            generator = CommentaryGenerator()
            period_label = _extract_period_label(document)

            commentary = generator.generate_full_commentary(
                metrics=metrics,
                company_name=company_name or document.custom_data.get('company_name'),
                period_label=period_label
            )

            # Cache commentary
            document.custom_data['ai_commentary'] = commentary
            db.commit()

        return {
            'success': True,
            'metrics': metrics,
            'commentary': commentary,
            'document_info': {
                'id': document.id,
                'name': document.filename,
                'uploaded_at': document.created_at.isoformat() if document.created_at else None
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading dashboard data: {str(e)}"
        )


@router.post("/export/{document_id}")
async def export_report(
    document_id: int,
    format: str = Query("markdown", description="Export format: markdown, text, or json"),
    db: Session = Depends(get_db)
):
    """
    Export formatted investor report

    Args:
        document_id: ID of analyzed document
        format: Export format (markdown, text, json)

    Returns:
        Formatted report ready for download or copy
    """
    # Get document from database
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check if commentary exists
    if not document.custom_data or 'ai_commentary' not in document.custom_data:
        raise HTTPException(
            status_code=400,
            detail="Please generate commentary first using /commentary endpoint"
        )

    try:
        commentary = document.custom_data['ai_commentary']
        formatted_outputs = commentary.get('formatted_outputs', {})

        if format == 'markdown':
            content = formatted_outputs.get('markdown', '')
            content_type = 'text/markdown'
        elif format == 'text':
            content = formatted_outputs.get('plain_text', '')
            content_type = 'text/plain'
        elif format == 'json':
            content = formatted_outputs.get('json', {})
            content_type = 'application/json'
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid format. Use 'markdown', 'text', or 'json'"
            )

        return {
            'success': True,
            'format': format,
            'content': content,
            'content_type': content_type
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error exporting report: {str(e)}"
        )


@router.get("/metrics-only/{document_id}")
async def get_metrics_only(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Get just the calculated metrics without commentary

    Useful for quick metric checks or dashboard updates
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not document.custom_data or 'startup_metrics' not in document.custom_data:
        raise HTTPException(
            status_code=400,
            detail="Metrics not calculated. Use /analyze endpoint first"
        )

    return {
        'success': True,
        'metrics': document.custom_data['startup_metrics']
    }


# Helper functions

def _extract_period_label(document: Document) -> str:
    """Extract period label from document name or metadata"""
    # Try to parse from filename
    filename = document.filename.lower()

    # Common patterns: "october_2024", "2024-10", "oct24", etc.
    import re

    # Try YYYY-MM pattern
    match = re.search(r'(\d{4})-(\d{2})', filename)
    if match:
        year, month = match.groups()
        from datetime import datetime
        try:
            date = datetime.strptime(f"{year}-{month}", "%Y-%m")
            return date.strftime("%B %Y")
        except:
            pass

    # Try month name pattern
    months = ['january', 'february', 'march', 'april', 'may', 'june',
              'july', 'august', 'september', 'october', 'november', 'december']

    for month in months:
        if month in filename:
            # Try to find year
            year_match = re.search(r'20\d{2}', filename)
            if year_match:
                return f"{month.title()} {year_match.group()}"
            return month.title()

    # Default to upload date
    if document.created_at:
        return document.created_at.strftime("%B %Y")

    return "Recent Period"
