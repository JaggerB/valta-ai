"""
AI-Powered Account Mapper for P&L Statements

Uses AI (Claude/GPT-4) to intelligently categorize account names into standard
P&L categories, with fuzzy matching fallback for uncertain classifications.
"""

import os
from typing import List, Dict, Tuple
from rapidfuzz import fuzz, process
import json


# Standard chart of accounts template
STANDARD_ACCOUNTS = {
    'Revenue': [
        'Sales Revenue', 'Service Revenue', 'Product Sales', 'Consulting Revenue',
        'Subscription Revenue', 'License Revenue', 'Other Income', 'Interest Income',
        'Rental Income', 'Commission Income'
    ],
    'Cost of Goods Sold': [
        'Cost of Sales', 'Cost of Goods Sold', 'Direct Materials', 'Direct Labor',
        'Manufacturing Costs', 'Inventory Costs', 'Shipping Costs', 'Product Costs',
        'Cost of Services'
    ],
    'Operating Expenses': [
        'Salaries & Wages', 'Rent', 'Marketing & Advertising', 'Utilities',
        'Depreciation', 'Professional Fees', 'Insurance', 'Office Supplies',
        'Travel & Entertainment', 'Software & Technology', 'Repairs & Maintenance',
        'Payroll Taxes', 'Employee Benefits', 'Training & Development',
        'Research & Development', 'Legal Fees', 'Accounting Fees', 'Consulting Fees',
        'Telecommunications', 'Postage & Delivery'
    ],
    'Financial Items': [
        'Interest Expense', 'Bank Charges', 'Foreign Exchange Gain', 'Foreign Exchange Loss',
        'Investment Income', 'Dividend Income'
    ],
    'Non-Operating Items': [
        'Gain on Sale of Assets', 'Loss on Sale of Assets', 'Impairment Loss',
        'Extraordinary Gains', 'Extraordinary Losses', 'Other Non-Operating Income',
        'Other Non-Operating Expense'
    ],
    'Tax': [
        'Income Tax Expense', 'Tax Provision', 'Deferred Tax', 'State Tax', 'Federal Tax'
    ]
}


class AccountMapper:
    """Map account names to standard P&L categories using AI and fuzzy matching"""

    def __init__(self, use_ai: bool = True, ai_provider: str = 'claude'):
        self.use_ai = use_ai
        self.ai_provider = ai_provider
        self._init_ai_client()

    def _init_ai_client(self):
        """Initialize AI client based on provider"""
        if not self.use_ai:
            self.ai_client = None
            return

        if self.ai_provider == 'claude':
            try:
                import anthropic
                api_key = os.getenv('ANTHROPIC_API_KEY', '')
                if api_key and len(api_key) > 20:
                    self.ai_client = anthropic.Anthropic(api_key=api_key)
                else:
                    self.ai_client = None
            except ImportError:
                self.ai_client = None
        else:  # openai
            try:
                import openai
                api_key = os.getenv('OPENAI_API_KEY', '')
                if api_key and len(api_key) > 20:
                    self.ai_client = openai.OpenAI(api_key=api_key)
                else:
                    self.ai_client = None
            except ImportError:
                self.ai_client = None

    def categorize_accounts(self, account_names: List[str]) -> Dict[str, Dict]:
        """
        Categorize list of account names

        Returns:
            Dict mapping account_name -> {
                'category': str,
                'subcategory': str,
                'confidence': float,
                'method': 'ai' | 'fuzzy'
            }
        """
        results = {}

        # Try AI first
        if self.ai_client:
            try:
                ai_results = self._ai_categorize(account_names)
                results.update(ai_results)
            except Exception as e:
                print(f"AI categorization failed: {e}")

        # Fill in missing with fuzzy matching
        for account_name in account_names:
            if account_name not in results or results[account_name]['confidence'] < 0.7:
                fuzzy_result = self._fuzzy_match(account_name)
                if account_name not in results or fuzzy_result['confidence'] > results[account_name]['confidence']:
                    results[account_name] = fuzzy_result

        return results

    def _ai_categorize(self, account_names: List[str]) -> Dict[str, Dict]:
        """Use AI to categorize accounts"""
        if self.ai_provider == 'claude':
            return self._claude_categorize(account_names)
        else:
            return self._openai_categorize(account_names)

    def _claude_categorize(self, account_names: List[str]) -> Dict[str, Dict]:
        """Use Claude to categorize accounts"""
        prompt = f"""You are a financial accounting expert. Categorize these account names from a P&L statement into standard categories.

Account Names:
{chr(10).join(f"- {name}" for name in account_names)}

Standard Categories:
- Revenue (Sales, Service Revenue, Other Income, etc.)
- Cost of Goods Sold (COGS, Direct Costs, Cost of Sales, etc.)
- Operating Expenses (SG&A, R&D, Marketing, Salaries, Rent, etc.)
- Financial Items (Interest Income/Expense, Bank Charges, FX Gain/Loss)
- Non-Operating Items (Gains/Losses on Asset Sales, Extraordinary Items)
- Tax (Income Tax, Tax Provision, etc.)

Return ONLY a JSON object mapping each account to its category and a more specific subcategory. Mark is_subtotal as true if the account name indicates it's a total/subtotal line.

Format:
{{
    "Account Name Here": {{
        "category": "Revenue",
        "subcategory": "Service Revenue",
        "is_subtotal": false,
        "confidence": 0.95
    }}
}}
"""

        message = self.ai_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Parse JSON response
        response_text = message.content[0].text

        # Extract JSON from response (might be wrapped in markdown)
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            ai_mapping = json.loads(json_match.group())
        else:
            ai_mapping = json.loads(response_text)

        # Convert to standard format
        results = {}
        for account_name, data in ai_mapping.items():
            results[account_name] = {
                'category': data.get('category', 'Unknown'),
                'subcategory': data.get('subcategory', ''),
                'is_subtotal': data.get('is_subtotal', False),
                'confidence': data.get('confidence', 0.9),
                'method': 'ai'
            }

        return results

    def _openai_categorize(self, account_names: List[str]) -> Dict[str, Dict]:
        """Use OpenAI to categorize accounts"""
        prompt = f"""You are a financial accounting expert. Categorize these account names from a P&L statement.

Account Names:
{chr(10).join(f"- {name}" for name in account_names)}

Standard Categories:
- Revenue
- Cost of Goods Sold
- Operating Expenses
- Financial Items
- Non-Operating Items
- Tax

Return a JSON object mapping each account name to its category, subcategory, whether it's a subtotal, and confidence score (0-1)."""

        response = self.ai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a financial statement analysis expert."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )

        ai_mapping = json.loads(response.choices[0].message.content)

        # Convert to standard format
        results = {}
        for account_name, data in ai_mapping.items():
            results[account_name] = {
                'category': data.get('category', 'Unknown'),
                'subcategory': data.get('subcategory', ''),
                'is_subtotal': data.get('is_subtotal', False),
                'confidence': data.get('confidence', 0.9),
                'method': 'ai'
            }

        return results

    def _fuzzy_match(self, account_name: str, threshold: int = 70) -> Dict:
        """
        Fuzzy match account name to standard chart of accounts

        Returns:
            Dict with category, subcategory, confidence, method
        """
        all_matches = []

        for category, accounts in STANDARD_ACCOUNTS.items():
            for std_account in accounts:
                score = fuzz.token_sort_ratio(account_name.lower(), std_account.lower())
                all_matches.append((category, std_account, score))

        # Get best match
        best_match = max(all_matches, key=lambda x: x[2])
        category, subcategory, score = best_match

        # Normalize score to 0-1 confidence
        confidence = score / 100.0

        if score >= threshold:
            return {
                'category': category,
                'subcategory': subcategory,
                'is_subtotal': False,
                'confidence': confidence,
                'method': 'fuzzy'
            }
        else:
            # Low confidence - return as uncategorized
            return {
                'category': 'Uncategorized',
                'subcategory': '',
                'is_subtotal': False,
                'confidence': confidence,
                'method': 'fuzzy'
            }

    def batch_categorize_dataframe(self, df, account_column: str) -> 'pd.DataFrame':
        """
        Categorize accounts in a DataFrame

        Adds columns: category, subcategory, is_subtotal, confidence, mapping_method
        """
        import pandas as pd

        # Get unique account names
        account_names = df[account_column].dropna().unique().tolist()

        # Categorize
        mappings = self.categorize_accounts(account_names)

        # Apply to dataframe
        df['category'] = df[account_column].map(lambda x: mappings.get(x, {}).get('category', 'Unknown'))
        df['subcategory'] = df[account_column].map(lambda x: mappings.get(x, {}).get('subcategory', ''))
        df['is_subtotal_mapped'] = df[account_column].map(lambda x: mappings.get(x, {}).get('is_subtotal', False))
        df['mapping_confidence'] = df[account_column].map(lambda x: mappings.get(x, {}).get('confidence', 0.0))
        df['mapping_method'] = df[account_column].map(lambda x: mappings.get(x, {}).get('method', 'none'))

        # Flag items needing review (low confidence)
        df['needs_review'] = df['mapping_confidence'] < 0.75

        return df


# Import re for regex in claude method
import re
