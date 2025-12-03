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

    The logic works as follows:
    - Conditions are grouped by AND boundaries
    - Within each AND group, conditions are OR'd together
    - All AND groups must be True for the rule to match

    Example:
        conditions = [
            {"metric": "spend", "operator": ">=", "value": 100, "logic": "AND"},
            {"metric": "checkouts", "operator": "<=", "value": 3, "logic": "OR"},
            {"metric": "roas", "operator": "<", "value": 2.0}
        ]

        Is evaluated as:
        (spend >= 100) AND (checkouts <= 3 OR roas < 2.0)

    Args:
        conditions: List of RuleCondition objects
        metrics: Dict with metric values

    Returns:
        True if all AND groups are satisfied
    """
    if not conditions:
        return False

    # Group conditions by AND boundaries
    # A new AND group starts when the CURRENT condition's logic is "AND"
    # or it's the first condition
    groups = []
    current_group = []

    for i, cond in enumerate(conditions):
        current_group.append(cond)

        # Check if we should close this group
        # Close group if:
        # 1. Next condition has logic "AND" (meaning AND before it)
        # 2. This is the last condition
        is_last = (i == len(conditions) - 1)
        next_is_and = (
            i + 1 < len(conditions) and
            conditions[i + 1].logic == 'AND'
        )

        if is_last or next_is_and:
            groups.append(current_group)
            current_group = []

    # If there's a remaining group (shouldn't happen but just in case)
    if current_group:
        groups.append(current_group)

    # Evaluate groups:
    # - Within each group: OR logic (at least one must be true)
    # - Between groups: AND logic (all groups must be true)
    for group in groups:
        group_result = False
        for cond in group:
            if evaluate_single_condition(cond, metrics):
                group_result = True
                break  # Short-circuit OR

        if not group_result:
            return False  # Short-circuit AND

    return True


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
                       metrics: Dict) -> OptimizationRule | None:
    """
    Find the first matching rule (by priority).

    Args:
        rules: List of rules sorted by priority (highest first)
        metrics: Campaign metrics

    Returns:
        The first matching rule or None
    """
    # Sort by priority descending (higher priority first)
    sorted_rules = sorted(rules, key=lambda r: -r.priority)

    for rule in sorted_rules:
        if not rule.is_enabled:
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

        if cond.logic:
            explanation += f" [{cond.logic}]"

        explanations.append(explanation)

    final_result = evaluate_conditions(conditions, metrics)
    explanations.append(f"\nFinal result: {'MATCH' if final_result else 'NO MATCH'}")

    return "\n".join(explanations)
