# Notes App

React 19 + TypeScript + Vite 기반 노트 앱 실습 프로젝트.

## 시작하기

```bash
# 저장소 클론
git clone git@github.com:frongt/ccwork.git
cd ccwork

# 의존성 설치
npm install

# 개발 서버 실행 (프론트 + JSON Server 동시 실행)
npm run dev
```

- 앱: http://localhost:5173
- API: http://localhost:3001/notes

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 포맷 |
| `npm test` | 테스트 실행 |

## 프로젝트 구조

```
src/
├── api/          # JSON Server API 호출
├── components/   # UI 컴포넌트
├── context/      # React Context (전역 상태)
└── types/        # TypeScript 타입 정의
```

## 아키텍처

### 데이터 흐름

컴포넌트는 `api/notes.ts`를 직접 호출하지 않고 항상 `useNotes()`를 거친다.

```mermaid
flowchart LR
  UI["components/*<br/>NoteList · NoteEditor"] -->|useNotes| CTX["NotesContext<br/>notes 전역 상태"]
  CTX -->|"import * as api"| API["api/notes.ts<br/>fetch 래퍼"]
  API -->|HTTP :3001| DB[("db.json<br/>JSON Server")]
```

### 컴포넌트 트리

`App`이 UI 상태(`selectedNoteId`, `isCreating`)를 소유하고 props로 내려준다. 서버 데이터는 `NotesContext`가 소유한다.

```mermaid
flowchart TD
  App["App<br/>selectedNoteId · isCreating"]
  Provider["NotesProvider<br/>notes · loading · error"]
  Layout["Layout<br/>헤더 + 2단 레이아웃"]
  NoteList["NoteList<br/>useNotes()"]
  NoteItem["NoteItem<br/>표현 컴포넌트"]
  NoteEditor["NoteEditor<br/>useNotes() · title · content"]

  App --> Provider --> Layout
  Layout -->|sidebar| NoteList --> NoteItem
  Layout -->|main| NoteEditor

  classDef data fill:#e8f0fe,stroke:#4a6fa5
  classDef pure fill:#f5f5f5,stroke:#999
  class Provider,NoteList,NoteEditor data
  class Layout,NoteItem pure
```

파란색은 `useNotes()`로 데이터를 아는 컴포넌트, 회색은 props만 받는 표현 컴포넌트다.

### 저장 시퀀스

변경 함수는 API 호출이 성공한 뒤에만 로컬 state를 갱신한다(낙관적 업데이트 없음).

```mermaid
sequenceDiagram
  participant E as NoteEditor
  participant C as NotesContext
  participant A as api/notes.ts
  participant S as JSON Server

  E->>C: createNote / updateNote
  C->>A: api.createNote / api.updateNote
  A->>S: POST / PATCH
  S-->>A: 저장된 Note
  A-->>C: Note
  C->>C: setNotes(prev => ...)
  C-->>E: resolve
  E->>E: onDone() 호출
```
