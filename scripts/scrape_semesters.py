#!/usr/bin/env python3
"""Add semester information to courses in src/data/courses.json.

Reads the existing catalogue JSON produced by crawl_catalogue.py, then for each
course of a school (School of Computing Science by default) fetches its course
page:

    https://www.gla.ac.uk/coursecatalogue/course/?code=COMPSCI...

and reads the "Typically Offered" line, e.g.

    <li><strong>Typically Offered:</strong> Semester 1</li>

The value is normalised to a "semester" field added to each course, matching the
term values the web app uses:

    "s1"     -> Semester 1 only
    "s2"     -> Semester 2 only
    "both"   -> runs across both semesters (full year / runs throughout)
    "summer" -> summer offering (placements, summer projects)

Only the target school is touched; every other school is written back unchanged.
Courses already carrying a "semester" value are skipped unless --force is given,
so the script is safe to re-run and resume.

Requirements:
    pip install requests beautifulsoup4

Examples:
    # Add semesters to every Computing Science course
    python scripts/scrape_semesters.py

    # Quick smoke test on the first five, printing the result instead of saving
    python scripts/scrape_semesters.py --limit 5 --stdout

    # Re-fetch everything, overwriting existing semester values
    python scripts/scrape_semesters.py --force
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:  # pragma: no cover
    sys.exit(
        "Missing dependencies. Install them with:\n"
        "    pip install requests beautifulsoup4"
    )

BASE = "https://www.gla.ac.uk"


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (compatible; GU-GPA-Calculator catalogue crawler; "
                "+https://github.com/Niox1337/GU-GPA-Calculator-web)"
            )
        }
    )
    retry = Retry(
        total=4,
        backoff_factor=0.8,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def parse_offered(soup: BeautifulSoup) -> str | None:
    """Return the raw 'Typically Offered' value from a course page, or None."""
    for strong in soup.find_all("strong"):
        label = strong.get_text(" ", strip=True).rstrip(":").strip().lower()
        if label == "typically offered":
            li = strong.parent
            if li is None:
                continue
            full = li.get_text(" ", strip=True)
            head = strong.get_text(" ", strip=True)
            # Drop the bold "Typically Offered:" label, keep the value after it.
            return full[len(head):].strip(" :")
    return None


def normalise_semester(text: str | None) -> str | None:
    """Map a 'Typically Offered' value to "s1", "s2", "both", "summer", or None."""
    t = (text or "").strip().lower()
    if not t:
        return None
    if "throughout" in t or "full year" in t or "full-year" in t:
        return "both"
    digits = set(re.findall(r"[12]", t))
    if digits == {"1"}:
        return "s1"
    if digits == {"2"}:
        return "s2"
    if {"1", "2"} <= digits:
        return "both"
    if "summer" in t:
        return "summer"
    return None


def fetch_semester(
    session: requests.Session, code: str, delay: float, timeout: float
) -> tuple[str | None, str | None]:
    """Return (normalised_semester, raw_offered_text) for one course code."""
    url = f"{BASE}/coursecatalogue/course/?code={code}"
    if delay:
        time.sleep(delay)
    try:
        resp = session.get(url, timeout=timeout)
        resp.raise_for_status()
    except requests.RequestException as exc:  # pragma: no cover
        print(f"  ! {code}: failed to fetch ({exc})", file=sys.stderr)
        return None, None
    soup = BeautifulSoup(resp.text, "html.parser")
    raw = parse_offered(soup)
    return normalise_semester(raw), raw


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    default_data = repo_root / "src" / "data" / "courses.json"

    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--data", type=Path, default=default_data,
        help=f"courses JSON to read and update (default: {default_data})",
    )
    parser.add_argument(
        "--school", default="Computing Science",
        help='only update schools whose name contains this text (default: "Computing Science")',
    )
    parser.add_argument("--delay", type=float, default=0.3, help="seconds to wait before each request (default: 0.3)")
    parser.add_argument("--workers", type=int, default=6, help="parallel course-page fetches (default: 6)")
    parser.add_argument("--timeout", type=float, default=30, help="per-request timeout in seconds (default: 30)")
    parser.add_argument("--limit", type=int, default=0, help="cap courses per school (0 = no cap), for testing")
    parser.add_argument("--force", action="store_true", help="re-fetch courses that already have a semester value")
    parser.add_argument("--stdout", action="store_true", help="print the updated JSON to stdout instead of saving")
    args = parser.parse_args()

    data: dict[str, list[dict]] = json.loads(args.data.read_text(encoding="utf-8"))

    needle = args.school.lower()
    schools = [name for name in data if needle in name.lower()]
    if not schools:
        sys.exit(f'No school matched "{args.school}".')

    session = make_session()
    counts = {"s1": 0, "s2": 0, "both": 0, "summer": 0}
    unknown: list[tuple[str, str, str | None]] = []
    fetched = 0

    for school in schools:
        courses = data[school]
        todo = [c for c in courses if args.force or "semester" not in c]
        if args.limit:
            todo = todo[: args.limit]
        print(f"\n{school}: {len(todo)} course(s) to fetch", file=sys.stderr)

        def enrich(course: dict) -> dict:
            semester, raw = fetch_semester(session, course["code"], args.delay, args.timeout)
            course["_semester"] = semester
            course["_raw"] = raw
            return course

        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
            list(pool.map(enrich, todo))

        for course in todo:
            semester = course.pop("_semester", None)
            raw = course.pop("_raw", None)
            fetched += 1
            if semester is None:
                unknown.append((course["code"], course["name"], raw))
                continue
            course["semester"] = semester
            counts[semester] += 1

    print(
        f"\nFetched {fetched} course(s): "
        f"{counts['s1']} S1, {counts['s2']} S2, {counts['both']} both, "
        f"{counts['summer']} summer, {len(unknown)} unresolved.",
        file=sys.stderr,
    )
    for code, name, raw in unknown:
        print(f"  ? {code} {name!r}: could not resolve (offered={raw!r})", file=sys.stderr)

    payload = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if args.stdout:
        sys.stdout.write(payload)
    else:
        args.data.write_text(payload, encoding="utf-8")
        print(f"Wrote {args.data}", file=sys.stderr)


if __name__ == "__main__":
    main()
