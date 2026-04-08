"""
ColoRead - Professionalism Scorer (English)
============================================
Calculates 7 linguistic metrics from input text:

[Word-level]
  1. Average Word Length
  2. TTR (Type-Token Ratio)
  3. Jargon Ratio

[Sentence-level]
  4. Average Sentence Length
  5. Passive Voice Ratio
  6. Nominalization Ratio
  7. Complex Sentence Ratio

Requirements: Python 3.8+, wordfreq (`pip install wordfreq`)
"""

import os
import re
import sys
from typing import Dict

from wordfreq import word_frequency


# ---------------------------------------------------------------------------
# 1. Preprocessing helpers
# ---------------------------------------------------------------------------

def tokenize_words(text: str) -> list[str]:
    """Extract alphabetic word tokens (lowercase)."""
    return re.findall(r"[a-zA-Z']+", text.lower())


def tokenize_sentences(text: str) -> list[str]:
    """Split text into sentences on . ! ? boundaries."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in sentences if len(s.strip()) > 0]


# ---------------------------------------------------------------------------
# 2. Word-level metrics
# ---------------------------------------------------------------------------

def avg_word_length(words: list[str]) -> float:
    """
    Metric 1 - Average Word Length
    Professional texts tend to use longer, more complex words.
    Threshold reference: academic ~6.5+, blog ~4.5, diary ~4.0
    """
    if not words:
        return 0.0
    return round(sum(len(w) for w in words) / len(words), 2)


def type_token_ratio(words: list[str]) -> float:
    """
    Metric 2 - TTR (Type-Token Ratio)
    Measures vocabulary diversity: unique_words / total_words.
    Range: 0~1. Higher = more varied vocabulary.
    Note: sensitive to text length; best compared within similar-length texts.
    """
    if not words:
        return 0.0
    return round(len(set(words)) / len(words), 2)


# Google 10000 most common English words (loaded once at import time)
_GOOGLE10K_PATH = os.path.join(os.path.dirname(__file__), "google-10000-english-no-swears.txt")
with open(_GOOGLE10K_PATH, encoding="utf-8") as _f:
    GOOGLE_10K: set[str] = {line.strip().lower() for line in _f if line.strip()}

# Words with wordfreq frequency below this threshold are treated as jargon
JARGON_FREQ_THRESHOLD = 1e-6


def jargon_ratio(words: list[str]) -> float:
    """
    Metric 3 - Jargon Ratio
    A word is considered jargon when BOTH conditions hold:
      1. Not in Google 10000 most common English words
      2. word_frequency(word, 'en') <= JARGON_FREQ_THRESHOLD
    Professional/academic texts use more domain-specific terminology.
    """
    if not words:
        return 0.0
    jargon_words = [
        w for w in words
        if w not in GOOGLE_10K and word_frequency(w, "en") <= JARGON_FREQ_THRESHOLD
    ]
    return round(len(jargon_words) / len(words), 2)


# ---------------------------------------------------------------------------
# 3. Sentence-level metrics
# ---------------------------------------------------------------------------

def avg_sentence_length(sentences: list[str]) -> float:
    """
    Metric 6 - Average Sentence Length (in words)
    Longer sentences typically indicate denser, more formal writing.
    Reference: academic ~25+, blog ~15, diary ~12
    """
    if not sentences:
        return 0.0
    lengths = [len(tokenize_words(s)) for s in sentences]
    return round(sum(lengths) / len(lengths), 2)


PASSIVE_PATTERNS = [
    r"\b(is|are|was|were|be|been|being)\s+\w+ed\b",   # e.g. "is examined"
    r"\b(is|are|was|were)\s+\w+en\b",                  # e.g. "is written"
    r"\bhas been\s+\w+ed\b",                            # e.g. "has been proposed"
    r"\bhave been\s+\w+ed\b",
    r"\bhad been\s+\w+ed\b",
]

def passive_voice_ratio(sentences: list[str]) -> float:
    """
    Metric 7 - Passive Voice Ratio
    Academic writing favors passive constructions to maintain objectivity.
    Higher ratio → more formal/scientific tone.
    """
    if not sentences:
        return 0.0
    passive_count = 0
    for s in sentences:
        for pattern in PASSIVE_PATTERNS:
            if re.search(pattern, s.lower()):
                passive_count += 1
                break  # count sentence once even if multiple passives
    return round(passive_count / len(sentences), 2)


# Common nominalization suffixes in English
NOMINALIZATION_SUFFIXES = (
    "tion", "sion", "ment", "ness", "ity", "ance", "ence",
    "ship", "hood", "ism", "ery", "age"
)

def nominalization_ratio(words: list[str]) -> float:
    """
    Metric 8 - Nominalization Ratio
    Nominalization = converting verbs/adjectives into nouns
    (e.g., 'analyze' → 'analysis', 'develop' → 'development').
    Common in academic writing. Higher ratio → more formal register.
    """
    if not words:
        return 0.0
    nom_words = [w for w in words if w.endswith(NOMINALIZATION_SUFFIXES) and len(w) > 6]
    return round(len(nom_words) / len(words), 3)


COMPLEX_SENTENCE_PATTERNS = [
    r"\b(although|though|even though|whereas|while|since|because|if|unless"
    r"|whenever|after|before|until|as long as|provided that)\b",
    r"\b(which|who|whom|whose|that)\b",   # relative clauses
    r"\b(however|therefore|furthermore|moreover|consequently|nevertheless"
    r"|subsequently|accordingly|thus|hence)\b",
]

def complex_sentence_ratio(sentences: list[str]) -> float:
    """
    Metric 9 - Complex Sentence Ratio
    Counts sentences containing subordinating conjunctions, relative clauses,
    or discourse connectives — markers of syntactic complexity.
    Higher ratio → more sophisticated sentence structure.
    """
    if not sentences:
        return 0.0
    complex_count = 0
    for s in sentences:
        for pattern in COMPLEX_SENTENCE_PATTERNS:
            if re.search(pattern, s.lower()):
                complex_count += 1
                break
    return round(complex_count / len(sentences), 2)


# ---------------------------------------------------------------------------
# 4. Main analyzer
# ---------------------------------------------------------------------------

def analyze(text: str) -> Dict[str, float]:
    """
    Run all 9 metrics on the input text.
    Returns a dictionary of metric names → scores.
    """
    words     = tokenize_words(text)
    sentences = tokenize_sentences(text)

    results = {
        # Word-level
        "avg_word_length":        avg_word_length(words),
        "type_token_ratio":       type_token_ratio(words),
        "jargon_ratio":           jargon_ratio(words),

        # Sentence-level
        "avg_sentence_length":    avg_sentence_length(sentences),
        "passive_voice_ratio":    passive_voice_ratio(sentences),
        "nominalization_ratio":   nominalization_ratio(words),
        "complex_sentence_ratio": complex_sentence_ratio(sentences),
    }
    return results


def print_report(label: str, text: str) -> None:
    """Pretty-print the analysis results."""
    results = analyze(text)

    print(f"\n{'='*55}")
    print(f"  TEXT: {label}")
    print(f"{'='*55}")

    print("\n  [Word-level Metrics]")
    print(f"  1. Avg Word Length          : {results['avg_word_length']:>6}  chars")
    print(f"  2. TTR (Vocab Diversity)    : {results['type_token_ratio']:>6}")
    print(f"  3. Jargon Ratio             : {results['jargon_ratio']:>6}")

    print("\n  [Sentence-level Metrics]")
    print(f"  4. Avg Sentence Length      : {results['avg_sentence_length']:>6}  words")
    print(f"  5. Passive Voice Ratio      : {results['passive_voice_ratio']:>6}")
    print(f"  6. Nominalization Ratio     : {results['nominalization_ratio']:>6}")
    print(f"  7. Complex Sentence Ratio   : {results['complex_sentence_ratio']:>6}")

    print()


# ---------------------------------------------------------------------------
# 5. Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python professionalism_scorer.py <path_to_txt_file>")
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.isfile(file_path):
        print(f"[ERROR] File not found: {file_path}")
        sys.exit(1)

    try:
        with open(file_path, encoding="utf-8") as f:
            text = f.read()
    except UnicodeDecodeError:
        print(f"[ERROR] Could not read file (encoding error): {file_path}")
        sys.exit(1)

    label = os.path.basename(file_path)
    print_report(label, text)
