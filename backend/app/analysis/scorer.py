"""
Scorer Module for Code-Checker (Plagiarism Detection System).

This module handles the mathematical comparison of document fingerprints.
It provides functionality for:
1.  **Boilerplate Exclusion**: Removing common code (provided by instructors) from analysis.
2.  **Similarity Scoring**: Calculating how much two documents overlap using Set Theory metrics.

Key Concepts:
-   **Set Difference**: Used to subtract authorized code (boilerplate) from student code.
-   **Intersection**: The set of hashes that appear in BOTH documents.
-   **Containment Metric**: A similarity measure ideal for detecting if a small document
    is contained within a larger one (e.g., copying a helper function).
"""

from typing import Set, List, Dict, Any, Tuple

MERGE_GAP_CHARS = 40
MIN_BLOCK_CHARS = 120
MIN_BLOCK_HASHES = 3
MIN_BLOCK_PAIRS = 2


def _block_span(block: Dict[str, Any]) -> int:
    s = block["source"]
    t = block["target"]
    source_span = max(0, int(s["end"]) - int(s["start"]) + 1)
    target_span = max(0, int(t["end"]) - int(t["start"]) + 1)
    return min(source_span, target_span)


def _block_confidence(block: Dict[str, Any]) -> str:
    span = _block_span(block)
    hash_count = len(block["hashes"])
    pair_count = block["pair_count"]

    if span >= 140 and hash_count >= 9 and pair_count >= 6:
        return "high"
    if span >= 80 and hash_count >= 5 and pair_count >= 3:
        return "medium"
    return "low"


def _is_generic_or_weak(block: Dict[str, Any]) -> bool:
    span = _block_span(block)
    hash_count = len(block["hashes"])
    pair_count = block["pair_count"]

    # Very short or sparse blocks are typically generic control-flow scaffolding.
    if span < MIN_BLOCK_CHARS:
        return True
    if hash_count < MIN_BLOCK_HASHES:
        return True
    if pair_count < MIN_BLOCK_PAIRS:
        return True
    return False


def _merge_match_pairs(raw_pairs: List[Dict[str, Any]], merge_gap: int = MERGE_GAP_CHARS) -> List[Dict[str, Any]]:
    """Merge nearby raw pair matches into larger linked blocks."""
    if not raw_pairs:
        return []

    raw_pairs.sort(
        key=lambda p: (
            p["source"]["file_index"],
            p["source"]["start"],
            p["target"]["file_index"],
            p["target"]["start"],
        )
    )

    merged: List[Dict[str, Any]] = []

    for pair in raw_pairs:
        if not merged:
            merged.append({
                "source": dict(pair["source"]),
                "target": dict(pair["target"]),
                "hashes": {pair["hash"]},
                "pair_count": 1,
            })
            continue

        last = merged[-1]
        same_source_file = pair["source"]["file_index"] == last["source"]["file_index"]
        same_target_file = pair["target"]["file_index"] == last["target"]["file_index"]
        source_close = pair["source"]["start"] <= (last["source"]["end"] + merge_gap)
        target_close = pair["target"]["start"] <= (last["target"]["end"] + merge_gap)

        if same_source_file and same_target_file and source_close and target_close:
            last["source"]["end"] = max(last["source"]["end"], pair["source"]["end"])
            last["target"]["end"] = max(last["target"]["end"], pair["target"]["end"])
            last["hashes"].add(pair["hash"])
            last["pair_count"] += 1
        else:
            merged.append({
                "source": dict(pair["source"]),
                "target": dict(pair["target"]),
                "hashes": {pair["hash"]},
                "pair_count": 1,
            })

    return merged

def remove_boilerplate(student_fingerprint: List[Dict[str, Any]], boilerplate_hashes: Set[int]) -> List[Dict[str, Any]]:
    """
    Removes boilerplate hashes from a student's fingerprint list.

    Boilerplate code includes starter code, provided libraries, or template files
    given by the instructor. We must exclude these to avoid false positives.

    We filter the student's list of fingerprint objects, keeping only those
    whose hash is NOT in the boilerplate set.

    Args:
        student_fingerprint (List[Dict]): The list of fingerprint objects from the student.
        boilerplate_hashes (Set[int]): The set of hashes from the provided starter code.

    Returns:
        List[Dict]: A new list containing only the unique fingerprint objects.
    """
    unique_fingerprints = [
        fp for fp in student_fingerprint 
        if fp['hash'] not in boilerplate_hashes
    ]
    
    return unique_fingerprints

def calculate_similarity(
    fingerprint_a: List[Dict[str, Any]],
    fingerprint_b: List[Dict[str, Any]]
) -> Tuple[float, List[Dict], List[Dict], List[Dict[str, Any]]]:
    # 1. Handle Edge Case: Empty fingerprints
    if not fingerprint_a or not fingerprint_b:
        return 0.0, [], [], []

    # 2. Extract just the hashes into sets to perform the math
    hashes_a = {fp['hash'] for fp in fingerprint_a}
    hashes_b = {fp['hash'] for fp in fingerprint_b}

    # 3. Calculate Intersection (which hashes match?)
    matched_hashes = hashes_a & hashes_b
    intersection_size = len(matched_hashes)

    # 4. Determine the size of the smaller fingerprint (symmetric containment denominator)
    min_size = min(len(hashes_a), len(hashes_b))

    # 5. Initial ratio (kept for reasoning), final score is adjusted after quality filtering.
    similarity_score = 0.0
    if min_size > 0:
        similarity_score = (intersection_size / min_size) * 100.0

    # 6. Build paired ranges so the frontend can link source and target highlights by match id.
    # We pair occurrences per hash up to min(freq_a, freq_b) to avoid over-highlighting
    # all repeated occurrences that do not have a counterpart.
    grouped_a: Dict[int, List[Dict[str, Any]]] = {}
    grouped_b: Dict[int, List[Dict[str, Any]]] = {}

    for fp in fingerprint_a:
        h = fp.get("hash")
        if h in matched_hashes:
            grouped_a.setdefault(h, []).append(fp)

    for fp in fingerprint_b:
        h = fp.get("hash")
        if h in matched_hashes:
            grouped_b.setdefault(h, []).append(fp)

    raw_pairs: List[Dict[str, Any]] = []

    for h in sorted(matched_hashes):
        a_items = grouped_a.get(h, [])
        b_items = grouped_b.get(h, [])
        pair_count = min(len(a_items), len(b_items))

        for i in range(pair_count):
            a_item = a_items[i]
            b_item = b_items[i]

            s_range = {
                "start": a_item["start_idx"],
                "end": a_item["end_idx"],
                "file_index": a_item.get("file_index", 0)
            }
            t_range = {
                "start": b_item["start_idx"],
                "end": b_item["end_idx"],
                "file_index": b_item.get("file_index", 0)
            }

            raw_pairs.append({
                "hash": h,
                "source": s_range,
                "target": t_range,
            })

    merged_blocks = _merge_match_pairs(raw_pairs)
    retained_blocks = [b for b in merged_blocks if not _is_generic_or_weak(b)]

    # Recompute score from retained evidence only to reduce false positives from generic matches.
    retained_hashes: Set[int] = set()
    for block in retained_blocks:
        retained_hashes.update(block["hashes"])

    if min_size > 0:
        similarity_score = (len(retained_hashes) / min_size) * 100.0
    else:
        similarity_score = 0.0

    ranges_a: List[Dict[str, Any]] = []
    ranges_b: List[Dict[str, Any]] = []
    matched_pairs: List[Dict[str, Any]] = []

    for match_id, block in enumerate(retained_blocks):
        s_range = block["source"]
        t_range = block["target"]
        confidence = _block_confidence(block)

        ranges_a.append(s_range)
        ranges_b.append(t_range)
        matched_pairs.append({
            "match_id": match_id,
            "confidence": confidence,
            "min_span_chars": _block_span(block),
            "hash_count": len(block["hashes"]),
            "pair_count": block["pair_count"],
            "source": [s_range],
            "target": [t_range],
        })

    return similarity_score, ranges_a, ranges_b, matched_pairs
