"""
P&L (Profit & Loss) Statement Parser

Intelligently parses financial P&L statements from Excel/CSV files with:
- Auto-detection of header rows and date columns
- Account categorization
- Subtotal identification and removal
- Numeric data cleaning
- Month-on-month variance calculations
"""

import pandas as pd
import re
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import openpyxl


class PLParser:
    """Parse and clean P&L statements from Excel/CSV files"""

    SUBTOTAL_KEYWORDS = [
        'total', 'subtotal', 'sum', 'gross profit', 'operating income',
        'ebitda', 'ebit', 'net income', 'net profit', 'net loss',
        'operating profit', 'profit before tax', 'earnings'
    ]

    SECTION_PATTERNS = {
        'revenue': r'(revenue|sales|income)(?!.*expense)',
        'cogs': r'(cost of (goods )?sold|cogs|cost of sales|direct cost)',
        'gross_profit': r'gross (profit|margin|income)',
        'operating_expenses': r'(operating expense|opex|sg&a|general and administrative)',
        'operating_income': r'(operating income|ebit[^d]|operating profit)',
        'other_income': r'(other income|non-operating|interest income)',
        'other_expense': r'(other expense|interest expense)',
        'pretax_income': r'(income before tax|pre-?tax income|ebt)',
        'tax': r'(income tax|tax expense|provision for tax)',
        'net_income': r'(net (income|profit|loss)|bottom line)',
    }

    def __init__(self):
        self.df = None
        self.metadata = {}

    def parse_file(self, file_path: str, user_hints: Optional[Dict] = None) -> Dict:
        """
        Main parsing pipeline

        Args:
            file_path: Path to Excel/CSV file
            user_hints: Optional dict with header_row, account_column, date_columns

        Returns:
            Dict with 'data' (DataFrame) and 'metadata' (parsing info)
        """
        # Step 1: Initial load
        if file_path.endswith('.csv'):
            self.df = pd.read_csv(file_path, header=None)
        else:
            self.df = pd.read_excel(file_path, header=None, engine='openpyxl')

        # Step 2: Detect header row
        header_row = user_hints.get('header_row') if user_hints else None
        if header_row is None:
            header_row = self._detect_header_row()

        self.metadata['header_row'] = header_row

        # Step 3: Re-read with correct header
        if file_path.endswith('.csv'):
            self.df = pd.read_csv(file_path, header=header_row, skiprows=range(header_row))
        else:
            self.df = pd.read_excel(file_path, header=header_row, skiprows=range(header_row), engine='openpyxl')

        # Step 4: Clean data
        self.df = self._remove_empty_rows_cols()

        # Step 5: Classify columns
        column_types = self._classify_columns(user_hints)
        self.metadata['columns'] = column_types

        # Step 6: Normalize date columns
        if column_types['dates']:
            for col in column_types['dates']:
                self.df[f'{col}_normalized'] = self._normalize_date_column(self.df[col])

        # Step 7: Clean numeric columns
        if column_types['values']:
            for col in column_types['values']:
                self.df[col] = self._clean_numeric_column(self.df[col])

        # Step 8: Detect subtotals and structure
        account_col = column_types['account']
        subtotal_rows = self._detect_subtotal_rows(account_col)
        sections = self._identify_sections(account_col)
        hierarchy = self._detect_hierarchy(account_col)

        self.metadata['subtotal_rows'] = subtotal_rows
        self.metadata['sections'] = sections
        self.metadata['hierarchy'] = hierarchy

        # Step 9: Separate line items from subtotals
        line_items_df = self.df[~self.df.index.isin(subtotal_rows)].copy()
        subtotals_df = self.df[self.df.index.isin(subtotal_rows)].copy()

        # Step 10: Add row classification
        self.df['row_type'] = 'line_item'
        self.df.loc[subtotal_rows, 'row_type'] = 'subtotal'

        # Step 11: Calculate month-on-month changes if we have date columns
        if column_types['dates'] and column_types['values']:
            self._calculate_mom_changes(column_types['values'])

        return {
            'data': self.df,
            'line_items': line_items_df,
            'subtotals': subtotals_df,
            'metadata': self.metadata
        }

    def _detect_header_row(self) -> int:
        """Detect header row by analyzing text density and keywords"""
        header_keywords = ['account', 'description', 'date', 'amount',
                          'debit', 'credit', 'balance', 'revenue', 'expense',
                          'jan', 'feb', 'mar', 'apr', 'may', 'jun',
                          'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

        best_row = 0
        best_score = 0

        for idx, row in self.df.head(15).iterrows():
            # Count text cells vs numeric cells
            text_count = sum(isinstance(val, str) for val in row)
            keyword_matches = sum(
                any(keyword in str(val).lower() for keyword in header_keywords)
                for val in row if pd.notna(val)
            )

            score = (text_count * 0.5) + (keyword_matches * 2)

            if score > best_score:
                best_score = score
                best_row = idx

        return int(best_row)

    def _remove_empty_rows_cols(self) -> pd.DataFrame:
        """Remove completely empty rows and columns"""
        df = self.df.dropna(how='all', axis=0)  # Remove empty rows
        df = df.dropna(how='all', axis=1)  # Remove empty columns
        return df.reset_index(drop=True)

    def _classify_columns(self, user_hints: Optional[Dict] = None) -> Dict:
        """Classify columns as account, date, value, or metadata"""
        if user_hints:
            return {
                'account': user_hints.get('account_column', self.df.columns[0]),
                'dates': user_hints.get('date_columns', []),
                'values': user_hints.get('value_columns', []),
                'metadata': []
            }

        column_types = {'account': None, 'dates': [], 'values': [], 'metadata': []}

        for col_idx, col_name in enumerate(self.df.columns):
            sample_data = self.df[col_name].dropna().head(20)

            if len(sample_data) == 0:
                continue

            # Check if mostly text (account column)
            if sample_data.dtype == 'object':
                # First text column is usually account
                if column_types['account'] is None:
                    column_types['account'] = col_name
                else:
                    # Check if it looks like dates
                    if self._looks_like_dates(sample_data):
                        column_types['dates'].append(col_name)
                    else:
                        column_types['metadata'].append(col_name)

            # Check if dates
            elif pd.api.types.is_datetime64_any_dtype(sample_data):
                column_types['dates'].append(col_name)

            # Check if numeric (values)
            elif pd.api.types.is_numeric_dtype(sample_data):
                # Skip if column has >80% empty values
                non_null_pct = self.df[col_name].notna().sum() / len(self.df)
                if non_null_pct > 0.2:
                    column_types['values'].append(col_name)

        # If no account column found, use first column
        if column_types['account'] is None:
            column_types['account'] = self.df.columns[0]

        return column_types

    def _looks_like_dates(self, series: pd.Series) -> bool:
        """Check if a series looks like it contains dates"""
        date_patterns = [
            r'\d{4}-\d{2}', r'\d{2}/\d{4}', r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)',
            r'\d{1,2}/\d{1,2}/\d{2,4}'
        ]

        # Check first few values
        for val in series.head(5):
            val_str = str(val).lower()
            if any(re.search(pattern, val_str) for pattern in date_patterns):
                return True

        return False

    def _normalize_date_column(self, col: pd.Series) -> pd.Series:
        """Convert various date formats to YYYY-MM format"""
        def parse_date(val):
            if pd.isna(val):
                return None

            # Try pandas automatic parsing first
            try:
                dt = pd.to_datetime(val, errors='coerce')
                if pd.notna(dt):
                    return dt.strftime('%Y-%m')
            except:
                pass

            # Handle text formats like "Jan 2024" or "January 2024"
            val_str = str(val)

            # Try "MMM YYYY" format
            for fmt in ['%b %Y', '%B %Y', '%b-%Y', '%B-%Y']:
                try:
                    dt = datetime.strptime(val_str, fmt)
                    return dt.strftime('%Y-%m')
                except:
                    pass

            # Try to extract YYYY-MM pattern
            match = re.search(r'(\d{4})-(\d{2})', val_str)
            if match:
                return f"{match.group(1)}-{match.group(2)}"

            return None

        return col.apply(parse_date)

    def _clean_numeric_column(self, col: pd.Series) -> pd.Series:
        """Clean numeric values (remove currency symbols, handle negatives)"""
        def clean_value(val):
            if pd.isna(val):
                return None

            # Already a number
            if isinstance(val, (int, float)):
                return float(val)

            # Convert to string and clean
            val_str = str(val)

            # Remove currency symbols, commas, spaces
            val_str = re.sub(r'[$€£¥,\s]', '', val_str)

            # Handle parentheses as negative (accounting format)
            if '(' in val_str and ')' in val_str:
                val_str = '-' + val_str.replace('(', '').replace(')', '')

            # Convert to float
            try:
                return float(val_str)
            except ValueError:
                return None

        return col.apply(clean_value)

    def _detect_subtotal_rows(self, account_col: str) -> List[int]:
        """Identify rows that are subtotals based on keywords"""
        subtotal_rows = []

        for idx, row in self.df.iterrows():
            account_name = str(row[account_col]).lower()

            # Check for subtotal keywords
            if any(keyword in account_name for keyword in self.SUBTOTAL_KEYWORDS):
                subtotal_rows.append(idx)

        return subtotal_rows

    def _identify_sections(self, account_col: str) -> Dict[str, List[int]]:
        """Identify major P&L sections using pattern matching"""
        sections = {key: [] for key in self.SECTION_PATTERNS.keys()}

        for idx, row in self.df.iterrows():
            account_name = str(row[account_col]).lower()

            for section, pattern in self.SECTION_PATTERNS.items():
                if re.search(pattern, account_name, re.IGNORECASE):
                    sections[section].append(idx)

        return sections

    def _detect_hierarchy(self, account_col: str) -> List[Tuple[int, int, str]]:
        """Detect parent-child relationships from indentation"""
        hierarchy = []

        for idx, row in self.df.iterrows():
            account_name = str(row[account_col])

            # Count leading spaces
            indent_level = len(account_name) - len(account_name.lstrip())
            clean_name = account_name.strip()

            # Convert spaces to hierarchy level
            level = indent_level // 2  # 2 spaces = 1 level

            hierarchy.append((int(idx), level, clean_name))

        return hierarchy

    def _calculate_mom_changes(self, value_cols: List[str]):
        """Calculate month-on-month percentage and dollar changes"""
        for col_idx, col in enumerate(value_cols):
            if col_idx > 0:
                prev_col = value_cols[col_idx - 1]

                # Dollar change
                self.df[f'{col}_mom_change'] = self.df[col] - self.df[prev_col]

                # Percentage change
                self.df[f'{col}_mom_pct'] = (
                    (self.df[col] - self.df[prev_col]) / self.df[prev_col].abs() * 100
                ).replace([float('inf'), float('-inf')], None)
