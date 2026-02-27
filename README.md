# Flash English MVP

1인용 영어 플래시카드 MVP (Next.js + Prisma + MySQL/TiDB).

## 로컬 테스트 빠른 시작

### 1) 설치

```bash
npm install
```

### 2) 환경변수 준비

```bash
cp .env.example .env
```

기본값은 로컬 Docker MySQL 기준입니다.

```bash
DATABASE_URL="mysql://flash:flashpass@127.0.0.1:3306/flash_english"
LLM_API_KEY=""
LLM_MODEL="gpt-4.1-mini"
```

`LLM_API_KEY`가 비어 있어도 문장 추천 API는 fallback 문장으로 동작합니다.

### 3) 로컬 DB 실행 (Docker)

```bash
npm run db:up
```

DB 로그 확인:

```bash
npm run db:logs
```

중지:

```bash
npm run db:down
```

### 4) Prisma 마이그레이션

```bash
npm run prisma:migrate -- --name init
```

### 5) 앱 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 로컬 API 체크 예시

### 카드 추가

```bash
curl -X POST http://localhost:3000/api/cards \
  -H "Content-Type: application/json" \
  -d '{"word":"both","sentence":"They both like cake after lunch.","meaning_kr":"둘 다"}'
```

### 오늘 학습 목록

```bash
curl "http://localhost:3000/api/study/today?limit=20&newLimit=10"
```

## 화면

- `/` 홈
- `/add` 카드 추가
- `/study` 학습
- `/cards` 목록/검색
- `/cards/[id]` 상세/편집

## 배포 환경(TiDB) 사용 시

Render/TiDB를 쓸 때는 `.env`의 `DATABASE_URL`만 TiDB 연결 문자열로 교체하면 됩니다.
