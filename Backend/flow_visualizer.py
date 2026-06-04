# ColoRead - flow_visualizer.py
"""
유사도 리스트를 HSL 색상으로 변환하여 터미널에 시각화합니다.

의존성:
    sentence_embedder.py (같은 디렉토리에 위치해야 합니다)

주의:
    ANSI truecolor 출력을 사용합니다.
    Windows Terminal, VS Code 터미널, macOS/Linux 터미널에서 정상 동작합니다.
    구버전 Windows CMD에서는 색상이 표시되지 않을 수 있습니다.
"""

import math
from sentence_embedder import SAMPLES, analyze_flow


# ─── Color Conversion ─────────────────────────────────────────────────────────

def normalize_similarities(
    similarities: list[float | None],
) -> list[float | None]:
    """
    유사도 리스트를 min-max 정규화합니다.

    None(첫 문장)은 계산에서 제외하고 그대로 None으로 유지합니다.
    모든 값이 동일하거나 유효 값이 1개 이하인 경우 0.5로 채웁니다.
    """
    valid = [s for s in similarities if s is not None]
    if len(valid) == 0:
        return similarities

    min_s, max_s = min(valid), max(valid)

    if max_s == min_s:
        # 모든 유사도가 동일 → 중간값으로 처리
        return [None if s is None else 0.5 for s in similarities]

    return [
        None if s is None else (s - min_s) / (max_s - min_s)
        for s in similarities
    ]


def similarity_to_hsl(normalized_value: float) -> tuple[int, int, int]:
    """
    정규화된 유사도(0.0~1.0)를 (H, S, L) 튜플로 변환합니다.

    H: 0(빨강) ~ 120(초록)
    S: 70% 고정
    L: 50% 고정
    """
    h = int(normalized_value * 120)
    return (h, 70, 50)


def _hsl_to_rgb(h: int, s: int, l: int) -> tuple[int, int, int]:
    """HSL(0-360, 0-100, 0-100)을 RGB(0-255)로 변환합니다."""
    s_f = s / 100.0
    l_f = l / 100.0

    c = (1 - abs(2 * l_f - 1)) * s_f
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l_f - c / 2

    if h < 60:
        r1, g1, b1 = c, x, 0.0
    elif h < 120:
        r1, g1, b1 = x, c, 0.0
    elif h < 180:
        r1, g1, b1 = 0.0, c, x
    elif h < 240:
        r1, g1, b1 = 0.0, x, c
    elif h < 300:
        r1, g1, b1 = x, 0.0, c
    else:
        r1, g1, b1 = c, 0.0, x

    r = round((r1 + m) * 255)
    g = round((g1 + m) * 255)
    b = round((b1 + m) * 255)
    return (r, g, b)


def hsl_to_ansi(h: int, s: int, l: int) -> str:
    """
    HSL 값을 터미널 ANSI truecolor 전경색 코드로 변환합니다.

    Returns:
        ANSI escape sequence 문자열 (e.g. '\033[38;2;255;100;0m')
    """
    r, g, b = _hsl_to_rgb(h, s, l)
    return f"\033[38;2;{r};{g};{b}m"


_RESET = "\033[0m"
_GRAY  = "\033[38;2;140;140;140m"
_BLOCK = "████"
_MAX_SENTENCE_LEN = 70


def visualize_flow(analysis_result: dict) -> None:
    """
    analyze_flow()의 반환값을 받아 각 문장을 색상 블록과 함께 출력합니다.

    출력 형식:
        ████  [N/A ]  Climate change is one of the most pressing issues...
        ████  [0.89]  The primary driver of this phenomenon is greenhouse...
        ████  [0.41]  Meanwhile, I had pasta for dinner last night.

    색상 블록은 해당 문장과 이전 문장 사이의 유사도를 나타냅니다.
    첫 문장은 비교 대상이 없으므로 회색으로 표시합니다.
    """
    sentences = analysis_result["sentences"]
    raw_sims  = analysis_result["similarities"]

    normalized = normalize_similarities(raw_sims)

    separator = "━" * 64
    print(separator)

    for sent, norm_val, raw_val in zip(sentences, normalized, raw_sims):
        truncated = sent[:_MAX_SENTENCE_LEN] + ("…" if len(sent) > _MAX_SENTENCE_LEN else "")

        if norm_val is None:
            color_code = _GRAY
            sim_label  = " N/A "
        else:
            h, s, l   = similarity_to_hsl(norm_val)
            color_code = hsl_to_ansi(h, s, l)
            sim_label  = f"{raw_val:.3f}"

        print(f"{color_code}{_BLOCK}{_RESET}  [{sim_label}]  {truncated}")

    print(separator)

    # 유효 유사도 통계 출력
    valid_raw = [s for s in raw_sims if s is not None]
    if valid_raw:
        print(
            f"  min={min(valid_raw):.4f}  "
            f"max={max(valid_raw):.4f}  "
            f"mean={sum(valid_raw)/len(valid_raw):.4f}"
        )


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 64)
    print("  ColoRead - flow_visualizer.py  테스트 실행")
    print("=" * 64)

    for label, text in SAMPLES.items():
        print(f"\n\n  ▶  {label}\n")
        result = analyze_flow(text)
        visualize_flow(result)

    print("\n" + "=" * 64)
    print("  완료")
    print("=" * 64)
