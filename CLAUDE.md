# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 목적

React 19 + TypeScript + Vite 기반 **노트 앱 실습/강의용 프로젝트**다. 제품이 아니라 학습용 베이스 코드이고, 강의 중에 기능을 점진적으로 추가하는 것을 전제로 한다.

- `src/types/note.ts`에 `tags` 필드가 "아직 없음 — 강의에서 추가할 것"이라는 주석이 있다. 이는 의도적으로 비워 둔 확장 지점이다. 태그 기능을 추가할 때는 `Note` 타입, `db.json` 데이터, API 계층, 컨텍스트, UI를 함께 수정한다.
- 테스트 인프라(Vitest, RTL, jsdom)는 설정돼 있지만 테스트 파일은 아직 없다.
- README, UI 문구, 주석은 모두 한국어다. 새로 쓰는 UI 문구와 주석도 한국어로 맞춘다.

## Commands

- `npm run dev` — Vite(http://localhost:5173)와 JSON Server(http://localhost:3001)를 `concurrently`로 동시 실행
- `npm run server` — JSON Server만 실행 (`db.json`, 포트 3001)
- `npm run build` — `tsc && vite build` (번들 전에 타입 체크)
- `npm run lint` — `eslint . --fix` (자동 수정이므로 파일이 변경됨)
- `npm run format` — `prettier --write .`
- `npm test` — `vitest run` (1회 실행), `npm run test:watch`는 watch 모드
- 단일 테스트: `npx vitest run path/to/file.test.tsx` 또는 `npx vitest run -t "테스트 이름"`

**주의:** JSON Server는 `db.json`에 직접 쓴다. 앱을 사용하거나 API를 호출하면 git에 추적되는 `db.json`이 바뀌므로, 커밋 전에 의도하지 않은 데이터 변경이 섞이지 않았는지 확인한다.

## 현재 구조

```
src/
├── main.tsx                  # StrictMode + createRoot 진입점
├── App.tsx                   # UI 선택 상태 + Provider/Layout 조립
├── api/notes.ts              # JSON Server fetch 래퍼 (CRUD)
├── context/NotesContext.tsx  # 노트 전역 상태 + useNotes 훅
├── components/
│   ├── Layout.tsx            # 헤더 + 사이드바/메인 2단 레이아웃
│   ├── NoteList.tsx          # 로딩/에러/빈 상태 분기 + 목록 렌더
│   ├── NoteItem.tsx          # 목록 카드 1개 (선택, 삭제)
│   └── NoteEditor.tsx        # 생성/편집 겸용 폼
├── types/note.ts             # Note 인터페이스
├── index.css                 # Tailwind 4 @theme 디자인 토큰
└── test-setup.ts             # jest-dom 매처 등록
```

### 데이터 흐름

`components/*` → `useNotes()` → `NotesContext` → `api/notes.ts` → JSON Server(`db.json`)

- 서버 데이터의 단일 출처는 `NotesContext`다. 컴포넌트에서 `api/notes.ts`를 직접 호출하지 않는다.
- UI 상태(`selectedNoteId`, `isCreating`)는 서버 데이터와 분리해 `App.tsx`가 소유하고 props로 내려준다. 전역 컨텍스트에 넣지 않는다.

## 구현 패턴

**API 계층 (`api/notes.ts`)**
- 함수 단위 `fetch` 래퍼이고, `!res.ok`이면 `throw new Error('Failed to ...')`한다.
- `API_URL`이 하드코딩돼 있다(`http://localhost:3001`). Vite 프록시나 env 변수는 쓰지 않는다.
- `createdAt`/`updatedAt`은 서버가 아니라 **클라이언트에서** ISO 문자열로 채운다. `updateNote`는 `PATCH`이고 `updatedAt`을 자동 갱신한다.
- `id`는 JSON Server가 부여하며, 타입은 `string`이다.
- 규칙:
  - 함수 하나가 엔드포인트 하나를 맡고 `Promise<Note>` / `Promise<Note[]>` / `Promise<void>`를 명시적으로 반환한다. 삭제만 `void`다.
  - URL은 템플릿 리터럴(`` `${API_URL}/notes/${id}` ``)로 만든다.
  - 쓰기 요청은 `headers: { 'Content-Type': 'application/json' }` + `JSON.stringify(...)` 본문을 쓴다.
  - 입력 타입은 `Omit<Note, 'id' | 'createdAt' | 'updatedAt'>`(생성), `Partial<Note>`(수정)처럼 `Note`에서 파생한다. 별도 DTO 타입을 만들지 않는다.
  - API 계층에서는 `try/catch`를 쓰지 않는다. 실패는 throw로 올리고 처리는 상위(컨텍스트, 컴포넌트)에서 한다.
  - 성공 응답은 `return res.json()`으로 그대로 반환한다. 응답 가공이나 검증은 하지 않는다.

**상태 관리 (`NotesContext`)**
- 변경 함수(`createNote`/`updateNote`/`deleteNote`)는 API 호출이 **성공한 뒤에** 로컬 state를 갱신한다. 낙관적 업데이트는 없다.
- 변경 함수는 에러를 삼키지 않고 throw한다. 호출한 컴포넌트가 `try/catch`로 처리한다 (`NoteEditor.handleSave` 참고). 반면 `error` 상태는 초기 `fetchNotes` 실패에만 쓰인다.
- `useNotes()`는 Provider 밖에서 호출하면 throw한다.
- 새 노트는 `[...prev, newNote]`로 목록 끝에 붙는다.
- 규칙:
  - 라이브러리 없이 `useState` + Context만 쓴다 (Redux, Zustand, React Query 없음). 컨텍스트는 `notes` 하나뿐이고, 도메인을 늘릴 때만 컨텍스트를 새로 만든다.
  - 목록 state 갱신은 항상 함수형 업데이트(`setNotes((prev) => ...)`)와 불변 연산(`[...prev, x]`, `.map`, `.filter`)을 쓴다.
  - 수정 후에는 PATCH 응답(`updated`)으로 해당 항목을 교체한다. 재조회(refetch)는 하지 않는다.
  - 초기 로드는 Provider의 `useEffect(..., [])`에서 `.then().catch().finally()` 체인으로 한다. `loading`은 `true`로 시작해 `finally`에서 내린다.
  - 폼 입력값은 컴포넌트 로컬 `useState`로 들고(controlled input), 저장할 때만 컨텍스트 함수로 넘긴다.
  - 저장 중 상태(`saving`)는 `try/finally`로 반드시 해제한다.
  - Context value 객체는 메모이제이션하지 않는다 (`useMemo`/`useCallback` 없음).

**컴포넌트**
- 함수 컴포넌트 + named export (`export function X`). 기본 export는 `App`만 쓴다.
- props 인터페이스를 컴포넌트 바로 위에 `XxxProps`로 선언한다.
- `Layout`은 `sidebar`/`main`을 `ReactNode` 슬롯 props로 받는다.
- 목록/편집 컴포넌트는 로딩, 에러, 빈 상태를 early return으로 분기한다.
- `NoteEditor`는 생성(`isCreating`)과 편집(`selectedNoteId`)을 한 컴포넌트에서 처리한다. 선택이 바뀌면 `useEffect`로 폼 로컬 state(`title`/`content`)를 동기화한다. 이 effect의 deps는 의도적으로 `[selectedNoteId, isCreating]`만 두고 `react-hooks/exhaustive-deps`를 disable했다. `selectedNote`를 deps에 넣으면 저장 후 폼이 덮어써지므로 주의한다.
- **에러 처리 규칙: `alert()`는 쓰지 않는다. 에러는 `catch`에서 `console.error`로만 처리한다.** `NoteEditor`(제목 누락, 저장 실패)와 `NoteList`(삭제 실패)가 이 방식을 따른다. 삭제에는 확인 절차가 없다.
- 이벤트 중첩이 있으면 `stopPropagation`을 쓴다 (`NoteItem`의 삭제 버튼).
- 규칙:
  - 데이터를 아는 컴포넌트와 표현 컴포넌트를 구분한다. `NoteList`/`NoteEditor`는 `useNotes()`를 직접 호출하고, `NoteItem`/`Layout`은 props만 받는 순수 표현 컴포넌트다. 새 표현 컴포넌트에는 `useNotes()`를 넣지 않는다.
  - 목록 아이템은 `key={note.id}`를 쓴다.
  - 렌더 중 파생 값(`selectedNote`)은 state로 복제하지 않고 `notes.find(...)`로 계산한다.
  - 빈 값 표시는 `note.title || '(제목 없음)'`처럼 컴포넌트 안에서 처리한다.
  - 클릭 가능한 요소에는 `cursor-pointer`를 명시한다. 현재 코드는 `<div onClick>`/`<button>`을 쓰며 접근성 속성(role, aria)은 없다.
  - `Layout`의 본문 높이는 `calc(100vh - 65px)`(헤더 높이)로 고정돼 있다. 헤더 높이를 바꾸면 함께 수정한다.

**스타일링**
- Tailwind 4 유틸리티 클래스를 JSX에 직접 쓴다. CSS 모듈이나 styled-components는 쓰지 않는다.
- 색상은 `index.css`의 `@theme` 토큰(`background`, `card`, `foreground`, `muted`, `muted-foreground`, `border`, `destructive`)만 쓴다. 하드코딩한 색 값을 새로 도입하지 않는다.
- 카드형 둥근 모서리(`rounded-2xl`/`rounded-3xl`), 버튼은 `bg-foreground text-card rounded-xl` 조합, 섹션 라벨은 `text-xs uppercase tracking-widest` 조합이 반복된다. 새 UI도 이 패턴을 따른다.
- 날짜는 `toLocaleDateString('ko-KR')`로 표시한다.

## 네이밍 규칙

코드에서 일관되게 관찰되는 규칙이다. 새 코드도 같은 이름 체계를 따른다.

| 대상 | 규칙 | 예 |
|------|------|-----|
| 컴포넌트 파일 | PascalCase, 파일명 = 컴포넌트명 | `NoteEditor.tsx` → `NoteEditor` |
| 비컴포넌트 파일 | 도메인 단수형 소문자 (`api/`, `types/`), Context만 PascalCase | `api/notes.ts`, `types/note.ts`, `NotesContext.tsx` |
| Props 인터페이스 | `{컴포넌트명}Props`, 컴포넌트 바로 위에 선언 | `NoteItemProps` |
| Context 관련 | `{도메인}Context` / `{도메인}Provider` / `use{도메인}` / `{도메인}ContextType` | `NotesContext`, `NotesProvider`, `useNotes` |
| 콜백 props | `on` + 동사 (명사) | `onSelect`, `onDelete`, `onDone`, `onNewNote` |
| 내부 이벤트 핸들러 | `handle` + 동사 (명사) | `handleSelectNote`, `handleNewNote`, `handleSave` |
| 상태 | `[값, set값]` 쌍 | `[title, setTitle]` |
| 불리언 상태/props | `is` 접두사가 기본. 진행 상태(`loading`, `saving`)는 접두사 없음 | `isSelected`, `isCreating` |
| 모듈 상수 | UPPER_SNAKE_CASE | `API_URL` |

**CRUD 동사는 계층과 무관하게 `create/update/delete`로 통일한다.** `api/notes.ts`와 `NotesContext`가 같은 이름(`createNote`/`updateNote`/`deleteNote`)을 쓴다. `add`/`edit`/`remove` 같은 동의어는 쓰지 않는다. 조회만 api는 `fetchNotes`, 컨텍스트는 `notes` state(마운트 시 자동 로드)다. 컴포넌트 콜백 prop도 같은 동사를 쓴다(`onDelete`).

- 컨텍스트와 api의 이름이 같으므로 컨텍스트에서 api 모듈은 `import * as api from '../api/notes'`로 네임스페이스 import한다.
- 도메인 ID 변수는 `selectedNoteId`, `note.id`처럼 `Note`를 명시한다. 단독 `id`는 함수 인자에서만 쓴다.
- 타입 import는 `import type`이 아니라 일반 `import { Note } ...`를 쓴다. import 경로는 상대 경로(`../types/note`)다. alias는 없다.
- 언어: 코드 식별자와 `throw new Error()` 메시지는 영어(`'Failed to fetch notes'`), 사용자에게 보이는 문구와 주석은 한국어다.

## 알려진 불일치 (코드 읽으며 발견)

의도인지 실수인지 확인된 바 없다. 이 부분을 건드릴 때는 기존 동작을 임의로 "고치지" 말고 사용자에게 먼저 확인한다.

1. **에러가 사용자에게 보이지 않음**: 에러 처리를 `console.error`로만 하므로 제목 누락, 저장/삭제 실패 시 화면에는 아무 변화가 없다. 목록 로드 실패만 인라인 텍스트(`error` state)로 표시한다.
2. **에러 처리 위치**: 저장은 `NoteEditor`, 삭제는 `NoteList`의 `handleDelete`에서 각자 `try/catch`하며 컨텍스트는 처리하지 않고 throw한다.
3. **함수 시그니처 혼재**: `createNote(title, content)`는 위치 인자, `updateNote(id, updates)`는 객체 인자이고, 하위 `api.createNote`는 객체 인자(`{ title, content }`)를 받는다.
4. **불리언 이름**: `isSelected`/`isCreating`과 `loading`/`saving`이 섞여 있다.
5. **생성 후 선택 상태**: `App.handleDone`의 주석은 "저장 후 선택 상태는 유지"인데, 새 노트 생성 시 `selectedNoteId`는 `null`이라 저장 후 빈 안내 화면이 되고 방금 만든 노트는 선택되지 않는다.
6. **취소 동작**: 편집 중 "취소"는 `onDone`만 호출하므로 폼 로컬 state가 원래 값으로 복원되지 않는다 (선택이 그대로라 `useEffect`가 재실행되지 않음).
7. **디자인 토큰 미사용**: `index.css`에 `--font-display`가 정의돼 있으나 `Layout`은 `style={{ fontFamily: 'Boogaloo, sans-serif' }}` 인라인으로 쓴다. 헤더 높이도 `calc(100vh - 65px)` 인라인 style이다.
8. **클릭 요소**: `NoteItem`은 `<div onClick>`(키보드 접근 불가)이고 나머지 동작은 `<button>`이다.

## 코드 스타일 / 설정

- Prettier: 세미콜론, 작은따옴표, 2칸 들여쓰기, trailing comma `all`, printWidth 100.
- TypeScript `strict`에 `noUnusedLocals`/`noUnusedParameters`가 켜져 있어 미사용 변수는 빌드 에러다.
- ESLint 9 flat config(`eslint.config.js`): typescript-eslint recommended + react-hooks + react-refresh. 컴포넌트 파일에서는 컴포넌트가 아닌 것을 export하면 경고가 난다. 단, `NotesContext.tsx`는 Provider와 훅을 함께 export하고 있다.
- 테스트는 Vitest 설정이 `vite.config.ts`의 `test` 블록에 있다 (jsdom, globals 활성화, setup은 `src/test-setup.ts`). 테스트 파일은 `src/` 아래에 두면 `tsc`의 `include: ["src"]`에 포함되므로 타입 체크 대상이 된다.
