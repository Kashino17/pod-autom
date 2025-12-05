"""
Rule Engine for Campaign Optimization
Evaluates conditions with AND/OR logic
"""
from typing import List, Dict
from models import OptimizationRule, RuleCondition, CampaignMetrics


def evaluate_single_condition(condition: RuleCondition, metrics: Dict) -> bool:
    """
    Evaluate a single condition against metrics.

    Args:
        condition: The condition to evaluate
        metrics: Dict with 'spend', 'checkouts', 'roas' keys

    Returns:
        True if condition is met
    """
    metric_value = metrics.get(condition.metric, 0)
    threshold = condition.value
    operator = condition.operator

    if operator == '>=':
        return metric_value >= threshold
    elif operator == '<=':
        return metric_value <= threshold
    elif operator == '>':
        return metric_value > threshold
    elif operator == '<':
        return metric_value < threshold
    elif operator == '==':
        return metric_value == threshold

    return False


def evaluate_conditions(conditions: List[RuleCondition], metrics: Dict) -> bool:
    """
    Evaluate conditions with AND/OR logic.

    The logic field on a condition specifies how to connect to the NEXT condition.

    Example:
        conditions = [
            {"metric": "spend", "operator": ">=", "value": 100, "logic": "AND"},
            {"metric": "checkouts", "operator": ">=", "value": 5, "logic": None}
        ]

        Is evaluated as:
        (spend >= 100) AND (checkouts >= 5)

    Example with OR:
        conditions = [
            {"metric": "spend", "operator": ">=", "value": 100, "logic": "OR"},
            {"metric": "checkouts", "operator": ">=", "value": 5, "logic": None}
        ]

        Is evaluated as:
        (spend >= 100) OR (checkouts >= 5)

    Args:
        conditions: List of RuleCondition objects
        metrics: Dict with metric values

    Returns:
        True if the combined expression evaluates to True
    """
    if not conditions:
        return False

    # Start with the result of the first condition
    result = evaluate_single_condition(conditions[0], metrics)

    # Process remaining conditions with their logic operators
    for i in range(len(conditions) - 1):
        current_cond = conditions[i]
        next_cond = conditions[i + 1]
        next_result = evaluate_single_condition(next_cond, metrics)

        # The logic field on current condition tells us how to combine with next
        logic = current_cond.logic

        if logic == 'AND' or logic == 'UND':
            result = result and next_result
        elif logic == 'OR' or logic == 'ODER':
            result = result or next_result
        else:
            # Default to AND if no logic specified
            result = result and next_result

    return result


def filter_metrics_by_timerange(full_metrics: Dict[int, CampaignMetrics],
                                 conditions: List[RuleCondition]) -> Dict:
    """
    Get the appropriate metrics based on condition time ranges.

    For simplicity, we use the maximum time range from all conditions.
    The Pinterest API returns aggregated data for the requested period.

    Args:
        full_metrics: Dict mapping time_range_days to CampaignMetrics
        conditions: List of conditions to check

    Returns:
        Metrics dict with 'spend', 'checkouts', 'roas'
    """
    # Find the time ranges needed
    time_ranges = set(cond.time_range_days for cond in conditions)

    # If we have metrics for multiple time ranges, use them
    # For now, use the metrics for the maximum time range
    max_range = max(time_ranges) if time_ranges else 7

    if max_range in full_metrics:
        return full_metrics[max_range].to_dict()
    elif full_metrics:
        # Fall back to whatever we have
        return list(full_metrics.values())[0].to_dict()

    return {'spend': 0, 'checkouts': 0, 'roas': 0}


def find_matching_rule(rules: List[OptimizationRule],
                       metrics: Dict,
                       campaign_age_days: int = 0) -> OptimizationRule | None:
    """
    Find the first matching rule (by priority).

    Args:
        rules: List of rules sorted by priority (highest first)
        metrics: Campaign metrics
        campaign_age_days: Age of the campaign in days (from created_time)

    Returns:
        The first matching rule or None
    """
    # Sort by priority descending (higher priority first)
    sorted_rules = sorted(rules, key=lambda r: -r.priority)

    for rule in sorted_rules:
        if not rule.is_enabled:
            continue

        # Check minimum campaign age requirement
        if rule.min_campaign_age_days > 0 and campaign_age_days < rule.min_campaign_age_days:
            continue

        if evaluate_conditions(rule.conditions, metrics):
            return rule

    return None


# Helper function for testing
def explain_evaluation(conditions: List[RuleCondition], metrics: Dict) -> str:
    """
    Generate a human-readable explanation of the evaluation.

    Args:
        conditions: List of conditions
        metrics: Campaign metrics

    Returns:
        Explanation string
    """
    if not conditions:
        return "No conditions to evaluate"

    explanations = []

    for i, cond in enumerate(conditions):
        metric_value = metrics.get(cond.metric, 0)
        result = evaluate_single_condition(cond, metrics)
        status = "✓" if result else "✗"

        explanation = (
            f"{status} {cond.metric} {cond.operator} {cond.value} "
            f"(actual: {metric_value})"
        )

        # Show logic connector to next condition
        if i < len(conditions) - 1 and cond.logic:
            explanation += f" {cond.logic}"

        explanations.append(explanation)

    final_result = evaluate_conditions(conditions, metrics)
    explanations.append(f"\nFinal result: {'MATCH' if final_result else 'NO MATCH'}")

    return "\n".join(explanations)
