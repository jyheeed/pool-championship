from app.state_machine.table_state_machine import TableStateMachine, TableState


def test_machine_reaches_stable_confirmed() -> None:
    machine = TableStateMachine(stabilizing_threshold=5.0, stable_required_frames=3)

    assert machine.update(motion_score=20.0, is_motion=True).current == TableState.MOTION
    assert machine.update(motion_score=2.0, is_motion=False).current == TableState.STABILIZING
    assert machine.update(motion_score=2.0, is_motion=False).current == TableState.STABILIZING
    assert machine.update(motion_score=2.0, is_motion=False).current == TableState.STABLE_CONFIRMED


def test_machine_resets_on_motion() -> None:
    machine = TableStateMachine(stabilizing_threshold=5.0, stable_required_frames=3)

    machine.update(motion_score=2.0, is_motion=False)
    machine.update(motion_score=2.0, is_motion=False)
    assert machine.stable_counter == 2

    transition = machine.update(motion_score=40.0, is_motion=True)
    assert machine.stable_counter == 0
    assert machine.state == TableState.MOTION
    assert transition.changed is True
