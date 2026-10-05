---
name: mermaid-diagram
description: src/ 코드를 분석해 Mermaid 다이어그램(모듈 의존성, 컴포넌트 관계, 상태 흐름, UI 상태 전이, 동작 시퀀스)으로 시각화하고 docs/architecture.html 한 파일로 저장해 브라우저로 여는 스킬. 사용자가 "아키텍처 시각화", "구조도", "의존성 그래프/다이어그램", "컴포넌트 관계도", "상태 흐름도", "mermaid로 그려줘", "docs/architecture.html 갱신"처럼 말하면, 다이어그램이라는 단어가 없어도 프로젝트 구조를 그림으로 보고 싶어 하는 맥락이면 반드시 이 스킬을 사용한다. Use when asked to visualize project architecture, component dependencies, data/state flow, or to generate or refresh docs/architecture.html with Mermaid.
---

# mermaid-diagram

`src/`를 실제로 읽고, 코드에서 확인한 사실만으로 아키텍처 다이어그램을 만든다. 결과물은 `docs/architecture.html` 하나다.

그림이 코드와 어긋나면 문서가 오히려 해가 된다. 그래서 파일을 읽지 않고 이름만 보고 관계를 추측해서 그리지 않는다. 강의용 프로젝트라 수강생이 이 그림을 보고 구조를 배운다는 점도 기억한다.

## 절차

1. **수집**: `src/` 파일 목록과 모든 `import`를 모은다.
   `find src -type f | sort` / `grep -rn "^import" src --include='*.ts' --include='*.tsx'`
2. **읽기**: 컴포넌트, 컨텍스트, API 파일을 직접 읽는다. 각각에서 다음을 뽑는다.
   - props 인터페이스와 콜백 이름 (`onSelect`, `onDone` 등)
   - 쓰는 훅 (`useNotes`, `useState`, `useEffect`)과 소유한 state
   - 호출하는 컨텍스트 함수와 API 엔드포인트
3. **상태 소유자 정리**: 어떤 state가 어디에 있는지 표로 먼저 정리한다. (UI 상태는 `App`, 서버 데이터는 컨텍스트, 폼 값은 컴포넌트 로컬)
4. **다이어그램 작성**: 아래 5종을 만든다. 프로젝트에 해당 요소가 없으면(예: 컨텍스트가 없음) 그 다이어그램은 빼고 이유를 한 줄 남긴다.
5. **저장과 확인**: `docs/architecture.html`에 쓰고 `open docs/architecture.html`로 연다.

## 다이어그램 5종

| # | 제목 | Mermaid 문법 | 보여줄 것 |
|---|---|---|---|
| 1 | 모듈 의존성 | `flowchart TD` | import 방향, 순환 의존성 여부 |
| 2 | 컴포넌트 관계 | `flowchart TD` | 렌더 트리, props는 실선, 콜백은 점선(`-.->`) |
| 3 | 상태 흐름 | `flowchart LR` + `subgraph` | 상태 소유자별 묶음과 흐르는 방향 |
| 4 | UI 상태 전이 | `stateDiagram-v2` | 상태값 조합에 따라 어떤 화면이 되는지 |
| 5 | 동작 시퀀스 | `sequenceDiagram` | 초기 로드, 저장, 삭제 (`rect`로 구간 구분) |

컴포넌트 간 의존성(1, 2번)이 가장 중요하다. 여기에 가장 공을 들인다.

## 색상 규칙

모든 다이어그램에서 같은 의미에는 같은 색을 쓴다. 독자가 색만 보고 역할을 짐작할 수 있어야 한다.

| 의미 | fill | stroke |
|---|---|---|
| 진입점/조립 (`main`, `App`) | `#fff4d6` | `#b8860b` |
| 데이터를 아는 컴포넌트/컨텍스트 | `#dbe8fb` | `#2f5d9e` |
| 표현 컴포넌트 (props만 사용) | `#eeeeea` | `#8a877f` |
| API, 타입, 서버 데이터 | `#dff3e4` | `#2f8a4d` |
| 폼 로컬 상태 | `#f7e0ef` | `#a23b84` |

`classDef`에 `color:#1c1b19`를 함께 지정해야 다크 모드에서도 글자가 읽힌다. 다이어그램마다 범례를 붙인다.

## HTML 규칙

- Mermaid v11을 `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs`에서 ESM으로 불러온다.
- `startOnLoad: false`로 두고 `await mermaid.run({ querySelector: '.mermaid' })`를 호출한다. 다크 모드 여부는 `matchMedia('(prefers-color-scheme: dark)')`로 정해 `theme`에 넘긴다.
- 다이어그램은 `<pre class="mermaid">` 안에 둔다.
- 색은 `:root` CSS 변수로 정의하고 `@media (prefers-color-scheme: dark)`에서 다시 정의한다. 페이지 폭은 모바일에서도 가로 스크롤이 생기지 않게 한다.
- 상단에 섹션 앵커 내비게이션을 두고, 각 섹션에 짧은 해설 1~2줄을 붙인다.
- 본문, 라벨, 주석은 한국어로 쓴다. 코드 식별자는 그대로 둔다.

## Mermaid 문법 주의사항

- 라벨 안의 `=>`는 `=&gt;`로 쓴다. 그냥 쓰면 파싱이 깨진다.
- 라벨 줄바꿈은 `<br/>`다.
- 노드 라벨에 `()`, `|`, `:`가 들어가면 `["..."]`처럼 따옴표로 감싼다.
- 한 다이어그램에 노드가 15개를 넘기면 읽기 어려우니 나누는 걸 고려한다.

## 코드와 다른 동작을 다룰 때

`CLAUDE.md`에 "알려진 불일치"가 있는 부분(예: 새 노트 저장 후 선택 상태, 취소 시 폼 미복원)은 실제 코드 동작대로 그리고, 다이어그램 아래 주석으로 불일치를 알려 준다. 의도인지 실수인지 확인된 바 없으므로 그림에서 "고친" 모양으로 그리지 않는다.

## 하지 않는 것

- `src/`, `README.md` 등 다른 파일을 수정하지 않는다. 출력은 `docs/architecture.html` 하나다.
- 기존 `docs/architecture.html`이 있으면 덮어쓴다. 코드가 바뀐 만큼 처음부터 다시 만드는 편이 그림과 코드의 일치를 보장한다.
- 커밋하지 않는다. 사용자가 요청할 때만 한다.

## 마무리 보고

끝나면 사용자에게 다음을 알린다.
- 만든 다이어그램 목록과, 뺀 것이 있다면 이유
- 코드에서 직접 읽어서 확인한 부분과 문서(`CLAUDE.md`)에 의존한 부분의 구분
- 브라우저 렌더링을 직접 확인했는지 여부. 확인하지 못했다면 그렇게 말한다.
