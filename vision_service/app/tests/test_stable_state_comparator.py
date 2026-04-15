from app.core.stable_state_comparator import StableStateComparator


def test_missing_ball_confirmed_after_stable_absence() -> None:
    comparator = StableStateComparator(
        expected_balls=[1, 2, 3],
        missing_confirm_frames=3,
        missing_confidence_threshold=0.8,
        review_lower_confidence_threshold=0.6,
    )

    stable_window = [
        {1: 0.95, 3: 0.9},
        {1: 0.92, 3: 0.88},
        {1: 0.93, 3: 0.9},
    ]

    result = comparator.evaluate(stable_window)

    assert result.event_type == "ball_missing_confirmed"
    assert 2 in result.confirmed_missing


def test_uncertain_missing_triggers_review_required() -> None:
    comparator = StableStateComparator(
        expected_balls=[1, 2, 3],
        missing_confirm_frames=3,
        missing_confidence_threshold=0.95,
        review_lower_confidence_threshold=0.7,
    )

    stable_window = [
        {1: 0.91, 2: 0.22, 3: 0.89},
        {1: 0.93, 2: 0.18, 3: 0.9},
        {1: 0.92, 2: 0.2, 3: 0.88},
    ]

    result = comparator.evaluate(stable_window)

    assert result.event_type == "review_required"
    assert result.payload.get("reason")


def test_presence_update_when_no_missing_candidates() -> None:
    comparator = StableStateComparator(
        expected_balls=[1, 2],
        missing_confirm_frames=2,
        missing_confidence_threshold=0.8,
        review_lower_confidence_threshold=0.6,
    )

    stable_window = [{1: 0.9, 2: 0.88}, {1: 0.9, 2: 0.92}]
    result = comparator.evaluate(stable_window)

    assert result.event_type == "ball_presence_updated"
    assert result.confirmed_missing == []
