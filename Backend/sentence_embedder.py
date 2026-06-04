# ColoRead - sentence_embedder.py
"""
문장 임베딩 및 인접 문장 간 Cosine Similarity 계산.

의존성:
    pip install sentence-transformers scikit-learn numpy spacy
    python -m spacy download en_core_web_sm
"""

import numpy as np
import spacy
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# 모델은 모듈 로드 시 한 번만 초기화 (첫 실행 시 ~80MB 자동 다운로드)
_nlp: spacy.Language | None = None
_model: SentenceTransformer | None = None


def _get_nlp() -> spacy.Language:
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm", disable=["ner", "parser", "tagger", "lemmatizer"])
        _nlp.add_pipe("sentencizer")
    return _nlp


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


# ─── Public API ──────────────────────────────────────────────────────────────

def split_sentences(text: str) -> list[str]:
    """
    텍스트를 문장 단위로 분리합니다.

    spaCy sentencizer를 사용하며, 공백만 있거나 10자 미만인 단편 문장은 제거합니다.
    """
    doc = _get_nlp()(text)
    return [
        sent.text.strip()
        for sent in doc.sents
        if len(sent.text.strip()) >= 10
    ]


def embed_sentences(sentences: list[str]) -> np.ndarray:
    """
    각 문장을 Sentence-BERT(all-MiniLM-L6-v2)로 벡터화합니다.

    Returns:
        shape (n_sentences, 384) numpy array
    """
    return _get_model().encode(sentences, convert_to_numpy=True)


def compute_similarities(embeddings: np.ndarray) -> list[float]:
    """
    인접 문장 쌍의 Cosine Similarity를 계산합니다.

    Returns:
        길이 (n_sentences - 1)인 float 리스트, 각 값은 0.0~1.0
    """
    similarities = []
    for i in range(len(embeddings) - 1):
        score = cosine_similarity(
            embeddings[i].reshape(1, -1),
            embeddings[i + 1].reshape(1, -1),
        )[0][0]
        similarities.append(float(score))
    return similarities


# Raw cosine similarity 기반 level 분류 임계값
# (테스트 데이터 실측치 근거: Sample A mean 0.35, Sample B shift 0.12, Sample C mean 0.03)
_LEVEL_THRESHOLDS: list[tuple[float, str]] = [
    (0.70, "high"),
    (0.55, "good"),
    (0.30, "medium"),
    (0.15, "low"),
]


def classify_level(similarity: float | None) -> str:
    """
    Raw cosine similarity 값을 5단계 level로 분류합니다.

    Thresholds (raw cosine similarity 기준):
        >= 0.70  → high      (초록: 자연스러운 연결)
        >= 0.55  → good      (연초록: 양호한 연결)
        >= 0.30  → medium    (노랑: 중간 전환)
        >= 0.15  → low       (연주황: 약한 전환)
        <  0.15  → very-low  (빨강: 급격한 주제 전환)
        None     → base      (첫 문장, 비교 대상 없음)
    """
    if similarity is None:
        return "base"
    for threshold, level in _LEVEL_THRESHOLDS:
        if similarity >= threshold:
            return level
    return "very-low"


def analyze_flow(text: str) -> dict:
    """
    텍스트의 문장 흐름을 분석합니다.

    Returns:
        {
            "sentences":      ["문장1", "문장2", ...],
            "similarities":   [None, 0.82, 0.45, ...],
            "sentence_count": int,
            "flow": [
                {
                    "text":       str,
                    "similarity": float | None,
                    "normalized": float | None,  # min-max (문서 내)
                    "level":      str,
                },
                ...
            ]
        }
    """
    if not text or not text.strip():
        raise ValueError("입력 텍스트가 비어있습니다.")

    sentences = split_sentences(text)

    if len(sentences) <= 1:
        raise ValueError(
            f"분석 가능한 문장이 {len(sentences)}개입니다. 최소 2개 이상 필요합니다."
        )

    embeddings = embed_sentences(sentences)
    raw_sims = compute_similarities(embeddings)

    similarities: list[float | None] = [None] + raw_sims

    # min-max 정규화 (None 제외)
    valid = [s for s in similarities if s is not None]
    min_s = min(valid) if valid else 0.0
    max_s = max(valid) if valid else 1.0

    def _normalize(sim: float | None) -> float | None:
        if sim is None:
            return None
        if max_s == min_s:
            return 0.5
        return round((sim - min_s) / (max_s - min_s), 4)

    flow = [
        {
            "text":       sent,
            "similarity": round(sim, 4) if sim is not None else None,
            "normalized": _normalize(sim),
            "level":      classify_level(sim),
        }
        for sent, sim in zip(sentences, similarities)
    ]

    return {
        "sentences":      sentences,
        "similarities":   similarities,
        "sentence_count": len(sentences),
        "flow":           flow,
    }


# ─── Test Samples ─────────────────────────────────────────────────────────────

_SAMPLE_A = """
The ocean has always been a source of wonder for those who live along its shores. Growing up in a coastal town, I spent countless afternoons watching the tides shift and the light change across the water. Those early years gave me an instinct for the sea's rhythms long before I understood the science behind them.
It was not until university that I began studying marine biology in earnest. My first professor had a habit of saying that the ocean does not reveal itself to the impatient, and I have carried that idea with me ever since. Patience, I came to understand, is not passive waiting but an active form of attention.
That attention led me to spend three summers on a research vessel off the coast of Iceland, cataloguing kelp forest ecosystems. The work was meticulous and often repetitive, yet each dive brought small surprises that no dataset could have predicted. A nudibranch tucked beneath a frond, a current shift that moved an entire school of fish overnight — these moments reminded me that nature always contains more than our models account for.
Back in the lab, translating those field observations into publishable findings required a completely different kind of discipline. Writing science demands clarity above all else, and I rewrote certain sections of my thesis more than a dozen times before they said exactly what I meant. The frustration of that process taught me more about rigorous thinking than any single experiment had.
Now, teaching my own students, I find myself repeating my old professor's words almost without thinking. The best ones are not always the fastest or the most technically gifted — they are the ones who learn to sit with a question long enough for it to open up.
"""

_SAMPLE_B = """
Ocean acidification is a direct consequence of rising carbon dioxide levels in the atmosphere.
As the oceans absorb excess CO2, the water becomes more acidic, threatening marine ecosystems.
Coral reefs are among the most vulnerable structures, already experiencing widespread bleaching events.
Many fish species that depend on healthy reef systems face declining populations as a result.
By the way, I recently started learning to play the guitar and it has been a wonderful hobby.
I have been practicing scales every morning before work, which helps me start the day with a calm mind.
My guitar teacher says I have made remarkable progress for someone who has only been playing for three months.
But returning to the ocean, marine biologists are developing new coral restoration techniques.
These efforts involve growing coral fragments in underwater nurseries and transplanting them to damaged reefs.
International cooperation is essential to protect these ecosystems before irreversible damage occurs.
"""

_SAMPLE_C = """
The Eiffel Tower was completed in 1889 as the entrance arch for the World's Fair in Paris.
Photosynthesis is the process by which plants convert sunlight into chemical energy stored as glucose.
The Python programming language was first released in 1991 by Guido van Rossum.
Elephants are the largest land animals on Earth and are known for their remarkable memory.
The Great Wall of China stretches over thirteen thousand miles across northern China.
Quantum mechanics describes the physical properties of nature at the atomic and subatomic scale.
The human heart beats approximately one hundred thousand times per day to circulate blood.
Jazz music originated in New Orleans in the early twentieth century from blues and ragtime traditions.
The Amazon rainforest produces approximately twenty percent of the world's oxygen supply.
Mount Everest, located in the Himalayas, is the highest mountain above sea level at 8,849 meters.
"""

SAMPLES = {
    "A - Coherent essay (high similarities expected)":      _SAMPLE_A.strip(),
    "B - Mid-essay topic shift (low similarity at shift)":  _SAMPLE_B.strip(),
    "C - Random topics per sentence (low overall)":        _SAMPLE_C.strip(),
}


def _print_result(label: str, result: dict) -> None:
    sims = [s for s in result["similarities"] if s is not None]
    print(f"\n{'─' * 60}")
    print(f"  {label}")
    print(f"{'─' * 60}")
    print(f"  Sentences : {result['sentence_count']}")
    print(f"  Min sim   : {min(sims):.4f}")
    print(f"  Max sim   : {max(sims):.4f}")
    print(f"  Mean sim  : {sum(sims) / len(sims):.4f}")
    print()
    for i, (sent, sim) in enumerate(
        zip(result["sentences"], result["similarities"])
    ):
        label_str = "  N/A " if sim is None else f"{sim:.4f}"
        print(f"  [{label_str}]  {sent[:80]}")


if __name__ == "__main__":
    print("=" * 60)
    print("  ColoRead - sentence_embedder.py  테스트 실행")
    print("  (첫 실행 시 SBERT 모델 다운로드에 시간이 걸릴 수 있습니다)")
    print("=" * 60)

    for sample_label, sample_text in SAMPLES.items():
        result = analyze_flow(sample_text)
        _print_result(sample_label, result)

    print(f"\n{'=' * 60}")
    print("  완료")
    print("=" * 60)
