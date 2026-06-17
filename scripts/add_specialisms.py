#!/usr/bin/env python3
"""Add MSci specialism strand information to Computing Science courses.

The School of Computing Science groups its honours and masters options into five
specialism strands, each with compulsory and optional courses. This script holds
that mapping (transcribed from the degree handbook) and writes a "specialisms"
field onto the matching courses in src/data/courses.json:

    "specialisms": [
      { "strand": "Data Management", "requirement": "compulsory" }
    ]

A course can belong to several strands, so the field is a list. The mapping is
keyed by course code, with the handbook abbreviation kept alongside for review.
Courses not in any strand are left untouched, and the field is rebuilt from the
mapping on every run, so it is safe to re-run.

Run:
    python scripts/add_specialisms.py
    python scripts/add_specialisms.py --stdout   # preview without writing
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

SCHOOL = "School of Computing Science"

# strand -> requirement -> list of (handbook abbreviation, [course codes]).
# Codes resolved from the catalogue by subject name and the (H)=level 4 /
# (M)=level 5 convention. See NOT_RUNNING for handbook entries with no course.
STRANDS: dict[str, dict[str, list[tuple[str, list[str]]]]] = {
    "Data Management": {
        "compulsory": [
            ("DB(H)", ["COMPSCI4013"]),  # Database Systems (H)
        ],
        "optional": [
            ("AI(H/M)", ["COMPSCI4004", "COMPSCI5087"]),  # Artificial Intelligence
            ("BD(H/M)", ["COMPSCI4064", "COMPSCI5088"]),  # Big Data
            ("CVMA(H)", ["COMPSCI4066"]),  # Computer Vision Methods and Applications
            ("DL(M)", ["COMPSCI5085"]),  # Deep Learning (M)
            ("IR(H/M)", ["COMPSCI4069", "COMPSCI5011"]),  # Information Retrieval
            ("ML(H/M)", ["COMPSCI4061", "COMPSCI5014"]),  # Machine Learning
            ("RF(H)", ["COMPSCI4076"]),  # Robotics Foundations (H)
            ("TD(H/M)", ["COMPSCI4074", "COMPSCI5096"]),  # Text as Data
            ("WS(H/M)", ["COMPSCI4077", "COMPSCI5078"]),  # Web Science
        ],
    },
    "Human Computer Interaction": {
        "optional": [
            ("CI(M)", ["COMPSCI5094"]),  # Conversational Interfaces (M)
            ("CSI(H)", ["COMPSCI4080"]),  # Computational Social Intelligence (H)
            ("HCI(H/M)", ["COMPSCI4023", "COMPSCI5111"]),  # Human-Computer Interaction
            ("HCS(M)", ["COMPSCI5060"]),  # Human-Centred Security (M)
            ("MobHCI(H/M)", ["COMPSCI4068", "COMPSCI5015"]),  # Mobile HCI
            ("PCHT(H)", ["COMPSCI4101"]),  # Patient Centred Health-Technologies
            ("XRI(M)", ["COMPSCI5117"]),  # Extended Reality Interaction (M)
        ],
    },
    "Information Security": {
        "compulsory": [
            ("CSF(H)", ["COMPSCI4062"]),  # Cyber Security Fundamentals (H)
        ],
        "optional": [
            ("FOR(M)", ["COMPSCI5080"]),  # Cyber Systems Forensics (M)
            ("CSD(M)", ["COMPSCI5079"]),  # Cryptography and Secure Development (M)
            ("HCS(M)", ["COMPSCI5060"]),  # Human-Centred Security (M)
            ("SSE(M)", ["COMPSCI5093"]),  # Secured Software Engineering (M)
        ],
    },
    "Parallel and Distributed Systems": {
        "compulsory": [
            ("NS(H)", ["COMPSCI4012"]),  # Networked Systems (H)
            ("OS(H)", ["COMPSCI4011"]),  # Operating Systems (H)
        ],
        "optional": [
            ("ANS(H)", ["COMPSCI4091"]),  # Advanced Networked Systems (H)
            ("ASP(H/M)", ["COMPSCI4089", "COMPSCI5083"]),  # Advanced Systems Programming
            ("CA(H)", ["COMPSCI4007"]),  # Computer Architecture (H)
            ("CS(H/M)", ["COMPSCI4106", "COMPSCI5118"]),  # Cloud Systems
            ("DPT(H/M)", ["COMPSCI4082", "COMPSCI5084"]),  # Distributed and Parallel Technologies
            ("FP(H)", ["COMPSCI4021"]),  # Functional Programming (H)
            ("SPRE(H/M)", ["COMPSCI4102", "COMPSCI5115"]),  # Software Product Release Engineering
            ("SSE(M)", ["COMPSCI5093"]),  # Secured Software Engineering (M)
        ],
    },
    "Theoretical Computer Science": {
        "optional": [
            ("ALGII(H)", ["COMPSCI4003"]),  # Algorithmics II (H)
            ("CGT(M)", ["COMPSCI5116"]),  # Computational Game Theory (M)
            ("CP(M)", ["COMPSCI5006"]),  # Constraint Programming (M)
            ("FP(H)", ["COMPSCI4021"]),  # Functional Programming (H)
            ("ML(H/M)", ["COMPSCI4061", "COMPSCI5014"]),  # Machine Learning
            ("PL(H)", ["COMPSCI4016"]),  # Programming Languages (H)
            ("QC(H)", ["COMPSCI4105"]),  # Quantum Computing
            ("TC(H)", ["COMPSCI4072"]),  # Theory of Computation (H)
        ],
    },
}

# Handbook entries with no live course in the catalogue (not currently running).
NOT_RUNNING = [
    ("Data Management", "RS(H/M)", "Recommender Systems"),
    ("Theoretical Computer Science", "MRS(H/M)", "Modelling Reactive Systems"),
]


def build_index() -> dict[str, list[dict]]:
    """code -> ordered list of {strand, requirement} from the strand mapping."""
    index: dict[str, list[dict]] = {}
    for strand, groups in STRANDS.items():
        for requirement, entries in groups.items():
            for _abbrev, codes in entries:
                for code in codes:
                    index.setdefault(code, []).append(
                        {"strand": strand, "requirement": requirement}
                    )
    return index


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", type=Path, default=repo_root / "src" / "data" / "courses.json")
    parser.add_argument("--stdout", action="store_true", help="print the updated JSON instead of saving")
    args = parser.parse_args()

    data: dict[str, list[dict]] = json.loads(args.data.read_text(encoding="utf-8"))
    courses = data.get(SCHOOL)
    if courses is None:
        raise SystemExit(f'School "{SCHOOL}" not found in {args.data}')

    index = build_index()
    by_code = {c["code"]: c for c in courses}

    missing = [code for code in index if code not in by_code]
    if missing:
        raise SystemExit(f"Mapping references unknown codes: {', '.join(sorted(missing))}")

    # Rebuild the field from scratch so re-runs stay clean.
    for course in courses:
        course.pop("specialisms", None)
    for code, specialisms in index.items():
        by_code[code]["specialisms"] = specialisms

    # Report.
    tagged = sum(1 for c in courses if c.get("specialisms"))
    print(f"Tagged {tagged} course(s) across {len(STRANDS)} strands:")
    for strand, groups in STRANDS.items():
        print(f"\n{strand}")
        for requirement, entries in groups.items():
            for abbrev, codes in entries:
                names = " / ".join(by_code[c]["name"] for c in codes)
                print(f"  [{requirement:<10}] {abbrev:<11} -> {names}")
    if NOT_RUNNING:
        print("\nNot mapped (no live course, likely not running):")
        for strand, abbrev, guess in NOT_RUNNING:
            print(f"  {strand}: {abbrev} ({guess})")

    payload = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if args.stdout:
        import sys

        sys.stdout.write(payload)
    else:
        args.data.write_text(payload, encoding="utf-8")
        print(f"\nWrote {args.data}")


if __name__ == "__main__":
    main()
