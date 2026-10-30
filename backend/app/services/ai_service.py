"""Free, rule-based smart search (koi external API nahi)."""
import re
from app.services.llm_parser import parse_with_llm
RADIUS_STEPS = (1, 2, 5, 10)


class AIUnavailable(Exception):
    """Reserved: kisi external AI se fail hone par."""


def ai_enabled() -> bool:
    return True


NUM_WORDS = {
    "ek": 1, "one": 1, "do": 2, "two": 2, "teen": 3, "three": 3,
    "char": 4, "chaar": 4, "four": 4, "paanch": 5, "panch": 5, "five": 5,
    "chhe": 6, "chah": 6, "six": 6, "saat": 7, "seven": 7,
    "aath": 8, "eight": 8, "nau": 9, "nine": 9, "das": 10, "ten": 10,
}
_words_sorted = sorted(NUM_WORDS, key=len, reverse=True)
NUM = r"\d+(?:\.\d+)?|" + "|".join(_words_sorted)

HOUR_UNITS = r"(?:ghanta|ghante|ghanton|ghantey|hours?|hrs?)"
MIN_UNITS = r"(?:minutes?|mins?|mint)"
DAY_UNITS = r"(?:din|days?)"

SPECIAL_DURATIONS = [
    (re.compile(r"\b(?:dedh|derh)\s*" + HOUR_UNITS + r"\b"), 1.5),
    (re.compile(r"\b(?:dhai|dhaai|dhayi)\s*" + HOUR_UNITS + r"\b"), 2.5),
    (re.compile(r"\b(?:aadha|aadhe|adha|adhe|half(?:\s+an)?)\s*" + HOUR_UNITS + r"\b"), 0.5),
]
GENERAL_DURATION = re.compile(
    rf"\b(?P<n>{NUM})\s*(?P<u>{HOUR_UNITS}|{MIN_UNITS}|{DAY_UNITS})\b"
)

KM = re.compile(r"\b(\d+(?:\.\d+)?)\s*(?:km|kms|kilometers?|kilometres?|kilo\s*meters?)\b")
METERS = re.compile(r"\b(\d+)\s*(?:m|meters?|metres?)\b")

CAR = re.compile(r"\b(?:car|cars|kaar|gaadi|gadi|four\s*wheeler|4\s*wheeler|chaar\s*pahiya)\b")
BIKE = re.compile(
    r"\b(?:bike|bikes|baik|scooter|scooty|motorcycle|two\s*wheeler|2\s*wheeler|do\s*pahiya)\b"
)

HERE = re.compile(
    r"\b(?:near\s+me|nearby\s+me|around\s+me|mere\s+(?:paas|pass|aas\s*paas|aaspas|nazdeek|najdik)"
    r"|meri\s+(?:current\s+)?location|current\s+location|my\s+location|yahan|yaha|here)\b"
)

STOPWORDS = set(
    """
    mujhe mujhko mereko humein hume mera meri mere main mai hu hoon ko ke ki ka kaa me mein men
    par pe se tak liye lie wala wali ek chahiye chaiye chahie chahta chahti hai hain hoga h
    need want looking look for find search a an the to near nearby around in at within of is my
    i please plz parking park spot space jagah dhundo dhundh dikhao dikha do bata batao kahin kahi
    koi bhi aur ya paas pass aas aaspas nazdeek najdik andar bahar kar karo karna karni lagana
    available free
    """.split()
)


def _extract_duration(text: str):
    for pattern, hours in SPECIAL_DURATIONS:
        m = pattern.search(text)
        if m:
            return hours, text[: m.start()] + " " + text[m.end():]

    m = GENERAL_DURATION.search(text)
    if not m:
        return None, text

    raw = m.group("n")
    n = float(raw) if raw[0].isdigit() else float(NUM_WORDS[raw])
    unit = m.group("u")
    if re.fullmatch(MIN_UNITS, unit):
        hours = n / 60
    elif re.fullmatch(DAY_UNITS, unit):
        hours = n * 24
    else:
        hours = n
    return hours, text[: m.start()] + " " + text[m.end():]


def _extract_radius(text: str):
    m = KM.search(text)
    if m:
        return float(m.group(1)), text[: m.start()] + " " + text[m.end():]
    m = METERS.search(text)
    if m:
        return int(m.group(1)) / 1000, text[: m.start()] + " " + text[m.end():]
    return None, text


def _extract_vehicle(text: str):
    has_car = CAR.search(text)
    has_bike = BIKE.search(text)
    text = CAR.sub(" ", text)
    text = BIKE.sub(" ", text)
    if has_car and not has_bike:
        return "car", text
    if has_bike and not has_car:
        return "bike", text
    return None, text


def sanitize_intent(raw: dict) -> dict:
    """Output ko hamesha safe range me rakhta hai."""
    place = raw.get("place")
    place = place.strip()[:100] if isinstance(place, str) else None
    place = place or None

    vehicle = raw.get("vehicle_type")
    vehicle = vehicle if vehicle in ("car", "bike") else None

    def number(value):
        ok = isinstance(value, (int, float)) and not isinstance(value, bool)
        return float(value) if ok else None

    duration = number(raw.get("duration_hours"))
    if duration is not None:
        duration = min(max(duration, 0.25), 72.0)

    radius = number(raw.get("radius_km"))
    if radius is not None:
        radius = next((s for s in RADIUS_STEPS if s >= radius), RADIUS_STEPS[-1])

    return {
        "place": place,
        "use_current_location": bool(raw.get("use_current_location")) and place is None,
        "vehicle_type": vehicle,
        "duration_hours": duration,
        "radius_km": radius,
    }


def parse_intent(text: str) -> dict:
    llm_result = parse_with_llm(text)
    if llm_result:
        return sanitize_intent(llm_result)

    text = " " + text.lower().strip() + " "


    duration, text = _extract_duration(text)
    radius, text = _extract_radius(text)
    vehicle, text = _extract_vehicle(text)

    use_here = bool(HERE.search(text))
    text = HERE.sub(" ", text)

    tokens = re.findall(r"[^\W_]+(?:[-'][^\W_]+)*", text)
    place_tokens = [t for t in tokens if t not in STOPWORDS and t not in NUM_WORDS]
    place = " ".join(place_tokens).title() if place_tokens else None

    return sanitize_intent(
        {
            "place": place,
            "use_current_location": use_here,
            "vehicle_type": vehicle,
            "duration_hours": duration,
            "radius_km": radius,
        }
    )


def recommend_spot(spots: list[dict], duration_hours: float) -> tuple[int, str]:
    """Paas wala spot jeetta hai; kam doori ka fark ho to zyada free slots wala."""
    best = min(spots, key=lambda s: s["distance_km"] - 0.05 * min(s["free_slots"], 5))
    nearest = min(spots, key=lambda s: s["distance_km"])

    if best["id"] == nearest["id"]:
        reason = (
            f"Closest to you, {best['distance_km']} km away with "
            f"{best['free_slots']} of {best['capacity']} slots free."
        )
    else:
        reason = (
            f"Only {best['distance_km']} km away and has more free slots "
            f"({best['free_slots']} of {best['capacity']}) than the closest spot."
        )
    return best["id"], reason