"""
Waterfall Calculator for Period-over-Period P&L Analysis

Generates waterfall bridge chart data showing how a metric changed
from one period to another, driven by individual account movements.
"""

import pandas as pd
from typing import List, Dict, Tuple, Optional
from datetime import datetime


class WaterfallCalculator:
    """Calculate waterfall bridge data for period comparisons"""

    def __init__(self, df: pd.DataFrame, account_col: str, category_col: str = 'category'):
        """
        Initialize calculator

        Args:
            df: DataFrame with P&L data
            account_col: Name of account column
            category_col: Name of category column (from mapping)
        """
        self.df = df
        self.account_col = account_col
        self.category_col = category_col

    def calculate_waterfall(
        self,
        metric: str,
        period1_cols: List[str],
        period2_cols: List[str],
        top_n: int = 5,
        metric_filter: Optional[str] = None
    ) -> Dict:
        """
        Calculate waterfall bridge data

        Args:
            metric: Metric name (e.g., 'Total Revenue', 'Gross Profit')
            period1_cols: List of column names for period 1
            period2_cols: List of column names for period 2
            top_n: Number of top drivers to show
            metric_filter: Category filter (e.g., 'Revenue', 'Operating Expenses')

        Returns:
            Dict with waterfall chart data
        """
        # Filter data based on metric
        if metric_filter:
            df_filtered = self.df[self.df[self.category_col] == metric_filter].copy()
        else:
            # If no filter, use all line items (exclude subtotals)
            df_filtered = self.df[self.df.get('row_type', 'line_item') == 'line_item'].copy()

        # Calculate period totals for each account
        df_filtered['period1_total'] = df_filtered[period1_cols].sum(axis=1)
        df_filtered['period2_total'] = df_filtered[period2_cols].sum(axis=1)
        df_filtered['movement'] = df_filtered['period2_total'] - df_filtered['period1_total']

        # Get total for each period
        period1_value = df_filtered['period1_total'].sum()
        period2_value = df_filtered['period2_total'].sum()
        total_movement = period2_value - period1_value

        # Identify top N drivers by absolute movement
        df_filtered['abs_movement'] = df_filtered['movement'].abs()
        top_drivers = df_filtered.nlargest(top_n, 'abs_movement')

        # Calculate "Other" as sum of remaining accounts
        other_accounts = df_filtered[~df_filtered.index.isin(top_drivers.index)]
        other_movement = other_accounts['movement'].sum()

        # Build waterfall data structure
        categories = []
        values = []
        colors = []
        measures = []  # For Plotly: 'absolute', 'relative', 'total'

        # Starting bar (Period 1)
        categories.append(f'Period 1')
        values.append(period1_value)
        colors.append('#3b82f6')  # Blue
        measures.append('absolute')

        # Individual driver bars
        for idx, row in top_drivers.iterrows():
            account_name = row[self.account_col]
            movement = row['movement']

            # Truncate long names
            display_name = account_name[:30] + '...' if len(account_name) > 30 else account_name

            categories.append(display_name)
            values.append(movement)

            # Color based on positive/negative
            if movement > 0:
                colors.append('#10b981')  # Green
            else:
                colors.append('#ef4444')  # Red

            measures.append('relative')

        # "Other" bar
        if abs(other_movement) > 0.01:  # Only show if non-zero
            categories.append('Other')
            values.append(other_movement)

            if other_movement > 0:
                colors.append('#10b981')  # Green
            else:
                colors.append('#ef4444')  # Red

            measures.append('relative')

        # Ending bar (Period 2)
        categories.append(f'Period 2')
        values.append(period2_value)
        colors.append('#3b82f6')  # Blue
        measures.append('total')

        # Calculate y-axis min (80% of period 1 for better visualization)
        y_min = period1_value * 0.8 if period1_value > 0 else period1_value * 1.2

        return {
            'categories': categories,
            'values': values,
            'colors': colors,
            'measures': measures,
            'period1_value': round(period1_value, 2),
            'period2_value': round(period2_value, 2),
            'total_movement': round(total_movement, 2),
            'total_movement_pct': round((total_movement / period1_value * 100), 2) if period1_value != 0 else 0,
            'y_min': round(y_min, 2),
            'top_drivers_count': len(top_drivers),
            'other_movement': round(other_movement, 2)
        }

    def get_available_periods(self, date_suffix: str = '_normalized') -> List[str]:
        """
        Get list of available periods from date columns

        Args:
            date_suffix: Suffix for normalized date columns

        Returns:
            List of period strings in YYYY-MM format
        """
        periods = []

        # Find all normalized date columns
        date_cols = [col for col in self.df.columns if col.endswith(date_suffix)]

        # Get unique period values
        for col in date_cols:
            unique_periods = self.df[col].dropna().unique()
            periods.extend(unique_periods)

        # Remove duplicates and sort
        periods = sorted(list(set(periods)))

        return periods

    def suggest_period_ranges(self, periods: List[str]) -> Dict[str, List[str]]:
        """
        Suggest default period ranges for comparison

        Returns:
            Dict with 'period1' and 'period2' as lists of period strings
        """
        if len(periods) < 2:
            return {'period1': [], 'period2': []}

        # Default: compare latest 12 months vs previous 12 months
        # Or if < 24 months, split in half

        if len(periods) >= 24:
            period2 = periods[-12:]  # Latest 12 months
            period1 = periods[-24:-12]  # Previous 12 months
        else:
            # Split in half
            mid = len(periods) // 2
            period1 = periods[:mid]
            period2 = periods[mid:]

        return {
            'period1': period1,
            'period2': period2
        }

    def get_metric_options(self) -> List[Dict[str, str]]:
        """
        Get list of available metrics based on categories in data

        Returns:
            List of dicts with 'label', 'value', 'category'
        """
        metrics = []

        # Standard calculated metrics
        if 'Revenue' in self.df[self.category_col].values:
            metrics.append({
                'label': 'Total Revenue',
                'value': 'revenue',
                'category': 'Revenue'
            })

        if 'Cost of Goods Sold' in self.df[self.category_col].values:
            metrics.append({
                'label': 'Cost of Goods Sold',
                'value': 'cogs',
                'category': 'Cost of Goods Sold'
            })

            # Gross Profit if we have both revenue and COGS
            if 'Revenue' in self.df[self.category_col].values:
                metrics.append({
                    'label': 'Gross Profit',
                    'value': 'gross_profit',
                    'category': None  # Calculated
                })

        if 'Operating Expenses' in self.df[self.category_col].values:
            metrics.append({
                'label': 'Operating Expenses',
                'value': 'opex',
                'category': 'Operating Expenses'
            })

            # Operating Profit if we have revenue, COGS, and opex
            if 'Revenue' in self.df[self.category_col].values and 'Cost of Goods Sold' in self.df[self.category_col].values:
                metrics.append({
                    'label': 'Operating Profit (EBIT)',
                    'value': 'operating_profit',
                    'category': None  # Calculated
                })

        # Net Income (if we have all components)
        if all(cat in self.df[self.category_col].values for cat in ['Revenue', 'Cost of Goods Sold', 'Operating Expenses']):
            metrics.append({
                'label': 'Net Profit',
                'value': 'net_profit',
                'category': None  # Calculated
            })

        return metrics

    def calculate_derived_metric(
        self,
        metric: str,
        period1_cols: List[str],
        period2_cols: List[str],
        top_n: int = 5
    ) -> Dict:
        """
        Calculate waterfall for derived metrics (Gross Profit, Operating Profit, Net Profit)

        These require combining multiple categories with proper signs
        """
        if metric == 'gross_profit':
            # Gross Profit = Revenue - COGS
            return self._calculate_gross_profit_waterfall(period1_cols, period2_cols, top_n)

        elif metric == 'operating_profit':
            # Operating Profit = Gross Profit - Operating Expenses
            return self._calculate_operating_profit_waterfall(period1_cols, period2_cols, top_n)

        elif metric == 'net_profit':
            # Net Profit = Operating Profit - Non-Operating - Tax
            return self._calculate_net_profit_waterfall(period1_cols, period2_cols, top_n)

        else:
            raise ValueError(f"Unknown derived metric: {metric}")

    def _calculate_gross_profit_waterfall(self, period1_cols: List[str], period2_cols: List[str], top_n: int) -> Dict:
        """Calculate waterfall for Gross Profit = Revenue - COGS"""

        # Get revenue and COGS data
        revenue_df = self.df[self.df[self.category_col] == 'Revenue'].copy()
        cogs_df = self.df[self.df[self.category_col] == 'Cost of Goods Sold'].copy()

        # Calculate period totals
        revenue_df['period1_total'] = revenue_df[period1_cols].sum(axis=1)
        revenue_df['period2_total'] = revenue_df[period2_cols].sum(axis=1)
        revenue_df['movement'] = revenue_df['period2_total'] - revenue_df['period1_total']

        cogs_df['period1_total'] = cogs_df[period1_cols].sum(axis=1)
        cogs_df['period2_total'] = cogs_df[period2_cols].sum(axis=1)
        cogs_df['movement'] = cogs_df['period2_total'] - cogs_df['period1_total']

        # Gross profit = Revenue - COGS
        period1_gp = revenue_df['period1_total'].sum() - cogs_df['period1_total'].sum()
        period2_gp = revenue_df['period2_total'].sum() - cogs_df['period2_total'].sum()

        # Combine dataframes with proper signs
        revenue_df['impact_on_gp'] = revenue_df['movement']  # Positive revenue increases GP
        cogs_df['impact_on_gp'] = -cogs_df['movement']  # Positive COGS decreases GP

        all_drivers = pd.concat([revenue_df, cogs_df])
        all_drivers['abs_impact'] = all_drivers['impact_on_gp'].abs()

        # Top drivers
        top_drivers = all_drivers.nlargest(top_n, 'abs_impact')
        other_movement = all_drivers[~all_drivers.index.isin(top_drivers.index)]['impact_on_gp'].sum()

        # Build waterfall
        return self._build_waterfall_structure(
            period1_gp,
            period2_gp,
            top_drivers,
            other_movement,
            'Gross Profit'
        )

    def _calculate_operating_profit_waterfall(self, period1_cols: List[str], period2_cols: List[str], top_n: int) -> Dict:
        """Calculate waterfall for Operating Profit = Revenue - COGS - OpEx"""

        revenue_df = self.df[self.df[self.category_col] == 'Revenue'].copy()
        cogs_df = self.df[self.df[self.category_col] == 'Cost of Goods Sold'].copy()
        opex_df = self.df[self.df[self.category_col] == 'Operating Expenses'].copy()

        # Calculate totals for each category
        for df in [revenue_df, cogs_df, opex_df]:
            df['period1_total'] = df[period1_cols].sum(axis=1)
            df['period2_total'] = df[period2_cols].sum(axis=1)
            df['movement'] = df['period2_total'] - df['period1_total']

        # Operating profit calculation
        period1_op = revenue_df['period1_total'].sum() - cogs_df['period1_total'].sum() - opex_df['period1_total'].sum()
        period2_op = revenue_df['period2_total'].sum() - cogs_df['period2_total'].sum() - opex_df['period2_total'].sum()

        # Impact on operating profit
        revenue_df['impact_on_op'] = revenue_df['movement']
        cogs_df['impact_on_op'] = -cogs_df['movement']
        opex_df['impact_on_op'] = -opex_df['movement']

        all_drivers = pd.concat([revenue_df, cogs_df, opex_df])
        all_drivers['abs_impact'] = all_drivers['impact_on_op'].abs()

        top_drivers = all_drivers.nlargest(top_n, 'abs_impact')
        other_movement = all_drivers[~all_drivers.index.isin(top_drivers.index)]['impact_on_op'].sum()

        return self._build_waterfall_structure(
            period1_op,
            period2_op,
            top_drivers,
            other_movement,
            'Operating Profit'
        )

    def _calculate_net_profit_waterfall(self, period1_cols: List[str], period2_cols: List[str], top_n: int) -> Dict:
        """Calculate waterfall for Net Profit (all categories)"""

        # Get all categories
        revenue_df = self.df[self.df[self.category_col] == 'Revenue'].copy()
        cogs_df = self.df[self.df[self.category_col] == 'Cost of Goods Sold'].copy()
        opex_df = self.df[self.df[self.category_col] == 'Operating Expenses'].copy()
        financial_df = self.df[self.df[self.category_col] == 'Financial Items'].copy()
        nonop_df = self.df[self.df[self.category_col] == 'Non-Operating Items'].copy()
        tax_df = self.df[self.df[self.category_col] == 'Tax'].copy()

        all_dfs = []

        for df, sign in [
            (revenue_df, 1),
            (cogs_df, -1),
            (opex_df, -1),
            (financial_df, 1),  # Can be positive or negative
            (nonop_df, 1),  # Can be positive or negative
            (tax_df, -1)
        ]:
            if len(df) > 0:
                df['period1_total'] = df[period1_cols].sum(axis=1)
                df['period2_total'] = df[period2_cols].sum(axis=1)
                df['movement'] = df['period2_total'] - df['period1_total']
                df['impact_on_np'] = df['movement'] * sign
                all_dfs.append(df)

        # Combine all
        all_drivers = pd.concat(all_dfs) if all_dfs else pd.DataFrame()

        # Calculate net profit
        period1_np = sum(df['period1_total'].sum() * sign for df, sign in [
            (revenue_df, 1), (cogs_df, -1), (opex_df, -1),
            (financial_df, 1), (nonop_df, 1), (tax_df, -1)
        ] if len(df) > 0)

        period2_np = sum(df['period2_total'].sum() * sign for df, sign in [
            (revenue_df, 1), (cogs_df, -1), (opex_df, -1),
            (financial_df, 1), (nonop_df, 1), (tax_df, -1)
        ] if len(df) > 0)

        all_drivers['abs_impact'] = all_drivers['impact_on_np'].abs()
        top_drivers = all_drivers.nlargest(top_n, 'abs_impact')
        other_movement = all_drivers[~all_drivers.index.isin(top_drivers.index)]['impact_on_np'].sum()

        return self._build_waterfall_structure(
            period1_np,
            period2_np,
            top_drivers,
            other_movement,
            'Net Profit'
        )

    def _build_waterfall_structure(
        self,
        period1_value: float,
        period2_value: float,
        top_drivers: pd.DataFrame,
        other_movement: float,
        metric_name: str
    ) -> Dict:
        """Build standardized waterfall data structure"""

        categories = []
        values = []
        colors = []
        measures = []

        # Period 1
        categories.append(f'{metric_name}\nPeriod 1')
        values.append(period1_value)
        colors.append('#3b82f6')
        measures.append('absolute')

        # Drivers
        impact_col = [col for col in top_drivers.columns if col.startswith('impact_on')][0]

        for idx, row in top_drivers.iterrows():
            account_name = row[self.account_col]
            impact = row[impact_col]

            display_name = account_name[:30] + '...' if len(account_name) > 30 else account_name

            categories.append(display_name)
            values.append(impact)
            colors.append('#10b981' if impact > 0 else '#ef4444')
            measures.append('relative')

        # Other
        if abs(other_movement) > 0.01:
            categories.append('Other')
            values.append(other_movement)
            colors.append('#10b981' if other_movement > 0 else '#ef4444')
            measures.append('relative')

        # Period 2
        categories.append(f'{metric_name}\nPeriod 2')
        values.append(period2_value)
        colors.append('#3b82f6')
        measures.append('total')

        total_movement = period2_value - period1_value
        y_min = period1_value * 0.8 if period1_value > 0 else period1_value * 1.2

        return {
            'categories': categories,
            'values': values,
            'colors': colors,
            'measures': measures,
            'period1_value': round(period1_value, 2),
            'period2_value': round(period2_value, 2),
            'total_movement': round(total_movement, 2),
            'total_movement_pct': round((total_movement / period1_value * 100), 2) if period1_value != 0 else 0,
            'y_min': round(y_min, 2),
            'top_drivers_count': len(top_drivers),
            'other_movement': round(other_movement, 2)
        }
