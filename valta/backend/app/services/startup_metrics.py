"""
Startup Metrics Calculator

Calculates startup-specific financial metrics from P&L data:
- Burn rate (gross and net)
- Runway (months remaining)
- Growth metrics (MoM, QoQ)
- Cash efficiency ratios
- Expense drivers and anomalies
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


class StartupMetricsCalculator:
    """Calculate startup financial metrics from parsed P&L data"""

    def __init__(self, df: pd.DataFrame, metadata: Dict):
        """
        Initialize calculator with P&L data

        Args:
            df: Parsed P&L DataFrame with line items
            metadata: Metadata from parser including column classifications
        """
        self.df = df
        self.metadata = metadata
        self.value_columns = metadata.get('columns', {}).get('values', [])
        self.account_column = metadata.get('columns', {}).get('account')

    def calculate_all_metrics(self, cash_balance: Optional[float] = None) -> Dict:
        """
        Calculate all startup metrics

        Args:
            cash_balance: Current cash balance (if known)

        Returns:
            Dict with all calculated metrics
        """
        metrics = {}

        # Revenue and expense aggregates
        aggregates = self._calculate_aggregates()
        metrics['aggregates'] = aggregates

        # Burn rate calculations
        burn = self._calculate_burn_rate(aggregates)
        metrics['burn_rate'] = burn

        # Runway calculations (if cash balance provided)
        if cash_balance is not None and burn.get('net_burn_avg'):
            runway = self._calculate_runway(cash_balance, burn['net_burn_avg'])
            metrics['runway'] = runway
        else:
            metrics['runway'] = None

        # Growth metrics
        growth = self._calculate_growth_metrics(aggregates)
        metrics['growth'] = growth

        # Expense drivers
        drivers = self._identify_expense_drivers()
        metrics['expense_drivers'] = drivers

        # Cash efficiency (if we have revenue)
        if aggregates.get('revenue_by_period'):
            efficiency = self._calculate_cash_efficiency(aggregates, burn)
            metrics['efficiency'] = efficiency
        else:
            metrics['efficiency'] = None

        # Key insights
        insights = self._generate_key_insights(metrics)
        metrics['insights'] = insights

        return metrics

    def _calculate_aggregates(self) -> Dict:
        """Calculate revenue and expense totals for each period"""
        if not self.value_columns:
            return {}

        aggregates = {
            'revenue_by_period': {},
            'expenses_by_period': {},
            'net_income_by_period': {},
            'periods': sorted(self.value_columns)
        }

        for period in self.value_columns:
            revenue = 0
            expenses = 0

            for idx, row in self.df.iterrows():
                account = str(row[self.account_column]).lower()
                value = row[period]

                if pd.isna(value):
                    continue

                value = float(value)

                # Classify as revenue or expense
                if self._is_revenue_account(account):
                    revenue += abs(value)
                elif self._is_expense_account(account):
                    expenses += abs(value)

            aggregates['revenue_by_period'][period] = revenue
            aggregates['expenses_by_period'][period] = expenses
            aggregates['net_income_by_period'][period] = revenue - expenses

        return aggregates

    def _is_revenue_account(self, account: str) -> bool:
        """Check if account name indicates revenue"""
        revenue_keywords = [
            'revenue', 'sales', 'income', 'subscription', 'recurring',
            'arr', 'mrr', 'services revenue'
        ]

        # Exclude expense-related terms
        exclude_keywords = ['expense', 'cost', 'cogs']

        account_lower = account.lower()
        has_revenue = any(kw in account_lower for kw in revenue_keywords)
        has_exclude = any(kw in account_lower for kw in exclude_keywords)

        return has_revenue and not has_exclude

    def _is_expense_account(self, account: str) -> bool:
        """Check if account name indicates expense"""
        expense_keywords = [
            'expense', 'cost', 'salaries', 'wages', 'payroll', 'marketing',
            'advertising', 'rent', 'software', 'consulting', 'fees',
            'depreciation', 'amortization', 'interest', 'tax', 'utilities',
            'travel', 'insurance', 'benefits', 'hosting', 'cloud', 'aws',
            'engineering', 'r&d', 'research', 'development'
        ]

        account_lower = account.lower()
        return any(kw in account_lower for kw in expense_keywords)

    def _calculate_burn_rate(self, aggregates: Dict) -> Dict:
        """Calculate burn rate metrics"""
        burn_metrics = {}

        expenses = list(aggregates.get('expenses_by_period', {}).values())
        revenues = list(aggregates.get('revenue_by_period', {}).values())
        net_income = list(aggregates.get('net_income_by_period', {}).values())

        if not expenses:
            return burn_metrics

        # Gross burn (total expenses)
        burn_metrics['gross_burn_by_period'] = aggregates['expenses_by_period']
        burn_metrics['gross_burn_avg'] = np.mean(expenses) if expenses else 0
        burn_metrics['gross_burn_latest'] = expenses[-1] if expenses else 0

        # Net burn (expenses - revenue)
        net_burns = [expenses[i] - revenues[i] for i in range(len(expenses))]
        burn_metrics['net_burn_by_period'] = dict(zip(
            aggregates.get('periods', []),
            net_burns
        ))
        burn_metrics['net_burn_avg'] = np.mean(net_burns) if net_burns else 0
        burn_metrics['net_burn_latest'] = net_burns[-1] if net_burns else 0

        # Burn rate trend
        if len(net_burns) >= 3:
            recent_avg = np.mean(net_burns[-3:])
            earlier_avg = np.mean(net_burns[:-3]) if len(net_burns) > 3 else net_burns[0]

            if earlier_avg != 0:
                burn_metrics['burn_rate_trend'] = ((recent_avg - earlier_avg) / abs(earlier_avg)) * 100
            else:
                burn_metrics['burn_rate_trend'] = 0

            burn_metrics['burn_rate_trend_direction'] = (
                'increasing' if recent_avg > earlier_avg else 'decreasing'
            )
        else:
            burn_metrics['burn_rate_trend'] = 0
            burn_metrics['burn_rate_trend_direction'] = 'stable'

        return burn_metrics

    def _calculate_runway(self, cash_balance: float, avg_net_burn: float) -> Dict:
        """
        Calculate runway metrics

        Args:
            cash_balance: Current cash on hand
            avg_net_burn: Average monthly net burn rate

        Returns:
            Dict with runway calculations
        """
        runway_metrics = {}

        if avg_net_burn <= 0:
            # Company is profitable or break-even
            runway_metrics['months_remaining'] = float('inf')
            runway_metrics['zero_cash_date'] = None
            runway_metrics['status'] = 'profitable'
            runway_metrics['urgency'] = 'none'
        else:
            months_remaining = cash_balance / avg_net_burn
            runway_metrics['months_remaining'] = round(months_remaining, 1)

            # Estimate zero cash date
            today = datetime.now()
            zero_date = today + relativedelta(months=int(months_remaining))
            runway_metrics['zero_cash_date'] = zero_date.strftime('%Y-%m-%d')

            # Classify urgency
            if months_remaining < 6:
                runway_metrics['status'] = 'critical'
                runway_metrics['urgency'] = 'high'
            elif months_remaining < 12:
                runway_metrics['status'] = 'concerning'
                runway_metrics['urgency'] = 'medium'
            elif months_remaining < 18:
                runway_metrics['status'] = 'comfortable'
                runway_metrics['urgency'] = 'low'
            else:
                runway_metrics['status'] = 'strong'
                runway_metrics['urgency'] = 'none'

        runway_metrics['cash_balance'] = cash_balance

        return runway_metrics

    def _calculate_growth_metrics(self, aggregates: Dict) -> Dict:
        """Calculate growth rates"""
        growth_metrics = {}

        revenues = list(aggregates.get('revenue_by_period', {}).values())
        periods = aggregates.get('periods', [])

        if len(revenues) < 2:
            return growth_metrics

        # Month-over-month growth rates
        mom_growth = []
        for i in range(1, len(revenues)):
            if revenues[i-1] != 0:
                growth_pct = ((revenues[i] - revenues[i-1]) / abs(revenues[i-1])) * 100
                mom_growth.append(growth_pct)
            else:
                mom_growth.append(0)

        growth_metrics['mom_growth_by_period'] = dict(zip(periods[1:], mom_growth))
        growth_metrics['mom_growth_avg'] = np.mean(mom_growth) if mom_growth else 0
        growth_metrics['mom_growth_latest'] = mom_growth[-1] if mom_growth else 0

        # Overall growth (first to last period)
        if revenues[0] != 0:
            overall_growth = ((revenues[-1] - revenues[0]) / abs(revenues[0])) * 100
            growth_metrics['overall_growth'] = overall_growth
        else:
            growth_metrics['overall_growth'] = 0

        # Compound monthly growth rate (CMGR)
        if len(revenues) >= 3 and revenues[0] > 0:
            n_periods = len(revenues) - 1
            cmgr = (((revenues[-1] / revenues[0]) ** (1/n_periods)) - 1) * 100
            growth_metrics['cmgr'] = cmgr
        else:
            growth_metrics['cmgr'] = 0

        # Growth trend
        if len(mom_growth) >= 3:
            recent_growth = np.mean(mom_growth[-3:])
            growth_metrics['growth_trend'] = 'accelerating' if recent_growth > growth_metrics['mom_growth_avg'] else 'decelerating'
        else:
            growth_metrics['growth_trend'] = 'stable'

        return growth_metrics

    def _identify_expense_drivers(self) -> Dict:
        """Identify top expense categories and their changes"""
        drivers = {
            'top_expenses': [],
            'fastest_growing': [],
            'largest_increases': []
        }

        if len(self.value_columns) < 2:
            return drivers

        # Get latest period and compare to previous
        latest_period = self.value_columns[-1]
        prev_period = self.value_columns[-2]

        expense_data = []

        for idx, row in self.df.iterrows():
            account = str(row[self.account_column])

            if not self._is_expense_account(account.lower()):
                continue

            latest_val = row[latest_period]
            prev_val = row[prev_period]

            if pd.isna(latest_val):
                latest_val = 0
            if pd.isna(prev_val):
                prev_val = 0

            latest_val = abs(float(latest_val))
            prev_val = abs(float(prev_val))

            change = latest_val - prev_val
            change_pct = ((change) / prev_val * 100) if prev_val != 0 else 0

            expense_data.append({
                'account': account,
                'latest_amount': latest_val,
                'previous_amount': prev_val,
                'change_dollar': change,
                'change_percent': change_pct
            })

        # Sort by latest amount for top expenses
        top_by_amount = sorted(expense_data, key=lambda x: x['latest_amount'], reverse=True)[:5]
        drivers['top_expenses'] = top_by_amount

        # Sort by percentage change for fastest growing
        fastest = sorted(
            [e for e in expense_data if e['change_percent'] > 5],
            key=lambda x: x['change_percent'],
            reverse=True
        )[:5]
        drivers['fastest_growing'] = fastest

        # Sort by dollar change for largest increases
        largest = sorted(
            [e for e in expense_data if e['change_dollar'] > 0],
            key=lambda x: x['change_dollar'],
            reverse=True
        )[:5]
        drivers['largest_increases'] = largest

        return drivers

    def _calculate_cash_efficiency(self, aggregates: Dict, burn: Dict) -> Dict:
        """Calculate cash efficiency metrics"""
        efficiency = {}

        latest_revenue = list(aggregates.get('revenue_by_period', {}).values())[-1] if aggregates.get('revenue_by_period') else 0
        avg_burn = burn.get('net_burn_avg', 0)

        if avg_burn > 0:
            # Burn multiple (how much you burn to generate $1 of ARR)
            # Lower is better (e.g., 1.5x means you burn $1.50 to generate $1 of ARR)
            arr = latest_revenue * 12  # Annualize latest month
            if arr > 0:
                burn_multiple = (avg_burn * 12) / arr
                efficiency['burn_multiple'] = round(burn_multiple, 2)
            else:
                efficiency['burn_multiple'] = None

        # Revenue efficiency (revenue per dollar of expense)
        latest_expenses = list(aggregates.get('expenses_by_period', {}).values())[-1] if aggregates.get('expenses_by_period') else 0
        if latest_expenses > 0:
            efficiency['revenue_per_dollar_spent'] = round(latest_revenue / latest_expenses, 2)
        else:
            efficiency['revenue_per_dollar_spent'] = 0

        # Quick efficiency score
        if efficiency.get('burn_multiple'):
            if efficiency['burn_multiple'] < 1.5:
                efficiency['efficiency_rating'] = 'excellent'
            elif efficiency['burn_multiple'] < 2.5:
                efficiency['efficiency_rating'] = 'good'
            elif efficiency['burn_multiple'] < 4:
                efficiency['efficiency_rating'] = 'average'
            else:
                efficiency['efficiency_rating'] = 'poor'
        else:
            efficiency['efficiency_rating'] = 'unknown'

        return efficiency

    def _generate_key_insights(self, metrics: Dict) -> List[Dict]:
        """Generate key insights from metrics"""
        insights = []

        # Runway insights
        runway = metrics.get('runway')
        if runway and runway.get('months_remaining'):
            months = runway['months_remaining']
            if months < 6:
                insights.append({
                    'type': 'warning',
                    'category': 'runway',
                    'message': f'Critical: Only {months:.1f} months of runway remaining. Consider fundraising immediately.',
                    'priority': 'high'
                })
            elif months < 12:
                insights.append({
                    'type': 'caution',
                    'category': 'runway',
                    'message': f'You have {months:.1f} months of runway. Start preparing for fundraising.',
                    'priority': 'medium'
                })
            elif months >= 18:
                insights.append({
                    'type': 'positive',
                    'category': 'runway',
                    'message': f'Strong position with {months:.1f} months of runway.',
                    'priority': 'low'
                })

        # Burn rate trends
        burn = metrics.get('burn_rate', {})
        if burn.get('burn_rate_trend_direction') == 'increasing':
            trend = burn.get('burn_rate_trend', 0)
            insights.append({
                'type': 'warning',
                'category': 'burn',
                'message': f'Burn rate is increasing ({abs(trend):.1f}% higher than earlier periods).',
                'priority': 'high'
            })

        # Growth insights
        growth = metrics.get('growth', {})
        if growth.get('mom_growth_latest', 0) > 10:
            insights.append({
                'type': 'positive',
                'category': 'growth',
                'message': f'Strong revenue growth of {growth["mom_growth_latest"]:.1f}% last month.',
                'priority': 'medium'
            })
        elif growth.get('mom_growth_latest', 0) < 0:
            insights.append({
                'type': 'warning',
                'category': 'growth',
                'message': f'Revenue declined {abs(growth["mom_growth_latest"]):.1f}% last month.',
                'priority': 'high'
            })

        # Efficiency insights
        efficiency = metrics.get('efficiency', {})
        if efficiency and efficiency.get('efficiency_rating') == 'excellent':
            insights.append({
                'type': 'positive',
                'category': 'efficiency',
                'message': f'Excellent cash efficiency with {efficiency["burn_multiple"]}x burn multiple.',
                'priority': 'low'
            })
        elif efficiency and efficiency.get('efficiency_rating') == 'poor':
            insights.append({
                'type': 'caution',
                'category': 'efficiency',
                'message': f'High burn multiple ({efficiency["burn_multiple"]}x) indicates inefficient growth.',
                'priority': 'medium'
            })

        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        insights.sort(key=lambda x: priority_order.get(x['priority'], 3))

        return insights
