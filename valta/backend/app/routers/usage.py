"""
API Usage Monitoring Endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from app.services.usage_tracker import usage_tracker

router = APIRouter(prefix="/api/usage", tags=["usage"])


class UsageStatsResponse(BaseModel):
    """Usage statistics response"""
    period_days: int
    period_stats: Dict
    total_stats: Dict
    by_model: Dict
    recent_requests: List[Dict]


@router.get("/stats", response_model=UsageStatsResponse)
async def get_usage_stats(days: int = 30):
    """
    Get API usage statistics for the specified period

    Args:
        days: Number of days to include in period stats (default: 30)

    Returns:
        Usage statistics including total usage, usage by model, and recent requests
    """
    try:
        stats = usage_tracker.get_usage_stats(days=days)
        return UsageStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching usage stats: {str(e)}")


@router.post("/reset")
async def reset_usage():
    """
    Reset all usage tracking data

    WARNING: This will delete all usage history. Use with caution!
    """
    try:
        usage_tracker.reset_usage()
        return {"message": "Usage data has been reset"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting usage data: {str(e)}")


@router.get("/live")
async def get_live_stats():
    """
    Get live usage statistics (last 24 hours)
    Useful for real-time monitoring in the UI
    """
    try:
        stats = usage_tracker.get_usage_stats(days=1)

        # Calculate costs for display
        total_cost = stats["total_stats"]["cost"]
        period_cost = stats["period_stats"]["cost"]

        # Get most used model
        by_model = stats["by_model"]
        most_used_model = None
        max_requests = 0

        for model, data in by_model.items():
            if data["requests"] > max_requests:
                max_requests = data["requests"]
                most_used_model = model

        # Get budget info
        budget_info = stats.get("budget_info", {})

        return {
            "total_requests_24h": stats["period_stats"]["requests"],
            "total_cost_24h": round(period_cost, 4),
            "total_cost_alltime": round(total_cost, 2),
            "total_tokens_24h": stats["period_stats"]["input_tokens"] + stats["period_stats"]["output_tokens"],
            "most_used_model": most_used_model,
            "monthly_budget": budget_info.get("monthly_budget", 10.0),
            "remaining_credits": round(budget_info.get("remaining_credits", 0), 2),
            "usage_percentage": round(budget_info.get("usage_percentage", 0), 1),
            "month_cost": round(budget_info.get("month_cost", 0), 4),
            "recent_requests": stats["recent_requests"][:5]  # Last 5 requests
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching live stats: {str(e)}")
