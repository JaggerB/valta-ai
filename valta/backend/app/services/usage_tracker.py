"""
API Usage Tracking Service
Tracks token usage and costs for AI API calls (Anthropic Claude and OpenAI GPT)
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class UsageTracker:
    """Tracks API usage and costs for AI services"""

    # Pricing per 1M tokens (as of 2025)
    PRICING = {
        "claude-3-7-sonnet-20250219": {
            "input": 3.00,   # $3 per 1M input tokens
            "output": 15.00  # $15 per 1M output tokens
        },
        "claude-3-5-sonnet-20241022": {
            "input": 3.00,
            "output": 15.00
        },
        "claude-3-5-sonnet-20240620": {
            "input": 3.00,
            "output": 15.00
        },
        "gpt-4-turbo-preview": {
            "input": 10.00,   # $10 per 1M input tokens
            "output": 30.00   # $30 per 1M output tokens
        },
        "gpt-4": {
            "input": 30.00,
            "output": 60.00
        }
    }

    def __init__(self, storage_path: str = "usage_data.json"):
        """Initialize the usage tracker"""
        self.storage_path = Path(storage_path)
        self.usage_data = self._load_usage_data()

    def _load_usage_data(self) -> Dict:
        """Load usage data from file"""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading usage data: {e}")
                return self._create_empty_data()
        return self._create_empty_data()

    def _create_empty_data(self) -> Dict:
        """Create empty usage data structure"""
        return {
            "total_requests": 0,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_cost": 0.0,
            "monthly_budget": 10.0,  # Default $10/month budget
            "by_model": {},
            "by_date": {},
            "requests": []
        }

    def _save_usage_data(self):
        """Save usage data to file"""
        try:
            with open(self.storage_path, 'w') as f:
                json.dump(self.usage_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving usage data: {e}")

    def track_request(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        operation: str = "analysis"
    ):
        """Track a single API request"""

        # Calculate cost
        pricing = self.PRICING.get(model, {"input": 0, "output": 0})
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        total_cost = input_cost + output_cost

        # Update totals
        self.usage_data["total_requests"] += 1
        self.usage_data["total_input_tokens"] += input_tokens
        self.usage_data["total_output_tokens"] += output_tokens
        self.usage_data["total_cost"] += total_cost

        # Update by model
        if model not in self.usage_data["by_model"]:
            self.usage_data["by_model"][model] = {
                "requests": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cost": 0.0
            }

        self.usage_data["by_model"][model]["requests"] += 1
        self.usage_data["by_model"][model]["input_tokens"] += input_tokens
        self.usage_data["by_model"][model]["output_tokens"] += output_tokens
        self.usage_data["by_model"][model]["cost"] += total_cost

        # Update by date
        today = datetime.now().strftime("%Y-%m-%d")
        if today not in self.usage_data["by_date"]:
            self.usage_data["by_date"][today] = {
                "requests": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cost": 0.0
            }

        self.usage_data["by_date"][today]["requests"] += 1
        self.usage_data["by_date"][today]["input_tokens"] += input_tokens
        self.usage_data["by_date"][today]["output_tokens"] += output_tokens
        self.usage_data["by_date"][today]["cost"] += total_cost

        # Add request to history (keep last 100)
        request_record = {
            "timestamp": datetime.now().isoformat(),
            "model": model,
            "operation": operation,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost": total_cost
        }

        self.usage_data["requests"].append(request_record)
        if len(self.usage_data["requests"]) > 100:
            self.usage_data["requests"] = self.usage_data["requests"][-100:]

        # Save to disk
        self._save_usage_data()

        logger.info(
            f"Tracked API usage: {model} - "
            f"{input_tokens} input + {output_tokens} output tokens - "
            f"${total_cost:.4f}"
        )

    def get_usage_stats(self, days: int = 30) -> Dict:
        """Get usage statistics for the last N days"""

        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Filter by date
        filtered_requests = [
            req for req in self.usage_data["requests"]
            if datetime.fromisoformat(req["timestamp"]) >= start_date
        ]

        # Calculate stats for period
        period_stats = {
            "requests": len(filtered_requests),
            "input_tokens": sum(r["input_tokens"] for r in filtered_requests),
            "output_tokens": sum(r["output_tokens"] for r in filtered_requests),
            "cost": sum(r["cost"] for r in filtered_requests)
        }

        # Calculate current month's usage
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)
        month_requests = [
            req for req in self.usage_data["requests"]
            if datetime.fromisoformat(req["timestamp"]) >= month_start
        ]
        month_cost = sum(r["cost"] for r in month_requests)

        # Get budget and calculate remaining
        monthly_budget = self.usage_data.get("monthly_budget", 10.0)
        remaining_credits = max(0, monthly_budget - month_cost)
        usage_percentage = min(100, (month_cost / monthly_budget * 100) if monthly_budget > 0 else 0)

        return {
            "period_days": days,
            "period_stats": period_stats,
            "total_stats": {
                "requests": self.usage_data["total_requests"],
                "input_tokens": self.usage_data["total_input_tokens"],
                "output_tokens": self.usage_data["total_output_tokens"],
                "cost": self.usage_data["total_cost"]
            },
            "budget_info": {
                "monthly_budget": monthly_budget,
                "month_cost": month_cost,
                "remaining_credits": remaining_credits,
                "usage_percentage": usage_percentage
            },
            "by_model": self.usage_data["by_model"],
            "recent_requests": self.usage_data["requests"][-10:]  # Last 10 requests
        }

    def reset_usage(self):
        """Reset all usage data (use with caution!)"""
        self.usage_data = self._create_empty_data()
        self._save_usage_data()
        logger.info("Usage data reset")


# Global tracker instance
usage_tracker = UsageTracker()
