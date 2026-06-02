"""
CoRead.ai - Professionalism Scorer
===================================
Computes 6 linguistic metrics from English text.

Word-level:  avg_word_length, jargon_ratio
Sentence-level: avg_sentence_length, passive_voice_ratio,
                nominalization_ratio, complex_sentence_ratio
"""

import os
import re

from wordfreq import word_frequency

_GOOGLE10K_PATH = os.path.join(os.path.dirname(__file__), "google-10000-english-no-swears.txt")
with open(_GOOGLE10K_PATH, encoding="utf-8") as _f:
    _GOOGLE_10K: set[str] = {line.strip().lower() for line in _f if line.strip()}

_JARGON_FREQ_THRESHOLD = 1e-6

_PASSIVE_PATTERNS = [
    r"\b(is|are|was|were|be|been|being)\s+\w+ed\b",
    r"\b(is|are|was|were)\s+\w+en\b",
    r"\bhas been\s+\w+ed\b",
    r"\bhave been\s+\w+ed\b",
    r"\bhad been\s+\w+ed\b",
]

_NOMINALIZATION_SUFFIXES = (
    "tion", "sion", "ment", "ness", "ity", "ance", "ence",
    "ship", "hood", "ism", "ery", "age",
)

_COMPLEX_PATTERNS = [
    r"\b(although|though|even though|whereas|while|since|because|if|unless"
    r"|whenever|after|before|until|as long as|provided that)\b",
    r"\b(which|who|whom|whose|that)\b",
    r"\b(however|therefore|furthermore|moreover|consequently|nevertheless"
    r"|subsequently|accordingly|thus|hence)\b",
]


def _tokenize_words(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


def _tokenize_sentences(text: str) -> list[str]:
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in parts if s.strip()]


def analyze(text: str) -> dict[str, float]:
    """Return 6 professionalism metric scores for the given text."""
    words = _tokenize_words(text)
    sentences = _tokenize_sentences(text)

    avg_wl = round(sum(len(w) for w in words) / len(words), 2) if words else 0.0

    jargon = [
        w for w in words
        if w not in _GOOGLE_10K and word_frequency(w, "en") <= _JARGON_FREQ_THRESHOLD
    ]
    jargon_r = round(len(jargon) / len(words), 2) if words else 0.0

    sent_lengths = [len(_tokenize_words(s)) for s in sentences]
    avg_sl = round(sum(sent_lengths) / len(sent_lengths), 2) if sentences else 0.0

    passive_count = 0
    for s in sentences:
        for pat in _PASSIVE_PATTERNS:
            if re.search(pat, s.lower()):
                passive_count += 1
                break
    passive_r = round(passive_count / len(sentences), 2) if sentences else 0.0

    nom = [w for w in words if w.endswith(_NOMINALIZATION_SUFFIXES) and len(w) > 6]
    nom_r = round(len(nom) / len(words), 3) if words else 0.0

    complex_count = 0
    for s in sentences:
        for pat in _COMPLEX_PATTERNS:
            if re.search(pat, s.lower()):
                complex_count += 1
                break
    complex_r = round(complex_count / len(sentences), 2) if sentences else 0.0

    return {
        "avg_word_length":        avg_wl,
        "jargon_ratio":           jargon_r,
        "avg_sentence_length":    avg_sl,
        "passive_voice_ratio":    passive_r,
        "nominalization_ratio":   nom_r,
        "complex_sentence_ratio": complex_r,
    }
