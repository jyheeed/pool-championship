from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import NamedTuple


class TableState(str, Enum):
    IDLE = "idle"
    MOTION = "motion"
    STABILIZING = "stabilizing"
    STABLE_CONFIRMED = "stable_confirmed"


class TableTransition(NamedTuple):
    previous: TableState
    current: TableState
    changed: bool


@dataclass
class TableStateMachine:
    stabilizing_threshold: float
    stable_required_frames: int

    def __post_init__(self) -> None:
        self.state = TableState.IDLE
        self._stable_counter = 0

    @property
    def stable_counter(self) -> int:
        return self._stable_counter

    def update(self, motion_score: float, is_motion: bool) -> TableTransition:
        previous = self.state

        if is_motion:
            self.state = TableState.MOTION
            self._stable_counter = 0
            return TableTransition(previous=previous, current=self.state, changed=previous != self.state)

        if self.state in (TableState.MOTION, TableState.IDLE) and motion_score <= self.stabilizing_threshold:
            self.state = TableState.STABILIZING
            self._stable_counter += 1
        elif self.state == TableState.STABILIZING and motion_score <= self.stabilizing_threshold:
            self._stable_counter += 1
        elif self.state == TableState.STABLE_CONFIRMED and motion_score <= self.stabilizing_threshold:
            self._stable_counter += 1
        else:
            self.state = TableState.IDLE
            self._stable_counter = 0

        if self._stable_counter >= self.stable_required_frames:
            self.state = TableState.STABLE_CONFIRMED

        return TableTransition(previous=previous, current=self.state, changed=previous != self.state)
