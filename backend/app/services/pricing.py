import math
from datetime import datetime


def calculate_amount(start: datetime, end: datetime, rate: float) -> float:
    seconds = max(0, (end - start).total_seconds())
    hours = max(1, math.ceil(seconds / 3600))
    return round(hours * rate, 2)