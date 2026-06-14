#!/usr/bin/env python3
"""Crawl the University of Glasgow course catalogue.

Walks the catalogue in three steps:

  1. browsebyschool        -> list of schools (name + course-list URL)
  2. courselist/?code=...   -> each school's courses grouped by Level (1-5),
                               with course name + code
  3. course/?code=...       -> each course page, scraping "Credits: NN"

The result is written as JSON keyed by school, matching the shape consumed by
the web app (src/data/courses.json):

    {
      "School of Computing Science": [
        { "name": "Machine Learning (H)", "code": "COMPSCI4061", "credit": 10, "level": 4 },
        ...
      ],
      ...
    }

Requirements:
    pip install requests beautifulsoup4

Examples:
    # Crawl every school into src/data/courses.json
    python scripts/crawl_catalogue.py

    # Only one school, write elsewhere, be gentle
    python scripts/crawl_catalogue.py --school "Computing Science" --out out.json --delay 0.5

    # Quick smoke test: skip the per-course credit fetch
    python scripts/crawl_catalogue.py --school Chemistry --no-credits --limit 5
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

try:
    import requests
    from bs4 import BeautifulSoup, NavigableString, Tag
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:  # pragma: no cover
    sys.exit(
        "Missing dependencies. Install them with:\n"
        "    pip install requests beautifulsoup4"
    )

BASE = "https://www.gla.ac.uk"
BROWSE_URL = f"{BASE}/coursecatalogue/browsebyschool/"

# Matches a level heading such as "Level 1 (SCQF level 7)".
LEVEL_RE = re.compile(r"^\s*Level\s+(\d+)\s*\(SCQF level\s*\d+\)\s*$", re.IGNORECASE)
# Looser variant for the fallback on a course page.
LEVEL_FALLBACK_RE = re.compile(r"Level\s+(\d+)\s*\(SCQF level", re.IGNORECASE)
CREDITS_RE = re.compile(r"Credits:\s*(\d+)", re.IGNORECASE)


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


def get_soup(session: requests.Session, url: str, delay: float) -> BeautifulSoup:
    if delay:
        time.sleep(delay)
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def query_param(url: str, key: str) -> str | None:
    values = parse_qs(urlparse(url).query).get(key)
    return values[0] if values else None


def get_schools(session: requests.Session, delay: float) -> list[tuple[str, str]]:
    """Return [(school_name, courselist_url), ...]."""
    soup = get_soup(session, BROWSE_URL, delay)
    schools: list[tuple[str, str]] = []
    seen: set[str] = set()
    for a in soup.select('a[href*="/coursecatalogue/courselist/"]'):
        href = a.get("href", "")
        url = urljoin(BASE, href)
        code = query_param(url, "code")
        if not code or code in seen:
            continue
        seen.add(code)
        name = (query_param(url, "name") or a.get_text(strip=True) or "").strip()
        if name:
            schools.append((name, url))
    return schools


def get_courses(
    session: requests.Session, courselist_url: str, delay: float
) -> list[dict]:
    """Return [{name, code, level}, ...] for one school, in document order."""
    soup = get_soup(session, courselist_url, delay)
    courses: list[dict] = []
    seen: set[str] = set()
    current_level: int | None = None

    for node in soup.descendants:
        # A bare text node carrying a level heading updates the running level.
        if isinstance(node, NavigableString):
            m = LEVEL_RE.match(str(node))
            if m:
                current_level = int(m.group(1))
            continue

        # A link to a course detail page is a course entry.
        if isinstance(node, Tag) and node.name == "a":
            href = node.get("href", "")
            if "/coursecatalogue/course/" not in href:
                continue
            code = query_param(urljoin(BASE, href), "code")
            if not code or code in seen:
                continue
            name = re.sub(r"\s+", " ", node.get_text(strip=True))
            # Some link texts trail the code; drop it if so.
            if name.upper().endswith(code.upper()):
                name = name[: -len(code)].strip()
            if not name:
                continue
            seen.add(code)
            courses.append({"name": name, "code": code, "level": current_level})

    return courses


def get_course_details(
    session: requests.Session, code: str, delay: float
) -> tuple[int | None, int | None, str | None]:
    """Return (credit, level_fallback, title) scraped from a course detail page."""
    url = f"{BASE}/coursecatalogue/course/?code={code}"
    try:
        soup = get_soup(session, url, delay)
    except requests.RequestException as exc:  # pragma: no cover
        print(f"  ! {code}: failed to fetch course page ({exc})", file=sys.stderr)
        return None, None, None
    text = soup.get_text(" ", strip=True)
    credit_m = CREDITS_RE.search(text)
    level_m = LEVEL_FALLBACK_RE.search(text)
    credit = int(credit_m.group(1)) if credit_m else None
    level = int(level_m.group(1)) if level_m else None

    # The course title is the heading whose text trails the course code,
    # e.g. "Machine Learning (H) COMPSCI4061".
    title = None
    for h in soup.find_all(["h1", "h2", "h3"]):
        t = re.sub(r"\s+", " ", h.get_text(" ", strip=True))
        if t.upper().endswith(code.upper()):
            title = t[: -len(code)].strip() or None
            break

    return credit, level, title


def crawl(args: argparse.Namespace) -> dict[str, list[dict]]:
    session = make_session()
    print("Fetching school list...", file=sys.stderr)
    schools = get_schools(session, args.delay)

    if args.school:
        needle = args.school.lower()
        schools = [s for s in schools if needle in s[0].lower()]
        if not schools:
            sys.exit(f'No school matched "{args.school}".')

    result: dict[str, list[dict]] = {}

    for school_name, courselist_url in schools:
        print(f"\n{school_name}", file=sys.stderr)
        courses = get_courses(session, courselist_url, args.delay)
        if args.limit:
            courses = courses[: args.limit]
        print(f"  {len(courses)} courses", file=sys.stderr)

        if not args.no_credits and courses:
            # Course-detail fetch in parallel; reuse the retrying session.
            def enrich(course: dict) -> dict:
                credit, level_fb, title = get_course_details(
                    session, course["code"], args.delay
                )
                course["credit"] = credit
                if course["level"] is None:
                    course["level"] = level_fb
                # Prefer the clean course-page title over the school-list link text.
                if title:
                    course["name"] = title
                return course

            with ThreadPoolExecutor(max_workers=args.workers) as pool:
                courses = list(pool.map(enrich, courses))
            missing = sum(1 for c in courses if c.get("credit") is None)
            if missing:
                print(f"  ! {missing} courses had no credit value", file=sys.stderr)
        else:
            for c in courses:
                c.setdefault("credit", None)

        # Order by level then name, and emit fields in a stable order.
        courses.sort(key=lambda c: ((c["level"] or 99), c["name"].lower()))
        result[school_name] = [
            {
                "name": c["name"],
                "code": c["code"],
                "credit": c["credit"],
                "level": c["level"],
            }
            for c in courses
        ]

    return dict(sorted(result.items()))


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    default_out = repo_root / "src" / "data" / "courses.json"

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=default_out, help=f"output JSON path (default: {default_out})")
    parser.add_argument("--school", help="only crawl schools whose name contains this text")
    parser.add_argument("--delay", type=float, default=0.3, help="seconds to wait before each request (default: 0.3)")
    parser.add_argument("--workers", type=int, default=6, help="parallel course-page fetches (default: 6)")
    parser.add_argument("--limit", type=int, default=0, help="cap courses per school (0 = no cap), for testing")
    parser.add_argument("--no-credits", action="store_true", help="skip the per-course fetch (faster; keeps school-list names, no credits)")
    parser.add_argument("--stdout", action="store_true", help="print JSON to stdout instead of writing --out")
    args = parser.parse_args()

    data = crawl(args)
    payload = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    total = sum(len(v) for v in data.values())
    print(f"\nDone: {len(data)} schools, {total} courses.", file=sys.stderr)

    if args.stdout:
        sys.stdout.write(payload)
    else:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
        print(f"Wrote {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
