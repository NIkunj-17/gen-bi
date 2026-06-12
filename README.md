# Gen-BI — Generative Business Intelligence

> Ask questions about your data in plain English and get SQL, charts, and insights instantly.

Gen-BI is a full-stack AI-powered Business Intelligence platform that converts natural language questions into SQL queries, executes them against real databases, and automatically visualizes the results.

Built on top of research benchmarking Large Language Models (LLMs) for NL-to-SQL conversion using the Spider dataset.

---

## Features

### Natural Language to SQL

Ask questions such as:

> "Show me the top 5 customers by revenue."

and instantly receive:

* Generated SQL query
* Query explanation
* Tabular results
* Interactive visualizations

### Smart Visualization

Automatically selects the most appropriate chart type:

* Bar Charts
* Line Charts
* Pie Charts
* Scatter Plots

### Multi-Database Support

* Built-in Spider benchmark databases
* PostgreSQL databases
* CSV uploads
* Excel uploads

### Conversational Analytics

Supports follow-up questions such as:

> "Now show only last month's data."

### Error Recovery

If generated SQL fails:

1. Error is captured
2. LLM receives database error feedback
3. Query is regenerated automatically

### Redis Caching

Frequently executed queries are cached for sub-second response times.

### Authentication & Authorization

* JWT Authentication
* Secure password hashing (bcrypt)
* Role-based access control

### Data Upload

Upload:

* CSV files
* XLSX files
* XLS files

and query them immediately using natural language.

### Export Results

Export query results as CSV.

---

## Tech Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| Frontend       | React + TypeScript + Tailwind CSS + Recharts |
| Backend        | FastAPI + SQLAlchemy                         |
| LLM            | Groq API (Llama 3.3 70B)                     |
| Database       | PostgreSQL 16                                |
| Cache          | Redis                                        |
| Authentication | JWT + bcrypt                                 |
| Deployment     | Docker + Docker Compose                      |

---

## System Architecture

```text
User Question (Natural Language)
           │
           ▼
      FastAPI Backend
           │
           ▼
      Schema Service
           │
           ▼
       Groq LLM
(SQL Generation + Chart Config)
           │
           ▼
      SQL Executor
           │
           ▼
      Error Recovery
           │
           ▼
       Redis Cache
           │
           ▼
     React Frontend
(Table + Charts + Insights)
```

---

## Research Foundation

This project is inspired by research conducted on the Spider benchmark dataset, a cross-domain text-to-SQL benchmark containing:

* 200+ databases
* 138 domains
* Thousands of natural language questions

### Key Findings Applied

* Database schema injection significantly improves SQL accuracy.
* Sample row injection reduces hallucinations on joins.
* PostgreSQL-specific prompts prevent SQLite syntax errors.
* LLM-based retry mechanisms improve failed query recovery rates.

---

## Demo Databases

Three Spider benchmark databases are included.

| Database  | Tables                                       |
| --------- | -------------------------------------------- |
| college_2 | student, instructor, course, advisor         |
| car_1     | car_makers, cars_data, car_names, countries  |
| store_1   | invoices, customers, tracks, albums, artists |

### Example Questions

#### college_2

```sql
Show average salary by department
```

#### car_1

```sql
Which car makers are from the USA?
```

#### store_1

```sql
Show total revenue by year
```

---

## Installation

### Prerequisites

* Python 3.11+
* Node.js 18+
* PostgreSQL
* Redis
* Groq API Key

---

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://postgres:password@localhost/genbi
REDIS_URL=redis://localhost:6379

JWT_SECRET_KEY=your-secret-key

GROQ_API_KEY=your-groq-api-key
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Running Locally

### Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

Backend runs at:

```text
http://localhost:8000
```

---

### Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

## Running with Docker

### Clone Repository

```bash
git clone https://github.com/NIkunj-17/gen-bi.git

cd gen-bi
```

### Configure Environment

```bash
cp .env.docker .env
```

Add your:

```env
GROQ_API_KEY=your-key
```

### Start Services

```bash
docker-compose up --build
```

---

## API Endpoints

| Method | Endpoint             | Description        |
| ------ | -------------------- | ------------------ |
| POST   | /api/auth/register   | Register user      |
| POST   | /api/auth/login/json | Login              |
| GET    | /api/auth/me         | Current user       |
| POST   | /api/query           | NL → SQL execution |
| POST   | /api/upload          | Upload CSV/Excel   |
| GET    | /api/schemas         | Available schemas  |
| GET    | /api/my-tables       | Uploaded tables    |
| GET    | /api/health          | Health check       |

---

## Project Structure

```text
gen-bi/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   └── services/
│   │
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       └── config.ts
│
├── docker-compose.yml
├── README.md
└── .env
```

---

## Future Improvements

* Database connection wizard
* Dashboard builder
* Scheduled reports
* PDF export
* Multi-user collaboration
* Query sharing
* Fine-tuned NL-to-SQL models
* Vector-based semantic search

---

## License

MIT License
