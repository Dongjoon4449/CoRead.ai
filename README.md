# CoRead.ai

> Visualize the flow of your writing. Understand where your ideas connect — and where they don't.

CoRead.ai는 글의 문장 간 의미적 연결성을 색으로 시각화하는 글쓰기 분석 도구입니다.
문단의 흐름이 자연스러운지, 어느 지점에서 주제나 구조가 바뀌는지를 직관적으로 파악할 수 있습니다.

---

## Why CoRead.ai?

기존 글쓰기 도구(Grammarly, Hemingway 등)는 문법, 가독성, 단어 선택에 집중합니다.
CoRead.ai는 다른 질문을 던집니다.

- 이 문장과 다음 문장이 얼마나 이어져 있는가?
- 어디서 주제가 갑자기 튀는가?
- 내 글의 논리적 흐름이 독자에게 자연스럽게 전달되는가?

에세이를 쓰는 학생, 글의 구조를 점검하고 싶은 작가, 비영어권 영어 글쓰기를 하는 사용자 모두에게 유용합니다.

---

## Features

### 1. Flow Visualization *(메인 기능, 개발 중)*
문장/문단 간 의미적 유사도를 색상으로 시각화합니다.

- Sentence-BERT 임베딩으로 각 문장을 벡터로 변환
- 인접 문장 간 Cosine Similarity 계산
- 유사도 → HSL 색공간 매핑
- 색 변화가 작으면 흐름이 자연스러운 것, 색이 확 튀면 주제 전환 지점

### 2. Professionalism Scoring *(보조 기능, 개발 완료)*
글의 문체 특성을 6개 지표로 분석하고, 각 지표가 얼마나 전문적인지를 퍼센트로 보여줍니다.

종합 점수는 참고용입니다. 진짜 가치는 **지표별 피드백**에 있습니다.

> "문장 길이는 학술 논문 수준이지만, 수동태 사용은 중간 수준입니다."

---

## Professionalism Scoring 상세

### 분석 지표

| 지표 | 설명 |
|---|---|
| `avg_word_length` | 평균 단어 길이 — 전문적일수록 길어짐 |
| `avg_sentence_length` | 평균 문장 길이 — 전문적일수록 길어짐 |
| `passive_voice_ratio` | 수동태 비율 — 학술 문체일수록 높아짐 |
| `nominalization_ratio` | 명사화 비율 — 격식체일수록 높아짐 |
| `complex_sentence_ratio` | 복문 비율 — 논리적 연결이 많을수록 높아짐 |
| `jargon_ratio` | 전문 용어 비율 — Google 10K + wordfreq 기반 판정 |

### 장르 카테고리

```
Academic Paper   ← 전문성 최상단
Magazine / Editorial  ← 중간
Blog / Casual Writing  ← 전문성 최하단
```

### 출력 예시

```json
{
  "estimated_score": 61.3,
  "estimated_level": "Middle",
  "disclaimer": "이 점수는 참고용입니다. 분야나 문체에 따라 실제 전문성과 다를 수 있습니다.",
  "metrics": {
    "avg_sentence_length": {
      "raw": 28.57,
      "professionalism": 87.2,
      "level_probs": { "Low": 0.006, "Middle": 0.143, "High": 0.852 },
      "level": "High",
      "feedback": "문장 길이가 학술 논문 수준입니다."
    },
    "passive_voice_ratio": {
      "raw": 0.16,
      "professionalism": 59.9,
      "level_probs": { "Low": 0.130, "Middle": 0.579, "High": 0.292 },
      "level": "Middle",
      "feedback": "수동태가 중간 수준으로 사용되고 있습니다."
    }
  }
}
```

---

## Project Structure

```
ColoRead/
├── professionalism_scorer.py   # 6개 지표 raw 값 계산
├── baseline_calculator.py      # 장르별 샘플 텍스트로 기준점 계산
├── baseline.json               # 카테고리별 지표 평균값 저장
├── normalizer.py               # raw 값 → professionalism % 변환 + 피드백 생성
└── data/
    ├── high/                   # Academic Paper 샘플 텍스트
    ├── middle/                 # Magazine / Editorial 샘플 텍스트
    └── low/                    # Blog / Casual Writing 샘플 텍스트
```

---

## How It Works

### Professionalism Scoring 파이프라인

```
Training Samples (장르별 20~30개)
    → baseline_calculator.py
    → 카테고리별 지표 평균 계산
    → baseline.json 저장

새 문서 입력
    → professionalism_scorer.py → raw 지표값 6개
    → normalizer.py
        → level_probs 계산 (Softmax, 각 카테고리까지의 거리 기반)
        → professionalism % 계산 (Low×0.15 + Middle×0.55 + High×0.90)
        → 가중 평균 → 종합 점수
    → 지표별 피드백 + 종합 점수 출력
```

### Flow Visualization 파이프라인 *(개발 중)*

```
텍스트 입력
    → 문장/문단 분리
    → Sentence-BERT 임베딩 (벡터 변환)
    → 인접 문장 간 Cosine Similarity 계산
    → 유사도 → HSL 색상 매핑
    → 시각화 출력
```

---

## Tech Stack

| 기술 | 용도 |
|---|---|
| Python | 전체 백엔드 |
| spaCy | 토큰화, 품사 태깅, 문장 분리 |
| wordfreq | 단어 빈도 기반 전문용어 판정 |
| Google 10K Most Common Words | 일반 어휘 필터 |
| Sentence-BERT *(예정)* | 문장 임베딩 |
| Gemini API *(예정)* | 자연어 피드백 생성 |

---

## Usage

### Professionalism Scoring

```bash
python normalizer.py path/to/your_essay.txt
```

### Baseline 재계산 (샘플 데이터 추가 후)

```bash
python baseline_calculator.py
```

---

## Roadmap

- [x] 6개 지표 계산 (`professionalism_scorer.py`)
- [x] 장르별 기준점 산출 (`baseline_calculator.py` + `baseline.json`)
- [x] 전문 용어 판정 개선 (Google 10K + wordfreq)
- [x] Professionalism % 출력 (`normalizer.py`)
- [ ] 문장 임베딩 (Sentence-BERT)
- [ ] Flow Visualization (Cosine Similarity + HSL 색상 매핑)
- [ ] 웹 인터페이스

---

## Notes

Professionalism Scoring의 종합 점수는 참고용입니다.
같은 학술 논문이라도 분야나 저자 스타일에 따라 Middle로 나올 수 있습니다.
이는 오류가 아니라 그 글의 실제 문체 특성을 반영한 결과입니다.
지표별 피드백을 함께 확인하는 것을 권장합니다.
