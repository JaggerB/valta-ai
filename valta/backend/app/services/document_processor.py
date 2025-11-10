import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

from docling.document_converter import DocumentConverter
import pandas as pd
import openpyxl
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.document import Document, DocumentChunk

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Service for processing documents using Docling"""

    def __init__(self):
        self.converter = DocumentConverter()

    async def process_document_async(self, document_id: int, file_path: str):
        """Process document asynchronously in background"""
        try:
            # Run the synchronous processing in a thread pool
            await asyncio.get_event_loop().run_in_executor(
                None, self._process_document_sync, document_id, file_path
            )
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {str(e)}")
            self._update_document_status(document_id, "failed", str(e))

    def _process_document_sync(self, document_id: int, file_path: str):
        """Synchronous document processing logic"""
        db = SessionLocal()
        try:
            # Update status to processing
            self._update_document_status(document_id, "processing", progress=10.0)

            file_extension = Path(file_path).suffix.lower()

            if file_extension in ['.xlsx', '.xls']:
                # Process Excel file
                logger.info(f"Starting Excel processing of document {document_id}")
                raw_text, structured_data = self._process_excel_file(file_path)
                page_count = structured_data.get("summary", {}).get("total_sheets", 1)
            else:
                # Process with Docling (PDF, DOCX)
                logger.info(f"Starting Docling conversion of document {document_id}")
                result = self.converter.convert(file_path)
                raw_text, page_metadata = self._extract_text_with_pages(result)
                structured_data = self._extract_structured_data(result)
                structured_data["page_metadata"] = page_metadata
                page_count = len(result.document.pages)

            # Update progress
            self._update_document_status(document_id, "processing", progress=50.0)

            # Update progress
            self._update_document_status(document_id, "processing", progress=70.0)

            # Extract financial metrics
            financial_metrics = self._extract_financial_metrics(raw_text, structured_data)

            # Update progress
            self._update_document_status(document_id, "processing", progress=90.0)

            # Create document chunks for vector search
            chunks = self._create_document_chunks(raw_text, document_id)

            # Save results to database
            document = db.query(Document).filter(Document.id == document_id).first()
            if document:
                document.raw_text = raw_text
                document.structured_data = structured_data
                document.extracted_metrics = financial_metrics
                document.document_metadata = {
                    "page_count": page_count,
                    "processing_time": (datetime.utcnow() - document.created_at).total_seconds(),
                    "chunk_count": len(chunks)
                }
                document.status = "completed"
                document.processing_progress = 100.0
                document.processed_at = datetime.utcnow()

                # Save chunks
                for chunk in chunks:
                    db_chunk = DocumentChunk(
                        document_id=document_id,
                        chunk_index=chunk["index"],
                        content=chunk["content"],
                        page_number=chunk.get("page_number"),
                        section_title=chunk.get("section_title")
                    )
                    db.add(db_chunk)

                db.commit()
                logger.info(f"Successfully processed document {document_id}")

        except Exception as e:
            logger.error(f"Error in document processing: {str(e)}")
            self._update_document_status(document_id, "failed", str(e))
        finally:
            db.close()

    def _extract_text_with_pages(self, result) -> tuple[str, List[Dict[str, Any]]]:
        """Extract text with page boundaries and metadata"""
        full_text = []
        page_metadata = []
        current_position = 0

        for page in result.document.pages:
            page_text = page.export_to_text()
            page_num = page.page_no

            page_info = {
                "page_number": page_num,
                "start_position": current_position,
                "end_position": current_position + len(page_text),
                "text_length": len(page_text)
            }

            page_metadata.append(page_info)
            full_text.append(f"[Page {page_num}]\n{page_text}")
            current_position += len(page_text) + len(f"[Page {page_num}]\n")

        return "\n\n".join(full_text), page_metadata

    def _extract_structured_data(self, result) -> Dict[str, Any]:
        """Extract structured data from Docling result"""
        try:
            structured_data = {
                "tables": [],
                "figures": [],
                "sections": []
            }

            # Extract tables
            for table in result.document.tables:
                structured_data["tables"].append({
                    "data": table.export_to_dict(),
                    "bbox": table.bbox if hasattr(table, 'bbox') else None
                })

            # Extract figures
            for figure in result.document.figures:
                structured_data["figures"].append({
                    "caption": figure.caption if hasattr(figure, 'caption') else None,
                    "bbox": figure.bbox if hasattr(figure, 'bbox') else None
                })

            # Extract sections
            for page in result.document.pages:
                for element in page.elements:
                    if hasattr(element, 'label') and 'heading' in element.label.lower():
                        structured_data["sections"].append({
                            "title": element.text,
                            "level": element.level if hasattr(element, 'level') else 1,
                            "page": page.page_no
                        })

            return structured_data

        except Exception as e:
            logger.error(f"Error extracting structured data: {str(e)}")
            return {}

    def _extract_financial_metrics(self, text: str, structured_data: Dict) -> Dict[str, Any]:
        """Extract common financial metrics from text and structured data"""
        metrics = {
            "revenue": None,
            "net_income": None,
            "eps": None,
            "operating_cash_flow": None,
            "total_assets": None,
            "total_debt": None,
            "market_cap": None,
            "extracted_from": "text"  # Track extraction method
        }

        # If structured data contains Excel sheets, try to extract from there first
        if "sheets" in structured_data:
            excel_metrics = self._extract_excel_metrics(structured_data)
            if excel_metrics:
                metrics.update(excel_metrics)
                metrics["extracted_from"] = "excel"
                return metrics

        # Fallback to text-based extraction
        import re

        # Revenue patterns
        revenue_patterns = [
            r"revenue.*?\$?([\d,]+\.?\d*)\s*(million|billion|thousand)?",
            r"net sales.*?\$?([\d,]+\.?\d*)\s*(million|billion|thousand)?",
            r"total revenue.*?\$?([\d,]+\.?\d*)\s*(million|billion|thousand)?"
        ]

        for pattern in revenue_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = match.group(1).replace(',', '')
                unit = match.group(2)
                multiplier = {'thousand': 1000, 'million': 1000000, 'billion': 1000000000}.get(unit, 1)
                metrics["revenue"] = float(amount) * multiplier
                break

        # EPS patterns
        eps_patterns = [
            r"earnings per share.*?\$?([\d,]+\.?\d*)",
            r"eps.*?\$?([\d,]+\.?\d*)",
            r"diluted earnings per share.*?\$?([\d,]+\.?\d*)"
        ]

        for pattern in eps_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                metrics["eps"] = float(match.group(1).replace(',', ''))
                break

        return metrics

    def _extract_excel_metrics(self, structured_data: Dict) -> Dict[str, Any]:
        """Extract financial metrics from Excel structured data"""
        metrics = {}

        try:
            for sheet in structured_data.get("sheets", []):
                financial_columns = sheet.get("financial_columns", [])
                data_sample = sheet.get("data_sample", [])

                if not data_sample or not financial_columns:
                    continue

                # Look for common financial metrics in the data
                for record in data_sample:
                    for col in financial_columns:
                        col_lower = str(col).lower()
                        value = record.get(col)

                        if value is None or not isinstance(value, (int, float)):
                            continue

                        # Map columns to metrics based on keywords
                        if 'revenue' in col_lower or 'sales' in col_lower:
                            if metrics.get("revenue") is None or abs(value) > abs(metrics.get("revenue", 0)):
                                metrics["revenue"] = value
                        elif 'net income' in col_lower or 'profit' in col_lower:
                            if metrics.get("net_income") is None or abs(value) > abs(metrics.get("net_income", 0)):
                                metrics["net_income"] = value
                        elif 'eps' in col_lower or 'earnings per share' in col_lower:
                            metrics["eps"] = value
                        elif 'assets' in col_lower and 'total' in col_lower:
                            if metrics.get("total_assets") is None or abs(value) > abs(metrics.get("total_assets", 0)):
                                metrics["total_assets"] = value
                        elif 'debt' in col_lower and 'total' in col_lower:
                            if metrics.get("total_debt") is None or abs(value) > abs(metrics.get("total_debt", 0)):
                                metrics["total_debt"] = value
                        elif 'cash flow' in col_lower and 'operating' in col_lower:
                            metrics["operating_cash_flow"] = value

        except Exception as e:
            logger.warning(f"Error extracting Excel metrics: {str(e)}")

        return metrics

    def _create_document_chunks(self, text: str, document_id: int) -> List[Dict[str, Any]]:
        """Split document into chunks for vector search"""
        # Simple chunking strategy - can be enhanced
        chunk_size = 1000
        overlap = 200
        chunks = []

        words = text.split()
        current_chunk = []
        chunk_index = 0

        for i, word in enumerate(words):
            current_chunk.append(word)

            if len(' '.join(current_chunk)) >= chunk_size:
                chunk_text = ' '.join(current_chunk)
                chunks.append({
                    "index": chunk_index,
                    "content": chunk_text,
                    "page_number": None,  # Could be extracted from Docling result
                    "section_title": None  # Could be extracted from context
                })

                # Keep overlap for next chunk
                overlap_words = current_chunk[-overlap//10:] if len(current_chunk) > overlap//10 else []
                current_chunk = overlap_words
                chunk_index += 1

        # Add remaining content as final chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunks.append({
                "index": chunk_index,
                "content": chunk_text,
                "page_number": None,
                "section_title": None
            })

        return chunks

    def _update_document_status(self, document_id: int, status: str, error_message: str = None, progress: float = None):
        """Update document processing status in database"""
        db = SessionLocal()
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if document:
                document.status = status
                if error_message:
                    document.error_message = error_message
                if progress is not None:
                    document.processing_progress = progress
                db.commit()
        except Exception as e:
            logger.error(f"Error updating document status: {str(e)}")
        finally:
            db.close()

    def _process_excel_file(self, file_path: str) -> tuple[str, Dict[str, Any]]:
        """Process Excel file and extract text and structured data"""
        try:
            # Read Excel file with all sheets
            xl_file = pd.ExcelFile(file_path)
            all_text = []
            structured_data = {
                "sheets": [],
                "tables": [],
                "summary": {}
            }

            for sheet_name in xl_file.sheet_names:
                try:
                    # Read sheet without forcing headers initially
                    df_raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None)

                    # Find the header row by looking for the row with most non-null, non-numeric values
                    header_row_idx = 0
                    max_text_cols = 0

                    for idx in range(min(10, df_raw.shape[0])):  # Check first 10 rows
                        row = df_raw.iloc[idx]
                        # Count non-null cells that contain text (potential headers)
                        text_count = sum(1 for val in row if pd.notna(val) and not isinstance(val, (int, float)))
                        if text_count > max_text_cols:
                            max_text_cols = text_count
                            header_row_idx = idx

                    # Now read with the detected header row
                    df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row_idx)

                    # Clean up column names - keep original names, just ensure they're strings
                    df.columns = [str(col) if pd.notna(col) else f'Column_{i}' for i, col in enumerate(df.columns)]

                    # Convert to text representation
                    sheet_text = f"\n=== Sheet: {sheet_name} ===\n"

                    # Add column headers
                    if not df.empty:
                        headers = [str(col) for col in df.columns]
                        sheet_text += "Columns: " + ", ".join(headers) + "\n\n"

                        # Add all data rows
                        for idx, row in df.iterrows():
                            # Create a more structured representation
                            row_data = []
                            for i, val in enumerate(row.values):
                                col_name = headers[i] if i < len(headers) else f"Col_{i}"
                                if pd.notna(val) and str(val).strip():
                                    row_data.append(f"{col_name}: {val}")

                            if row_data:  # Only add rows with actual data
                                sheet_text += f"Row {idx + 1}: " + " | ".join(row_data) + "\n"

                    all_text.append(sheet_text)

                    # Store structured data - include ALL rows for AI analysis
                    sheet_data = {
                        "name": sheet_name,
                        "rows": len(df),
                        "columns": len(df.columns),
                        "column_names": list(df.columns),
                        "data_sample": df.to_dict('records') if not df.empty else []  # All rows, not just sample
                    }

                    # Identify potential financial data
                    financial_columns = self._identify_financial_columns(df)
                    if financial_columns:
                        sheet_data["financial_columns"] = financial_columns

                    structured_data["sheets"].append(sheet_data)

                except Exception as e:
                    logger.warning(f"Error processing sheet {sheet_name}: {str(e)}")
                    continue

            # Generate summary
            structured_data["summary"] = {
                "total_sheets": len(xl_file.sheet_names),
                "processed_sheets": len(structured_data["sheets"]),
                "total_rows": sum(sheet["rows"] for sheet in structured_data["sheets"]),
                "total_columns": sum(sheet["columns"] for sheet in structured_data["sheets"])
            }

            raw_text = "\n".join(all_text)
            return raw_text, structured_data

        except Exception as e:
            logger.error(f"Error processing Excel file: {str(e)}")
            return f"Error processing Excel file: {str(e)}", {"error": str(e)}

    def _identify_financial_columns(self, df: pd.DataFrame) -> List[str]:
        """Identify columns that likely contain financial data"""
        financial_keywords = [
            'revenue', 'income', 'expense', 'cost', 'profit', 'loss', 'sales',
            'cash', 'assets', 'liabilities', 'equity', 'debt', 'margin',
            'ebitda', 'eps', 'roi', 'price', 'amount', 'value', 'total',
            'gross', 'net', 'operating', 'interest', 'tax', 'dividend'
        ]

        financial_columns = []

        for column in df.columns:
            column_str = str(column).lower()
            # Check if column name contains financial keywords
            if any(keyword in column_str for keyword in financial_keywords):
                financial_columns.append(column)
            # Check if column contains mostly numeric data
            elif df[column].dtype in ['int64', 'float64']:
                # Check if values look like financial data (not just sequential numbers)
                non_null_values = df[column].dropna()
                if len(non_null_values) > 0:
                    # If values are generally large or have decimal places, likely financial
                    if non_null_values.abs().mean() > 100 or any('.' in str(val) for val in non_null_values.head(5)):
                        financial_columns.append(column)

        return financial_columns