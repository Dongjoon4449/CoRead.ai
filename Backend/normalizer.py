"""
CoRead.ai - Professionalism Normalizer
=======================================
Public API: analyze(text) -> dict
Returns per-metric professionalism breakdown, softmax level probabilities,
and a weighted estimated score. All values are JSON-serializable.
"""

import json
import math
import os

import professionalism_scorer as scorer

BASELINE_PATH = os.path.join(os.path.dirname(__file__), "baseline.json")

METRIC_WEIGHTS = {
    "avg_word_length":        0.22,
    "jargon_ratio":           0.11,
    "avg_sentence_length":    0.22,
    "passive_voice_ratio":    0.22,
    "nominalization_ratio":   0.12,
    "complex_sentence_ratio": 0.11,
}

LEVEL_SCORES = {
    "Low":    0.15,
    "Middle": 0.55,
    "High":   0.90,
}

LEVEL_ORDER = ["Low", "Middle", "High"]

LEVEL_THRESHOLDS = [
    (0.67, "High"),
    (0.33, "Middle"),
    (0.00, "Low"),
]

SOFTMAX_TEMPERATURE = 0.2

FEEDBACK = {
    "avg_word_length": {
        "High":   "단어 길이가 길어 학술적·전문적 어휘를 많이 사용하고 있습니다.",
        "Middle": "단어 길이가 일반 기사 수준입니다.",
        "Low":    "단어 길이가 짧아 일상적인 어휘 위주로 구성되어 있습니다.",
    },
    "jargon_ratio": {
        "High":   "전문 용어 비율이 높아 특정 분야의 전문 독자를 대상으로 한 글입니다.",
        "Middle": "전문 용어가 적당히 포함되어 있습니다.",
        "Low":    "전문 용어 사용이 적어 일반 독자도 접근하기 쉬운 글입니다.",
    },
    "avg_sentence_length": {
        "High":   "문장 길이가 학술 논문 수준입니다.",
        "Middle": "문장 길이가 일반 기사 수준입니다.",
        "Low":    "문장이 짧고 간결합니다.",
    },
    "passive_voice_ratio": {
        "High":   "수동태 사용이 많아 학술적·객관적 문체입니다.",
        "Middle": "수동태가 중간 수준으로 사용되고 있습니다.",
        "Low":    "수동태 사용이 적은 능동적 문체입니다.",
    },
    "nominalization_ratio": {
        "High":   "명사화 표현이 많아 격식체·학술체 특성이 강합니다.",
        "Middle": "명사화 표현이 어느 정도 사용되고 있습니다.",
        "Low":    "명사화 표현이 적어 동사 중심의 직접적인 문체입니다.",
    },
    "complex_sentence_ratio": {
        "High":   "복잡한 문장 구조가 많아 논리적 연결이 촘촘합니다.",
        "Middle": "복문이 적당히 사용되고 있습니다.",
        "Low":    "단순한 문장 구조 위주입니다.",
    },
}

DISCLAIMER = "이 점수는 참고용입니다. 분야나 문체에 따라 실제 전문성과 다를 수 있습니다."


def _load_baseline() -> dict:
    with open(BASELINE_PATH, encoding="utf-8") as f:
        return json.load(f)


def _norm_unclamped(value: float, lo: float, hi: float) -> float:
    if hi == lo:
        return 0.5
    return (value - lo) / (hi - lo)


def _normalize(value: float, lo: float, hi: float) -> float:
    return round(max(0.0, min(1.0, _norm_unclamped(value, lo, hi))), 4)


def _level_probs(raw: float, cat_means: dict) -> dict[str, float]:
    """Softmax over distances in normalized space → probabilities summing to 1."""
    lo, hi = cat_means["low"], cat_means["high"]
    norm_raw = _norm_unclamped(raw, lo, hi)
    norm_means = {cat: _norm_unclamped(v, lo, hi) for cat, v in cat_means.items()}

    scores = {cat: math.exp(-abs(norm_raw - norm_means[cat]) / SOFTMAX_TEMPERATURE) for cat in norm_means}
    total = sum(scores.values())
    probs = {cat.capitalize(): round(scores[cat] / total, 4) for cat in scores}

    diff = round(1.0 - sum(probs.values()), 4)
    probs[max(probs, key=probs.get)] = round(probs[max(probs, key=probs.get)] + diff, 4)

    return {level: probs[level] for level in LEVEL_ORDER}


def _professionalism(probs: dict) -> float:
    return round(sum(probs[lvl] * LEVEL_SCORES[lvl] for lvl in LEVEL_ORDER), 4)


def _estimated_level(score_0_1: float) -> str:
    for threshold, label in LEVEL_THRESHOLDS:
        if score_0_1 >= threshold:
            return label
    return "Low"


def analyze(text: str) -> dict:
    """
    Main API. Accepts raw text, returns a JSON-serializable professionalism report.
    """
    baseline = _load_baseline()
    raw_scores = scorer.analyze(text)

    metrics = {}
    for metric in METRIC_WEIGHTS:
        if metric not in baseline or metric not in raw_scores:
            continue

        value = raw_scores[metric]
        cat_means = baseline[metric]["category_means"]

        normalized = _normalize(value, cat_means["low"], cat_means["high"])
        probs = _level_probs(value, cat_means)
        prof = _professionalism(probs)
        level = max(probs, key=probs.get)

        metrics[metric] = {
            "raw":             value,
            "normalized":      normalized,
            "professionalism": round(prof * 100, 1),
            "level_probs":     probs,
            "level":           level,
            "feedback":        FEEDBACK[metric][level],
        }

    total_weight = sum(METRIC_WEIGHTS[m] for m in metrics)
    weighted_sum = sum(_professionalism(metrics[m]["level_probs"]) * METRIC_WEIGHTS[m] for m in metrics)
    estimated_score = round((weighted_sum / total_weight) * 100, 1) if total_weight else 0.0

    return {
        "estimated_score": estimated_score,
        "estimated_level": _estimated_level(estimated_score / 100),
        "disclaimer":      DISCLAIMER,
        "metrics":         metrics,
    }


def analyze_file(file_path: str) -> dict:
    with open(file_path, encoding="utf-8") as f:
        return analyze(f.read())
