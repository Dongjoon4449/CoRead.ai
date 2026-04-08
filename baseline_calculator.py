"""
CoRead.ai - Baseline Calculator
================================
Reads all txt files under data/Wrting Samples/{High,Middle,Low} folders,
computes per-category averages for all 9 professionalism metrics,
then saves min/max/direction/category_means to baseline.json.
"""

import json
import os
import sys

import professionalism_scorer as scorer

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATA_ROOT = os.path.join(os.path.dirname(__file__), "data", "Wrting Samples")

CATEGORIES = {
    "high":   "High Level - Research Paper",
    "middle": "Middle Level - Magazine, News Article",
    "low":    "Low Level - Casual Essay",
}

METRIC_DIRECTION = {
    "avg_word_length":        "higher",
    "type_token_ratio":       "higher",
    "jargon_ratio":           "higher",
    "avg_sentence_length":    "higher",
    "passive_voice_ratio":    "higher",
    "nominalization_ratio":   "higher",
    "complex_sentence_ratio": "higher",
}

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "baseline.json")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_texts(folder_path: str, category_name: str) -> list[str]:
    """Return text contents of all .txt files in folder_path."""
    if not os.path.isdir(folder_path):
        print(f"[WARNING] Category folder not found, skipping: {folder_path}")
        return []

    txt_files = [f for f in os.listdir(folder_path) if f.endswith(".txt")]
    if not txt_files:
        print(f"[WARNING] No .txt files in '{category_name}', skipping.")
        return []

    texts = []
    for fname in txt_files:
        fpath = os.path.join(folder_path, fname)
        try:
            with open(fpath, encoding="utf-8") as f:
                texts.append(f.read())
        except UnicodeDecodeError:
            print(f"[WARNING] Encoding error, skipping file: {fname}")
    return texts


def mean(values: list[float]) -> float:
    return round(sum(values) / len(values), 4) if values else 0.0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    # 1. Guard: data root must exist
    if not os.path.isdir(DATA_ROOT):
        print(f"[ERROR] Data folder not found: {DATA_ROOT}")
        sys.exit(1)

    # 2. Compute per-category metric averages
    category_averages: dict[str, dict[str, float]] = {}

    for cat_key, folder_name in CATEGORIES.items():
        folder_path = os.path.join(DATA_ROOT, folder_name)
        texts = load_texts(folder_path, cat_key)
        if not texts:
            continue

        all_results = [scorer.analyze(t) for t in texts]

        category_averages[cat_key] = {
            metric: mean([r[metric] for r in all_results])
            for metric in METRIC_DIRECTION
        }

    if not category_averages:
        print("[ERROR] No categories could be loaded. Exiting.")
        sys.exit(1)

    # 3. Build baseline per metric
    baseline: dict = {}
    print("\n=== Baseline Calculation Results ===\n")

    for metric, direction in METRIC_DIRECTION.items():
        means_by_cat = {
            cat: category_averages[cat][metric]
            for cat in category_averages
        }

        # Sort categories by mean value (descending) for display
        sorted_cats = sorted(means_by_cat.items(), key=lambda x: x[1], reverse=True)
        labels = ["high mean", "middle mean", "low mean"]

        all_values = list(means_by_cat.values())
        metric_min = round(min(all_values), 4)
        metric_max = round(max(all_values), 4)

        baseline[metric] = {
            "min":            metric_min,
            "max":            metric_max,
            "direction":      direction,
            "category_means": means_by_cat,
        }

        # Terminal output
        print(f"{metric}:")
        for label, (cat, val) in zip(labels, sorted_cats):
            print(f"  {label:<14}: {val}")
        print(f"  -> min: {metric_min} / max: {metric_max} / direction: {direction}\n")

    # 4. Save to JSON
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(baseline, f, indent=2, ensure_ascii=False)

    print(f"[OK] Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
