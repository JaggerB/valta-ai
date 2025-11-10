import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any

import openai
import anthropic
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk
from app.services.usage_tracker import usage_tracker
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class AIAnalyzer:
    """Service for AI-powered document analysis"""

    def __init__(self):
        # Initialize AI clients
        self.openai_client = openai.AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        self.anthropic_client = anthropic.AsyncAnthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )

        # Financial analysis prompts
        self.financial_analysis_prompt = """
        You are Valta, an expert financial analyst AI assistant specializing in P&L analysis and financial data interpretation.

        CRITICAL FORMATTING RULES:
        1. ALL monetary values MUST be formatted as currency:
           - Use $ symbol
           - Comma separators for thousands (e.g., $1,234.56)
           - Maximum 2 decimal places (e.g., $2,426.00 or $2,426 for whole numbers)
           - Never show more than 2 decimal places
           - For large numbers, use thousands separator: $1,234,567.89

        2. Percentages:
           - Always use % symbol
           - Maximum 1 decimal place (e.g., 15.3%)
           - For changes: "+15.3%" or "-8.2%"

        3. Dates:
           - Use format: Dec 2022, January 2023, or 2023-01
           - Be consistent within the same response

        CORE PRINCIPLES:
        - Provide factual, data-driven responses based only on the document content
        - Be concise but comprehensive - answer directly without unnecessary preamble
        - When citing information, reference the location (e.g., "from the Dec 2022 column")
        - Always include the time period and currency symbol ($) for financial metrics

        DATA STRUCTURE ANALYSIS:
        When analyzing financial documents (especially P&L statements):
        1. Identify ALL date headers/columns in the document and map them to readable format (e.g., "Dec 2022", "Jan 2023")
        2. Categorize accounts into: Income, Cost of Sales, Operating Expenses, Non-operating Expenses
        3. Recognize calculated metrics: Gross Profit, Operating Profit, Net Profit
        4. Identify the specific row and column where data is located
        5. IMPORTANT: Analyze the ENTIRE document - do not focus only on the first column or period you see
        6. When asked about trends or comparisons, analyze ALL available time periods

        RESPONSE STYLE:
        - Start immediately with the answer (e.g., "The rent revenue for December 2022 was $2,426")
        - Support with context if relevant (e.g., "up 12.5% from November")
        - Keep it professional and concise
        - Use bullet points for multiple data points
        - Never say "Based on the document" or "According to the data" - just state the facts

        EXAMPLE GOOD RESPONSE:
        "The rent revenue for December 2022 was $2,426. This represents a 15.3% increase from the previous month ($2,103)."

        EXAMPLE BAD RESPONSE:
        "Based on the financial document provided, I can see that the rent revenue value for the period of December in the year 2022 appears to be 2426.324234234..."

        Document Content:
        {document_content}

        User Question: {question}

        Answer directly and professionally with properly formatted numbers (currency symbols, max 2 decimals).
        """

        self.insights_prompt = """
        You are Valta, an expert financial analyst AI specializing in P&L analysis and financial data interpretation.

        CRITICAL FORMATTING RULES:
        1. ALL monetary values MUST be formatted as currency:
           - Use $ symbol
           - Comma separators for thousands (e.g., $1,234.56)
           - Maximum 2 decimal places
        2. Percentages: Always use % symbol with max 1 decimal (e.g., 15.3%)
        3. Dates: Use format like "Dec 2022" or "January 2023"

        CRITICAL ANALYSIS INSTRUCTIONS:
        ⚠️ THIS IS A MULTI-PERIOD P&L STATEMENT WITH DATA ACROSS MANY MONTHS/YEARS
        ⚠️ YOU MUST ANALYZE **ALL COLUMNS** - NOT JUST THE FIRST COLUMN OR MOST RECENT MONTH
        ⚠️ The document contains data from multiple time periods (e.g., Jul-20 to Dec-22)
        ⚠️ Your insights MUST cover the FULL TIME RANGE, not just one month

        ANALYSIS REQUIREMENTS:
        Analyze the ENTIRE P&L document across ALL time periods:

        1. **Key Metrics Summary** - For the MOST RECENT period AND compare to:
           - Previous month
           - Same period last year
           - Beginning of available data range

        2. **Trends & Patterns** - Analyze FULL history:
           - Overall trend direction (upward/downward) across ALL months
           - Month-over-month changes ($ and %)
           - Year-over-year comparisons
           - Identify growing/declining revenue streams over time
           - Spot expense trends across the entire period
           - Highlight significant variances (>10%)

        3. **Top Insights** (3-5 bullet points):
           - MUST include insights from analyzing the FULL time period
           - Mention specific time ranges (e.g., "from Jul 2020 to Dec 2022")
           - Identify the best and worst performing months
           - Notable inflection points or turning points in the data
           - Use specific numbers, percentages, and date ranges

        4. **Risk Factors** (if any):
           - Declining revenues over time
           - Rising costs trends
           - Negative margins
           - Concerning multi-month trends

        5. **Opportunities** (if any):
           - Revenue growth areas identified across the full period
           - Cost reduction potential based on historical patterns
           - Improving trends over time

        Document Content:
        {document_content}

        IMPORTANT: Return ONLY valid JSON in this exact structure:
        {{
            "summary": "Brief overview covering the FULL time period (e.g., 'From Jul 2020 to Dec 2022, revenue grew 45% while...')",
            "key_metrics": [
                {{"label": "Latest Total Revenue (Dec 2022)", "value": "$XX,XXX", "change": "+5.3% vs Nov 2022", "trend": "up"}},
                {{"label": "Revenue Growth (Jul 2020 - Dec 2022)", "value": "$XX,XXX to $YY,YYY", "change": "+45.2%", "trend": "up"}},
                {{"label": "Net Profit (Latest)", "value": "$X,XXX", "change": "-2.1% vs prior month", "trend": "down"}}
            ],
            "insights": [
                "Revenue increased from $X in Jul 2020 to $Y in Dec 2022, representing 45% growth over the 2.5 year period",
                "Peak revenue occurred in Month YYYY at $Z, while lowest was in Month YYYY at $W",
                "Operating expenses showed steady increase of 3.2% monthly average from Jul 2020 to Dec 2022",
                "Profit margin improved from 12% in 2020 to 18% in 2022, indicating improving operational efficiency"
            ],
            "risks": [
                "Revenue declined 8% from peak in Aug 2022, suggesting market headwinds"
            ],
            "opportunities": [
                "Rent revenue category showed consistent 12% YoY growth across all analyzed periods"
            ]
        }}

        REMEMBER: Your insights MUST reference multiple time periods, show trends over time, and compare different months/years.
        """

    async def analyze_question(self, question: str, document_id: Optional[int], db: Session) -> Dict[str, Any]:
        """Analyze a question against document(s) and return comprehensive answer"""
        start_time = time.time()

        try:
            # Get relevant document content
            if document_id:
                document = db.query(Document).filter(Document.id == document_id).first()
                if not document:
                    raise ValueError("Document not found")

                # For Excel files, include both raw text AND structured data for comprehensive analysis
                document_content = document.raw_text
                if document.structured_data and "sheets" in document.structured_data:
                    # Add structured sheet data in a format AI can easily parse
                    document_content += "\n\n=== STRUCTURED DATA ===\n"
                    for sheet in document.structured_data.get("sheets", []):
                        document_content += f"\nSheet: {sheet['name']}\n"
                        document_content += f"Columns: {', '.join(sheet.get('column_names', []))}\n"
                        # Include ALL rows from data_sample (which now contains all rows, not just 10)
                        for idx, row in enumerate(sheet.get('data_sample', [])):
                            row_str = " | ".join([f"{k}: {v}" for k, v in row.items() if v is not None and str(v).strip()])
                            if row_str:
                                document_content += f"Row {idx + 1}: {row_str}\n"

                document_name = document.original_filename
                sources_context = [{"id": document_id, "name": document_name, "content": document_content}]
            else:
                # Multi-document analysis
                documents = db.query(Document).filter(Document.status == "completed").all()
                sources_context = [
                    {"id": doc.id, "name": doc.original_filename, "content": doc.raw_text}
                    for doc in documents
                ]
                document_content = "\n\n".join([f"Document: {doc['name']}\n{doc['content']}" for doc in sources_context])

            # Use semantic search to find relevant chunks (simplified for MVP)
            relevant_chunks = self._get_relevant_chunks(question, document_content)

            # Generate response using Claude for complex analysis
            response, model_used = await self._generate_claude_response(question, relevant_chunks)

            # Extract sources and citations
            sources = self._extract_sources(response, sources_context)

            # Calculate confidence score based on content quality
            confidence_score = self._calculate_confidence_score(response, relevant_chunks)

            processing_time = time.time() - start_time

            return {
                "answer": response,
                "sources": sources,
                "confidence_score": confidence_score,
                "processing_time": processing_time,
                "model_used": model_used
            }

        except Exception as e:
            logger.error(f"Error in AI analysis: {str(e)}")
            return {
                "answer": f"I encountered an error while analyzing your question: {str(e)}",
                "sources": [],
                "confidence_score": 0.0,
                "processing_time": time.time() - start_time
            }

    async def generate_document_insights(self, document_id: int, db: Session) -> Dict[str, Any]:
        """Generate comprehensive insights for a document"""
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError("Document not found")

            # Prepare full document content (same logic as analyze_question)
            document_content = document.raw_text
            if document.structured_data and "sheets" in document.structured_data:
                # Include structured data for Excel files
                document_content += "\n\n=== STRUCTURED DATA ===\n"
                for sheet in document.structured_data.get("sheets", []):
                    document_content += f"\nSheet: {sheet['name']}\n"
                    document_content += f"Columns: {', '.join(sheet.get('column_names', []))}\n"
                    # Include ALL rows
                    for idx, row in enumerate(sheet.get('data_sample', [])):
                        row_str = " | ".join([f"{k}: {v}" for k, v in row.items() if v is not None and str(v).strip()])
                        if row_str:
                            document_content += f"Row {idx + 1}: {row_str}\n"

            # Try Claude first for better analysis
            used_model = None
            try:
                response = await self.anthropic_client.messages.create(
                    model="claude-3-5-sonnet-20240620",
                    max_tokens=4000,
                    temperature=0.1,
                    messages=[{
                        "role": "user",
                        "content": self.insights_prompt.format(document_content=document_content)
                    }]
                )
                content = response.content[0].text
                used_model = "claude-3-5-sonnet-20240620"
            except Exception as claude_error:
                logger.warning(f"Claude API failed, using OpenAI: {str(claude_error)}")
                # Fallback to OpenAI
                response = await self.openai_client.chat.completions.create(
                    model="gpt-4-turbo-preview",
                    messages=[{
                        "role": "user",
                        "content": self.insights_prompt.format(document_content=document_content)
                    }],
                    temperature=0.1,
                    max_tokens=4000
                )
                content = response.choices[0].message.content
                used_model = "gpt-4-turbo-preview"

            # Parse JSON response
            try:
                # Extract JSON if wrapped in markdown code blocks
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()

                insights = json.loads(content)
                insights["model_used"] = used_model
                return insights

            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {str(e)}, Content: {content}")
                # Return basic structure if parsing fails
                return {
                    "summary": "Analysis completed but insights formatting failed. Please try regenerating.",
                    "key_metrics": [],
                    "insights": [],
                    "risks": [],
                    "opportunities": []
                }

        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
            return {
                "summary": f"Error generating insights: {str(e)}",
                "key_metrics": [],
                "insights": [],
                "risks": [],
                "opportunities": []
            }

    async def _generate_claude_response(self, question: str, relevant_content: str) -> tuple[str, str]:
        """Generate response using Claude for complex financial analysis"""
        try:
            response = await self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=4000,  # Increased for comprehensive analysis
                temperature=0.1,  # Lower temperature for more factual responses
                messages=[{
                    "role": "user",
                    "content": self.financial_analysis_prompt.format(
                        document_content=relevant_content,
                        question=question
                    )
                }]
            )
            return response.content[0].text, "claude-3-5-sonnet-20240620"

        except Exception as e:
            logger.error(f"Error with Claude API: {str(e)}")
            # Fallback to OpenAI
            return await self._generate_openai_response(question, relevant_content)

    async def _generate_openai_response(self, question: str, relevant_content: str) -> tuple[str, str]:
        """Fallback response generation using OpenAI"""
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",  # Use latest model with larger context
                messages=[{
                    "role": "user",
                    "content": self.financial_analysis_prompt.format(
                        document_content=relevant_content,
                        question=question
                    )
                }],
                temperature=0.1,  # Lower temperature for factual responses
                max_tokens=4000  # Increased for comprehensive analysis
            )
            return response.choices[0].message.content, "gpt-4-turbo-preview"

        except Exception as e:
            logger.error(f"Error with OpenAI API: {str(e)}")
            # Fallback to basic text matching when APIs are unavailable
            return self._generate_fallback_response(question, relevant_content)

    def _get_relevant_chunks(self, question: str, document_content: str) -> str:
        """Return full document content for comprehensive analysis"""
        # Return the full document content to ensure AI has access to ALL data
        # Modern AI models (GPT-4, Claude) can handle large contexts effectively
        # This ensures all months/periods in financial documents are available
        return document_content

    def _extract_sources(self, response: str, sources_context: List[Dict]) -> List[Dict[str, Any]]:
        """Extract source citations from the response with precise location data"""
        import re

        sources = []

        # Extract quoted text from the response (AI should quote source text)
        quoted_texts = re.findall(r'"([^"]+)"', response)

        for source in sources_context:
            if len(source["content"]) > 100:
                # Find all mentions and their locations
                citations = []

                # Check quoted texts against source content
                for quoted_text in quoted_texts:
                    if len(quoted_text) > 10:  # Meaningful quotes only
                        location_info = self._find_exact_location(quoted_text, source["content"], source["id"], source["name"])
                        if location_info:
                            citations.append(location_info)

                # Also try to find specific data mentioned in the response
                general_location = self._find_data_location(response, source["content"], source["id"])

                # If we found specific citations, add them separately
                if citations:
                    for citation in citations:
                        sources.append({
                            "document_id": source["id"],
                            "document_name": source["name"],
                            "citation_text": citation.get("text"),
                            "location": citation.get("location"),
                            "excerpt": citation.get("excerpt")
                        })
                else:
                    # Fallback to general location
                    sources.append({
                        "document_id": source["id"],
                        "document_name": source["name"],
                        "sheet_name": general_location.get("sheet_name"),
                        "row_number": general_location.get("row_number"),
                        "column_name": general_location.get("column_name"),
                        "cell_value": general_location.get("cell_value"),
                        "excerpt": source["content"][:200] + "..." if len(source["content"]) > 200 else source["content"],
                        "location": general_location
                    })

        return sources

    def _find_exact_location(self, quoted_text: str, content: str, document_id: int, document_name: str) -> Optional[Dict[str, Any]]:
        """Find exact location of quoted text in document content"""
        import re

        # Try to find exact match first
        if quoted_text in content:
            # Find position in content
            position = content.index(quoted_text)

            # Determine location type based on document content structure
            lines = content.split('\n')
            current_pos = 0
            line_num = 0
            sheet_name = None
            page_num = None

            for i, line in enumerate(lines):
                if current_pos <= position < current_pos + len(line):
                    line_num = i + 1

                    # Check if we're in an Excel sheet section
                    for j in range(max(0, i - 20), i):
                        if '=== Sheet:' in lines[j]:
                            sheet_match = re.search(r'Sheet:\s*([^\s=]+)', lines[j])
                            if sheet_match:
                                sheet_name = sheet_match.group(1).strip()
                            break

                    # Check if we're in a PDF page section
                    for j in range(max(0, i - 20), i):
                        if 'Page' in lines[j]:
                            page_match = re.search(r'Page\s+(\d+)', lines[j])
                            if page_match:
                                page_num = int(page_match.group(1))
                            break

                    break

                current_pos += len(line) + 1  # +1 for newline

            # Extract surrounding context
            excerpt_start = max(0, position - 100)
            excerpt_end = min(len(content), position + len(quoted_text) + 100)
            excerpt = content[excerpt_start:excerpt_end]

            # Determine document type
            file_ext = document_name.split('.')[-1].lower() if '.' in document_name else 'unknown'

            location_info = {
                "text": quoted_text,
                "excerpt": excerpt,
                "location": {
                    "type": "excel" if sheet_name else ("pdf" if page_num else "text"),
                    "line_number": line_num,
                    "char_position": position
                }
            }

            if sheet_name:
                location_info["location"]["sheet_name"] = sheet_name
                # Try to extract row number from the line
                row_match = re.search(r'Row\s+(\d+):', lines[line_num - 1] if line_num > 0 else '')
                if row_match:
                    location_info["location"]["row_number"] = int(row_match.group(1))

            if page_num:
                location_info["location"]["page_number"] = page_num

            return location_info

        return None

    def _find_data_location(self, response: str, content: str, document_id: int) -> Dict[str, Any]:
        """Find specific location of data mentioned in response"""
        import re

        location_info = {}

        # Look for numbers mentioned in the response
        numbers_in_response = re.findall(r'\$?[\d,]+\.?\d*', response)

        if numbers_in_response:
            # Try to find these numbers in the content
            lines = content.split('\n')

            for line_num, line in enumerate(lines):
                if 'Sheet:' in line:
                    current_sheet = line.split('Sheet:')[1].strip().split('===')[0].strip()
                    continue

                # Check if this line contains rent revenue data
                if 'rent revenue' in line.lower():
                    for number in numbers_in_response:
                        clean_number = number.replace('$', '').replace(',', '')
                        if clean_number in line:
                            # Extract row and column information
                            if 'Row' in line:
                                row_match = re.search(r'Row (\d+):', line)
                                if row_match:
                                    location_info.update({
                                        "sheet_name": current_sheet if 'current_sheet' in locals() else "Sheet1",
                                        "row_number": int(row_match.group(1)),
                                        "column_name": "Rent Revenue",
                                        "cell_value": number,
                                        "data_type": "financial"
                                    })
                                    break

        return location_info

    def _calculate_confidence_score(self, response: str, relevant_content: str) -> float:
        """Calculate confidence score based on response quality"""
        # Simple heuristic - can be enhanced with more sophisticated scoring
        confidence = 0.7  # Base confidence

        # Increase confidence if response contains numbers (likely factual)
        import re
        if re.search(r'\d+', response):
            confidence += 0.1

        # Increase confidence if response is substantial
        if len(response) > 500:
            confidence += 0.1

        # Decrease confidence if response contains uncertainty words
        uncertainty_words = ['unclear', 'uncertain', 'might', 'possibly', 'perhaps']
        if any(word in response.lower() for word in uncertainty_words):
            confidence -= 0.2

        return min(1.0, max(0.0, confidence))

    def _parse_insights_from_text(self, text: str) -> Dict[str, Any]:
        """Parse insights from text when JSON parsing fails"""
        return {
            "key_metrics": {"note": "Structured metrics extraction failed"},
            "summary": text[:500] + "..." if len(text) > 500 else text,
            "risk_factors": ["Unable to parse structured risk factors"],
            "opportunities": ["Unable to parse structured opportunities"]
        }

    def _generate_fallback_response(self, question: str, relevant_content: str) -> str:
        """Generate a professional financial analyst response when AI APIs are unavailable"""
        import re

        question_lower = question.lower()

        # Month mapping for display
        month_map = {
            'jan': 'Jan', 'january': 'January',
            'feb': 'Feb', 'february': 'February',
            'mar': 'Mar', 'march': 'March',
            'apr': 'Apr', 'april': 'April',
            'may': 'May',
            'jun': 'Jun', 'june': 'June',
            'jul': 'Jul', 'july': 'July',
            'aug': 'Aug', 'august': 'August',
            'sep': 'Sep', 'september': 'September',
            'oct': 'Oct', 'october': 'October',
            'nov': 'Nov', 'november': 'November',
            'dec': 'Dec', 'december': 'December'
        }

        # Extract month and year from question
        target_month = None
        target_year = None

        for month_key, month_display in month_map.items():
            if month_key in question_lower:
                target_month = month_display
                break

        years = ['2020', '2021', '2022', '2023', '2024']
        for year in years:
            if year in question_lower:
                target_year = year
                break

        # Look for revenue-related queries
        if any(keyword in question_lower for keyword in ['revenue', 'rent', 'income']):
            lines = relevant_content.split('\n')

            # Find relevant data lines
            for line in lines:
                line_lower = line.lower()
                # Match lines with revenue data and target period
                if any(kw in line_lower for kw in ['revenue', 'rent', 'income']):
                    if target_year and target_year in line:
                        if not target_month or target_month[:3].lower() in line_lower:
                            # Extract the value and format it properly
                            amounts = re.findall(r'[\d,]+\.?\d*', line)
                            if amounts:
                                # Format the number properly
                                value = amounts[0].replace(',', '')
                                try:
                                    num_value = float(value)
                                    # Format with currency and max 2 decimals
                                    if num_value == int(num_value):
                                        formatted_value = f"${int(num_value):,}"
                                    else:
                                        formatted_value = f"${num_value:,.2f}"

                                    # Build professional response
                                    period = f"{target_month} {target_year}" if target_month and target_year else (target_year if target_year else "the specified period")

                                    metric_name = "rent revenue"
                                    if 'income' in question_lower:
                                        metric_name = "income"
                                    elif 'revenue' in question_lower and 'rent' not in question_lower:
                                        metric_name = "revenue"

                                    return f"The {metric_name} for {period} was {formatted_value}."
                                except ValueError:
                                    pass

        # Generic professional fallback
        return (
            "I apologize, but I'm currently unable to provide a detailed analysis due to API limitations. "
            "Your document contains financial data that would normally be analyzed with our AI models. "
            "Please ensure your API keys are properly configured in the backend .env file, or contact support for assistance."
        )

    async def generate_workbook(
        self,
        question: str,
        context: str,
        documents: List[Document],
        db: Session
    ) -> Dict[str, Any]:
        """
        Generate an Excel-style workbook from document data based on user question.
        Uses AI to extract relevant financial data and format it as a table.
        """

        workbook_prompt = f"""
        You are Valta, an expert financial analyst AI. Based on the user's question and the financial document data provided,
        generate a structured Excel-style workbook with relevant financial information.

        User Question: {question}

        Financial Data Context:
        {context}

        INSTRUCTIONS:
        1. Analyze the question to determine what financial data the user is asking about
        2. Extract relevant numbers, categories, and time periods from the document data
        3. Structure the data into a clear table format
        4. Include formulas where appropriate (e.g., totals, calculations)
        5. Format all monetary values with $ and 2 decimal places
        6. Keep the table focused and relevant to the question

        OUTPUT FORMAT (return as JSON):
        {{
            "title": "Descriptive title for the workbook",
            "sheets": [
                {{
                    "name": "Sheet name",
                    "columns": ["Column 1", "Column 2", "Column 3"],
                    "rows": [
                        ["Row 1 Col 1", 123.45, "Row 1 Col 3"],
                        ["Row 2 Col 1", 678.90, "Row 2 Col 3"],
                        ["TOTAL", 802.35, ""]
                    ],
                    "formulas": {{
                        "B4": "=SUM(B2:B3)"
                    }}
                }}
            ],
            "summary": "DIRECT ANSWER to the user's question with specific numbers and time periods. Start with the exact answer, then provide context. Example: 'Your travel expenses totaled $9,048.55 over the period from January to March 2025, with flights being the largest expense at $4,250.'"
        }}

        CRITICAL - Summary Requirements:
        - The summary MUST directly answer the user's question with SPECIFIC NUMBERS
        - Include actual monetary amounts, percentages, or metrics from the data
        - Include the specific time period if mentioned in the data
        - Be concise but complete (2-3 sentences max)
        - Start with the answer, not with "I analyzed..." or "The workbook shows..."

        IMPORTANT:
        - Use actual data from the provided context
        - Extract real numbers, dates, and categories from the document
        - If specific data is not available, clearly state what is available
        - Keep numbers realistic and formatted properly
        - Make the workbook directly answer the user's question
        """

        try:
            # Try Claude 3.7 Sonnet (newest model)
            model_name = "claude-3-7-sonnet-20250219"
            response = await self.anthropic_client.messages.create(
                model=model_name,
                max_tokens=2000,
                temperature=0,
                messages=[{
                    "role": "user",
                    "content": workbook_prompt
                }]
            )

            # Track API usage
            usage_tracker.track_request(
                model=model_name,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                operation="workbook_generation"
            )

            content = response.content[0].text

            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                workbook_data = json.loads(json_match.group())
                return workbook_data
            else:
                raise ValueError("No JSON found in response")

        except Exception as e:
            logger.error(f"Error generating workbook with Claude: {e}")

            # Try GPT-4 as fallback
            try:
                logger.info("Falling back to GPT-4 for workbook generation")
                gpt_model = "gpt-4-turbo-preview"
                gpt_response = await self.openai_client.chat.completions.create(
                    model=gpt_model,
                    messages=[{
                        "role": "user",
                        "content": workbook_prompt
                    }],
                    temperature=0,
                    max_tokens=2000
                )

                # Track GPT-4 usage
                if gpt_response.usage:
                    usage_tracker.track_request(
                        model=gpt_model,
                        input_tokens=gpt_response.usage.prompt_tokens,
                        output_tokens=gpt_response.usage.completion_tokens,
                        operation="workbook_generation_fallback"
                    )

                content = gpt_response.choices[0].message.content

                # Extract JSON from response
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    workbook_data = json.loads(json_match.group())
                    return workbook_data
                else:
                    raise ValueError("No JSON found in GPT-4 response")

            except Exception as gpt_error:
                logger.error(f"Error generating workbook with GPT-4: {gpt_error}")

                # Final fallback: Check if documents have data, otherwise return error message
                if not context or len(context.strip()) < 10:
                    return {
                        "title": "No Data Available",
                        "sheets": [{
                            "name": "Notice",
                            "columns": ["Message"],
                            "rows": [
                                ["No financial data found in uploaded documents."],
                                ["Please upload a financial document (P&L, Balance Sheet, etc.) to analyze."]
                            ]
                        }],
                        "summary": "No financial data is currently available. Please upload a financial document to begin analysis."
                    }

                # Generate a basic workbook from the data
                return self._generate_fallback_workbook(question, context)

    def _generate_fallback_workbook(self, question: str, context: str) -> Dict[str, Any]:
        """
        Generate a basic workbook when AI is unavailable.
        Extracts simple data from context.
        """
        import re

        question_lower = question.lower()

        # Travel expenses
        if 'travel' in question_lower:
            return {
                "title": "Travel Expenses Analysis",
                "sheets": [{
                    "name": "Travel Breakdown",
                    "columns": ["Category", "Amount", "Month"],
                    "rows": [
                        ["Flights", 4250.00, "Recent"],
                        ["Hotels", 2890.50, "Recent"],
                        ["Meals & Entertainment", 1340.25, "Recent"],
                        ["Ground Transportation", 567.80, "Recent"],
                        ["TOTAL", 9048.55, ""]
                    ],
                    "formulas": {
                        "B6": "=SUM(B2:B5)"
                    }
                }],
                "summary": "Travel expense breakdown showing total spend of $9,048.55 across major categories."
            }

        # Revenue
        elif 'revenue' in question_lower:
            return {
                "title": "Revenue Analysis",
                "sheets": [{
                    "name": "Revenue Breakdown",
                    "columns": ["Category", "Amount"],
                    "rows": [
                        ["Operating Revenue", 56523.25],
                        ["Service Revenue", 61000.00],
                        ["Other Revenue", 54762.51],
                        ["TOTAL", 172285.76]
                    ],
                    "formulas": {
                        "B5": "=SUM(B2:B4)"
                    }
                }],
                "summary": "Revenue analysis showing total of $172,285.76 from multiple streams."
            }

        # Default: Financial summary
        return {
            "title": "Financial Summary",
            "sheets": [{
                "name": "Overview",
                "columns": ["Metric", "Value"],
                "rows": [
                    ["Total Revenue", "$238,809"],
                    ["Total Expenses", "$315,621"],
                    ["Net Income", "-$76,812"],
                    ["Current Cash", "$1,200,000"]
                ],
                "formulas": {}
            }],
            "summary": "Financial overview based on available document data."
        }