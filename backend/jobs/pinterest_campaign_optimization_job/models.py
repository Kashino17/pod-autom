"""
Pydantic Models for Campaign Optimization Job
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum


class ActionType(str, Enum):
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    PAUSE = "pause"


class ActionUnit(str, Enum):
    AMOUNT = "amount"  # Fixed Euro amount
    PERCENT = "percent"  # Percentage


class Operator(str, Enum):
    GREATER_EQUAL = ">="
    LESS_EQUAL = "<="
    GREATER = ">"
    LESS = "<"
    EQUAL = "=="


class Metric(str, Enum):
    SPEND = "spend"
    CHECKOUTS = "checkouts"
    ROAS = "roas"


class LogicOperator(str, Enum):
    AND = "AND"
    OR = "OR"


@dataclass
class RuleCondition:
    """Single condition in a rule."""
    metric: str  # 'spend', 'checkouts', 'roas'
    operator: str  # '>=', '<=', '>', '<', '=='
    value: float
    time_range_days: int = 7  # Look at last N days
    logic: Optional[str] = None  # 'AND' or 'OR' for next condition within group


@dataclass
class ConditionGroup:
    """A group of conditions that are evaluated together."""
    conditions: List[RuleCondition]
    logic: Optional[str] = None  # 'AND' or 'OR' for connecting to next group


@dataclass
class OptimizationRule:
    """A complete optimization rule."""
    id: str
    shop_id: str
    name: str
    is_enabled: bool
    priority: int
    condition_groups: List[ConditionGroup]  # New: Groups of conditions
    action_type: str  # 'scale_up', 'scale_down', 'pause'
    action_value: Optional[float]
    action_unit: Optional[str]  # 'amount' or 'percent'
    min_budget: float = 5.00
    max_budget: float = 1000.00
    # Campaign age restrictions (null/None = disabled)
    min_campaign_age_days: Optional[int] = None  # Minimum days campaign must exist before rule applies
    max_campaign_age_days: Optional[int] = None  # Maximum days - rule only applies to campaigns younger than this
    # Campaign type filter (required field)
    campaign_type: str = 'replace_campaign'  # 'replace_campaign' or 'winner_campaign'

    @classmethod
    def from_db_row(cls, row: Dict) -> 'OptimizationRule':
        """Create rule from database row."""
        condition_groups = []

        # Check if new format (condition_groups) exists
        if 'condition_groups' in row and row['condition_groups']:
            for group in row['condition_groups']:
                conditions = []
                for cond in group.get('conditions', []):
                    conditions.append(RuleCondition(
                        metric=cond.get('metric'),
                        operator=cond.get('operator'),
                        value=cond.get('value', 0),
                        time_range_days=cond.get('time_range_days', 7),
                        logic=cond.get('logic')
                    ))
                condition_groups.append(ConditionGroup(
                    conditions=conditions,
                    logic=group.get('logic')
                ))
        # Backwards compatibility: convert old 'conditions' format to single group
        elif 'conditions' in row and row['conditions']:
            conditions = []
            for cond in row['conditions']:
                conditions.append(RuleCondition(
                    metric=cond.get('metric'),
                    operator=cond.get('operator'),
                    value=cond.get('value', 0),
                    time_range_days=cond.get('time_range_days', 7),
                    logic=cond.get('logic')
                ))
            condition_groups.append(ConditionGroup(conditions=conditions, logic=None))

        return cls(
            id=row['id'],
            shop_id=row['shop_id'],
            name=row['name'],
            is_enabled=row.get('is_enabled', True),
            priority=row.get('priority', 0),
            condition_groups=condition_groups,
            action_type=row['action_type'],
            action_value=row.get('action_value'),
            action_unit=row.get('action_unit'),
            min_budget=row.get('min_budget', 5.00),
            max_budget=row.get('max_budget', 1000.00),
            min_campaign_age_days=row.get('min_campaign_age_days'),  # None = disabled
            max_campaign_age_days=row.get('max_campaign_age_days'),   # None = disabled
            campaign_type=row.get('campaign_type', 'replace_campaign')  # Required filter
        )


@dataclass
class OptimizationSettings:
    """Shop-level optimization settings."""
    shop_id: str
    is_enabled: bool = False
    test_mode_enabled: bool = False
    test_campaign_id: Optional[str] = None
    test_metrics: Optional[Dict] = None  # {"spend": 150, "checkouts": 2, "roas": 1.3}

    @classmethod
    def from_db_row(cls, row: Dict) -> 'OptimizationSettings':
        """Create settings from database row."""
        return cls(
            shop_id=row['shop_id'],
            is_enabled=row.get('is_enabled', False),
            test_mode_enabled=row.get('test_mode_enabled', False),
            test_campaign_id=row.get('test_campaign_id'),
            test_metrics=row.get('test_metrics')
        )


@dataclass
class Campaign:
    """Pinterest campaign data."""
    id: str  # Internal DB ID
    pinterest_campaign_id: str
    name: str
    status: str  # 'ACTIVE', 'PAUSED'
    daily_budget: float  # In Euro
    ad_account_id: str
    shop_id: str
    created_time: Optional[int] = None  # Unix timestamp when campaign was created on Pinterest
    campaign_type: str = 'replace_campaign'  # 'replace_campaign' or 'winner_campaign'

    @classmethod
    def from_db_row(cls, row: Dict) -> 'Campaign':
        """Create campaign from database row."""
        # Handle None values explicitly
        daily_budget = row.get('daily_budget')
        if daily_budget is None:
            daily_budget = 0.0
        else:
            daily_budget = float(daily_budget)

        return cls(
            id=row['id'],
            pinterest_campaign_id=row.get('pinterest_campaign_id', ''),
            name=row.get('name', ''),
            status=row.get('status', 'ACTIVE'),
            daily_budget=daily_budget,
            ad_account_id=row.get('ad_account_id', ''),
            shop_id=row.get('shop_id', ''),
            created_time=row.get('created_time'),
            campaign_type=row.get('campaign_type', 'replace_campaign')
        )

    def get_age_days(self) -> int:
        """Calculate campaign age in days from created_time."""
        if not self.created_time:
            return 0
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        created = datetime.fromtimestamp(self.created_time, tz=timezone.utc)
        return (now - created).days


@dataclass
class CampaignMetrics:
    """Metrics for a campaign over a time period."""
    spend: float = 0.0  # In Euro
    checkouts: int = 0
    roas: float = 0.0

    def to_dict(self) -> Dict:
        return {
            'spend': self.spend,
            'checkouts': self.checkouts,
            'roas': self.roas
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'CampaignMetrics':
        return cls(
            spend=float(data.get('spend', 0)),
            checkouts=int(data.get('checkouts', 0)),
            roas=float(data.get('roas', 0))
        )


@dataclass
class ShopPinterestConfig:
    """Shop configuration for Pinterest optimization."""
    shop_id: str
    internal_name: str
    pinterest_access_token: str
    pinterest_refresh_token: Optional[str]
    pinterest_account_id: str

    @classmethod
    def from_db_row(cls, row: Dict) -> 'ShopPinterestConfig':
        return cls(
            shop_id=row['shop_id'],
            internal_name=row.get('internal_name', ''),
            pinterest_access_token=row.get('pinterest_access_token', ''),
            pinterest_refresh_token=row.get('pinterest_refresh_token'),
            pinterest_account_id=row.get('pinterest_account_id', '')
        )


@dataclass
class OptimizationResult:
    """Result of an optimization action."""
    campaign_id: str
    rule_id: str
    action_taken: str  # 'scaled_up', 'scaled_down', 'paused', 'skipped', 'failed'
    old_budget: float
    new_budget: float
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    metrics_snapshot: Optional[Dict] = None
    error_message: Optional[str] = None
    is_test_run: bool = False


@dataclass
class JobMetrics:
    """Metrics for the entire job run."""
    shops_processed: int = 0
    shops_failed: int = 0
    campaigns_evaluated: int = 0
    actions_taken: int = 0
    errors: List[Dict] = field(default_factory=list)
