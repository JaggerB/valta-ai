"""
AI Commentary Generator

Generates investor-ready financial commentary using AI (Claude/GPT).
Creates plain-English explanations of startup metrics for:
- Investor updates
- Board presentations
- Internal dashboards
"""

import os
from typing import Dict, List, Optional
from anthropic import Anthropic
import json


class CommentaryGenerator:
    """Generate investor-ready commentary from startup metrics"""

    def __init__(self):
        """Initialize with API keys"""
        self.anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        if self.anthropic_key:
            self.client = Anthropic(api_key=self.anthropic_key)
        else:
            self.client = None

    def generate_full_commentary(
        self,
        metrics: Dict,
        company_name: Optional[str] = None,
        period_label: Optional[str] = None
    ) -> Dict:
        """
        Generate complete investor update commentary

        Args:
            metrics: Output from StartupMetricsCalculator
            company_name: Company name for personalization
            period_label: Period label (e.g., "October 2024")

        Returns:
            Dict with executive summary, detailed analysis, and formatted outputs
        """
        if not self.client:
            return self._generate_fallback_commentary(metrics)

        # Generate executive summary
        exec_summary = self._generate_executive_summary(metrics, company_name, period_label)

        # Generate detailed sections
        burn_analysis = self._generate_burn_analysis(metrics)
        growth_analysis = self._generate_growth_analysis(metrics)
        runway_analysis = self._generate_runway_analysis(metrics)
        expense_analysis = self._generate_expense_analysis(metrics)

        # Combine into full commentary
        commentary = {
            'executive_summary': exec_summary,
            'burn_analysis': burn_analysis,
            'growth_analysis': growth_analysis,
            'runway_analysis': runway_analysis,
            'expense_analysis': expense_analysis,
            'key_takeaways': self._generate_key_takeaways(metrics),
            'formatted_outputs': self._format_for_export(
                exec_summary,
                burn_analysis,
                growth_analysis,
                runway_analysis,
                expense_analysis,
                metrics,
                company_name,
                period_label
            )
        }

        return commentary

    def _generate_executive_summary(
        self,
        metrics: Dict,
        company_name: Optional[str],
        period_label: Optional[str]
    ) -> str:
        """Generate 2-3 sentence executive summary"""
        if not self.client:
            return self._fallback_executive_summary(metrics)

        prompt = self._build_executive_summary_prompt(metrics, company_name, period_label)

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                temperature=0.7,
                system=self._get_system_prompt(),
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()
        except Exception as e:
            print(f"Error generating executive summary: {e}")
            return self._fallback_executive_summary(metrics)

    def _generate_burn_analysis(self, metrics: Dict) -> str:
        """Generate detailed burn rate analysis"""
        if not self.client:
            return self._fallback_burn_analysis(metrics)

        burn = metrics.get('burn_rate', {})
        if not burn:
            return "No burn rate data available."

        prompt = f"""Analyze this burn rate data and explain it in plain English for investors:

Gross Burn (Average Monthly Expenses): ${burn.get('gross_burn_avg', 0):,.0f}
Net Burn (Expenses - Revenue): ${burn.get('net_burn_avg', 0):,.0f}
Latest Month Net Burn: ${burn.get('net_burn_latest', 0):,.0f}
Burn Trend: {burn.get('burn_rate_trend_direction', 'stable')} ({burn.get('burn_rate_trend', 0):.1f}% change)

Write 2-3 sentences explaining:
1. What the current burn rate means
2. Whether the trend is concerning or positive
3. Context for why this is typical/atypical for an early-stage startup
"""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=400,
                temperature=0.7,
                system=self._get_system_prompt(),
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()
        except Exception as e:
            print(f"Error generating burn analysis: {e}")
            return self._fallback_burn_analysis(metrics)

    def _generate_growth_analysis(self, metrics: Dict) -> str:
        """Generate revenue growth analysis"""
        if not self.client:
            return self._fallback_growth_analysis(metrics)

        growth = metrics.get('growth', {})
        if not growth:
            return "No growth data available."

        prompt = f"""Analyze this revenue growth data for an investor update:

Latest Month-over-Month Growth: {growth.get('mom_growth_latest', 0):.1f}%
Average Monthly Growth: {growth.get('mom_growth_avg', 0):.1f}%
Overall Growth (Period): {growth.get('overall_growth', 0):.1f}%
Compound Monthly Growth Rate: {growth.get('cmgr', 0):.1f}%
Trend: {growth.get('growth_trend', 'stable')}

Write 2-3 sentences explaining:
1. Whether this growth is strong/weak for an early-stage startup
2. What the trend indicates about momentum
3. Any concerns or positive signals for investors
"""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=400,
                temperature=0.7,
                system=self._get_system_prompt(),
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()
        except Exception as e:
            print(f"Error generating growth analysis: {e}")
            return self._fallback_growth_analysis(metrics)

    def _generate_runway_analysis(self, metrics: Dict) -> str:
        """Generate runway and cash position analysis"""
        if not self.client:
            return self._fallback_runway_analysis(metrics)

        runway = metrics.get('runway')
        if not runway or not runway.get('months_remaining'):
            return "Cash balance not provided - runway cannot be calculated."

        prompt = f"""Analyze this runway data for an investor update:

Months of Runway: {runway.get('months_remaining', 'N/A')}
Cash Balance: ${runway.get('cash_balance', 0):,.0f}
Status: {runway.get('status', 'unknown')}
Urgency: {runway.get('urgency', 'unknown')}
Projected Zero Cash Date: {runway.get('zero_cash_date', 'N/A')}

Write 2-3 sentences explaining:
1. Whether the current runway is healthy or concerning
2. When the company should start fundraising (if applicable)
3. Any recommendations for cash management
"""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=400,
                temperature=0.7,
                system=self._get_system_prompt(),
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()
        except Exception as e:
            print(f"Error generating runway analysis: {e}")
            return self._fallback_runway_analysis(metrics)

    def _generate_expense_analysis(self, metrics: Dict) -> str:
        """Generate expense driver analysis"""
        if not self.client:
            return self._fallback_expense_analysis(metrics)

        drivers = metrics.get('expense_drivers', {})
        if not drivers.get('top_expenses'):
            return "No expense data available."

        top_expenses = drivers['top_expenses'][:3]
        expense_list = "\n".join([
            f"- {exp['account']}: ${exp['latest_amount']:,.0f} ({exp['change_percent']:+.1f}% change)"
            for exp in top_expenses
        ])

        prompt = f"""Analyze these top expense categories for an investor update:

{expense_list}

Write 2-3 sentences explaining:
1. Where the majority of spend is going
2. Whether this allocation is typical for an early-stage startup
3. Any notable changes or concerns
"""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=400,
                temperature=0.7,
                system=self._get_system_prompt(),
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()
        except Exception as e:
            print(f"Error generating expense analysis: {e}")
            return self._fallback_expense_analysis(metrics)

    def _generate_key_takeaways(self, metrics: Dict) -> List[str]:
        """Generate bullet-point key takeaways"""
        takeaways = []

        insights = metrics.get('insights', [])
        for insight in insights[:5]:  # Top 5 insights
            takeaways.append(insight['message'])

        if not takeaways:
            # Generate basic takeaways from metrics
            burn = metrics.get('burn_rate', {})
            growth = metrics.get('growth', {})
            runway = metrics.get('runway')

            if burn.get('net_burn_avg'):
                takeaways.append(f"Burning ${burn['net_burn_avg']:,.0f}/month on average")

            if growth.get('mom_growth_latest'):
                takeaways.append(f"Revenue grew {growth['mom_growth_latest']:.1f}% last month")

            if runway and runway.get('months_remaining'):
                takeaways.append(f"{runway['months_remaining']:.1f} months of runway remaining")

        return takeaways

    def _build_executive_summary_prompt(
        self,
        metrics: Dict,
        company_name: Optional[str],
        period_label: Optional[str]
    ) -> str:
        """Build prompt for executive summary generation"""
        company = company_name or "the company"
        period = period_label or "this period"

        burn = metrics.get('burn_rate', {})
        growth = metrics.get('growth', {})
        runway = metrics.get('runway')

        metrics_summary = f"""
Company: {company}
Period: {period}

Financial Metrics:
- Net Burn Rate: ${burn.get('net_burn_avg', 0):,.0f}/month
- Revenue Growth (MoM): {growth.get('mom_growth_latest', 0):.1f}%
- Runway: {runway.get('months_remaining', 'N/A') if runway else 'N/A'} months
- Burn Trend: {burn.get('burn_rate_trend_direction', 'stable')}
"""

        prompt = f"""{metrics_summary}

Write a concise 2-3 sentence executive summary for an investor update that:
1. Highlights the most important financial metric
2. Mentions any significant changes or trends
3. Provides context on company health
4. Uses plain English, not financial jargon
5. Is optimistic but honest

Do not use phrases like "I" or "we". Write in third person or describe the company directly.
"""

        return prompt

    def _get_system_prompt(self) -> str:
        """Get system prompt for AI model"""
        return """You are a financial analyst helping startup founders explain their financials to investors.

Your task is to translate financial metrics into plain English that investors will understand and appreciate.

Guidelines:
- Use clear, simple language (avoid jargon unless necessary)
- Be honest and balanced (acknowledge both strengths and weaknesses)
- Provide context (e.g., "typical for early-stage SaaS")
- Focus on what investors care about (growth, efficiency, runway)
- Keep explanations concise (2-3 sentences per section)
- Use specific numbers when available
- Frame everything in terms of sustainability and momentum

Tone: Professional, confident, but not overly promotional. Sound like a trusted advisor."""

    def _format_for_export(
        self,
        exec_summary: str,
        burn_analysis: str,
        growth_analysis: str,
        runway_analysis: str,
        expense_analysis: str,
        metrics: Dict,
        company_name: Optional[str],
        period_label: Optional[str]
    ) -> Dict:
        """Format commentary for different export formats"""
        company = company_name or "Your Company"
        period = period_label or "Recent Period"

        # Markdown format (for emails)
        markdown = f"""# Financial Update - {period}

## Executive Summary

{exec_summary}

## Key Metrics

"""

        # Add metrics table
        burn = metrics.get('burn_rate', {})
        growth = metrics.get('growth', {})
        runway = metrics.get('runway')
        efficiency = metrics.get('efficiency', {})

        markdown += "| Metric | Value |\n|--------|-------|\n"
        markdown += f"| **Net Burn Rate** | ${burn.get('net_burn_avg', 0):,.0f}/month |\n"
        markdown += f"| **Revenue Growth (MoM)** | {growth.get('mom_growth_latest', 0):.1f}% |\n"

        if runway and runway.get('months_remaining'):
            markdown += f"| **Runway** | {runway['months_remaining']:.1f} months |\n"

        if efficiency and efficiency.get('burn_multiple'):
            markdown += f"| **Burn Multiple** | {efficiency['burn_multiple']}x |\n"

        markdown += f"\n## Detailed Analysis\n\n"
        markdown += f"### Burn Rate\n\n{burn_analysis}\n\n"
        markdown += f"### Growth\n\n{growth_analysis}\n\n"

        if runway:
            markdown += f"### Runway & Cash Position\n\n{runway_analysis}\n\n"

        markdown += f"### Expense Breakdown\n\n{expense_analysis}\n\n"

        # Plain text format (for copy-paste)
        plain_text = f"""FINANCIAL UPDATE - {period.upper()}

{exec_summary}

KEY METRICS:
• Net Burn: ${burn.get('net_burn_avg', 0):,.0f}/month
• Revenue Growth: {growth.get('mom_growth_latest', 0):.1f}% MoM
"""

        if runway and runway.get('months_remaining'):
            plain_text += f"• Runway: {runway['months_remaining']:.1f} months\n"

        plain_text += f"\n{burn_analysis}\n\n{growth_analysis}\n"

        # JSON format (for API/programmatic use)
        json_format = {
            'company': company,
            'period': period,
            'executive_summary': exec_summary,
            'sections': {
                'burn': burn_analysis,
                'growth': growth_analysis,
                'runway': runway_analysis,
                'expenses': expense_analysis
            },
            'metrics': {
                'burn_rate': burn.get('net_burn_avg'),
                'growth_rate': growth.get('mom_growth_latest'),
                'runway_months': runway.get('months_remaining') if runway else None
            }
        }

        return {
            'markdown': markdown,
            'plain_text': plain_text,
            'json': json_format
        }

    # Fallback methods (when AI is unavailable)

    def _generate_fallback_commentary(self, metrics: Dict) -> Dict:
        """Generate basic commentary without AI"""
        return {
            'executive_summary': self._fallback_executive_summary(metrics),
            'burn_analysis': self._fallback_burn_analysis(metrics),
            'growth_analysis': self._fallback_growth_analysis(metrics),
            'runway_analysis': self._fallback_runway_analysis(metrics),
            'expense_analysis': self._fallback_expense_analysis(metrics),
            'key_takeaways': self._generate_key_takeaways(metrics),
            'formatted_outputs': {}
        }

    def _fallback_executive_summary(self, metrics: Dict) -> str:
        burn = metrics.get('burn_rate', {})
        growth = metrics.get('growth', {})
        runway = metrics.get('runway')

        summary = f"The company is currently burning ${burn.get('net_burn_avg', 0):,.0f} per month "

        if growth.get('mom_growth_latest', 0) > 0:
            summary += f"with revenue growing {growth['mom_growth_latest']:.1f}% month-over-month. "
        else:
            summary += "with flat revenue. "

        if runway and runway.get('months_remaining'):
            summary += f"There are {runway['months_remaining']:.1f} months of runway remaining."

        return summary

    def _fallback_burn_analysis(self, metrics: Dict) -> str:
        burn = metrics.get('burn_rate', {})
        return f"Net burn is ${burn.get('net_burn_avg', 0):,.0f}/month, trending {burn.get('burn_rate_trend_direction', 'stable')}."

    def _fallback_growth_analysis(self, metrics: Dict) -> str:
        growth = metrics.get('growth', {})
        return f"Revenue grew {growth.get('mom_growth_latest', 0):.1f}% last month, with an average of {growth.get('mom_growth_avg', 0):.1f}% monthly growth."

    def _fallback_runway_analysis(self, metrics: Dict) -> str:
        runway = metrics.get('runway')
        if not runway:
            return "Runway data not available."
        return f"With {runway.get('months_remaining', 'N/A')} months of runway, the company is in {runway.get('status', 'unknown')} position."

    def _fallback_expense_analysis(self, metrics: Dict) -> str:
        drivers = metrics.get('expense_drivers', {})
        if not drivers.get('top_expenses'):
            return "Expense breakdown not available."

        top = drivers['top_expenses'][0]
        return f"The largest expense is {top['account']} at ${top['latest_amount']:,.0f}/month."
