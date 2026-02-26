# Flash English MVP

1인용 영어 플래시카드 MVP (Next.js + Prisma + TiDB).

## 1) 설치

```bash
npm install
```

## 2) 환경변수

`.env` 파일 생성:

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:4000/DBNAME?sslaccept=strict"
LLM_API_KEY=""
LLM_MODEL="gpt-4.1-mini"
```

## 3) Prisma 마이그레이션

```bash
npx prisma migrate dev --name init
```

## 4) 실행

```bash
npm run dev
```

## 필수 API

- `POST /api/cards`
- `POST /api/sentences/suggest`
- `GET /api/study/today?limit=20&newLimit=10`
- `POST /api/reviews`

## 화면

- `/` 홈
- `/add` 카드 추가
- `/study` 학습
- `/cards` 목록/검색
- `/cards/[id]` 상세/편집
