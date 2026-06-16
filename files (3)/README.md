# 📚 EduPlan — Digital Lesson Plan Management System

A full-stack, market-ready web application for schools to create, file, review, approve and download lesson plans digitally.

---

## Features

### For Teachers
- Create detailed lesson plans (subject, grade, topic, objectives, development, assessment, resources, homework)
- Save as draft or submit directly for review
- View, edit and delete own plans
- Print / download any plan as a formatted PDF with signature fields
- Add post-lesson reflections
- Change password from settings

### For HODs and Reviewers
- Review submitted plans from their department
- Approve plans or return them with comments
- View all plans in the school

### For Principals / Admins
- Full dashboard with school-wide statistics
- Review and approve all submitted plans
- Manage teacher accounts (create, deactivate, reset password)
- Search and filter plans by teacher, subject, grade, term, status

### System-wide
- Role-based access control (teacher / hod / principal / admin)
- Secure JWT authentication with refresh token rotation
- Full-text search across plans
- Pagination and filtering
- Audit-ready: all plans timestamped and signed
- Multi-school ready architecture

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Tailwind CSS, Vite |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL 14+ |
| Auth | JWT (access + refresh tokens), bcrypt |
| PDF | Browser print API (no server dependency) |

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### 2. Clone and install
```bash
git clone <your-repo-url> eduplan
cd eduplan
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Configure the database
```bash
# Create database and user in psql:
psql -U postgres
CREATE DATABASE eduplan_db;
CREATE USER eduplan_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE eduplan_db TO eduplan_user;
\q
```

### 4. Set up environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your DB credentials and JWT secrets
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 5. Run migrations and seed
```bash
npm run db:migrate
npm run db:seed
```

### 6. Start development
```bash
npm run dev
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Demo accounts (after seeding)
| Role | Email | Password |
|---|---|---|
| Principal | principal@sowtoacademy.edu.za | Admin@1234 |
| Teacher (Maths) | n.mokoena@sowtoacademy.edu.za | Teacher@1234 |
| Teacher (Science) | t.nkosi@sowtoacademy.edu.za | Teacher@1234 |
| HOD | l.sithole@sowtoacademy.edu.za | Teacher@1234 |

---

## Deployment

### Option A — Single VPS (Recommended for schools)

**Requirements:** Ubuntu 22.04, 1GB RAM minimum

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone and build
git clone <repo> /var/www/eduplan
cd /var/www/eduplan
npm install
cd backend && npm install && cd ..
cd frontend && npm install && npm run build && cd ..

# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with production values:
#   NODE_ENV=production
#   DATABASE_URL=postgresql://...
#   JWT_SECRET=<64-char random>
#   FRONTEND_URL=https://yourdomain.com

# Migrate and seed
npm run db:migrate
npm run db:seed  # optional — for demo data only

# Start with PM2
pm2 start backend/src/index.js --name eduplan
pm2 save
pm2 startup
```

**Nginx config:**
```nginx
server {
    server_name yourdomain.com;
    root /var/www/eduplan/backend/public;
    index index.html;

    # API proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable HTTPS with Certbot
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

### Option B — Railway / Render / Fly.io (Cloud)

1. Push repo to GitHub
2. Create a new PostgreSQL database on your cloud provider
3. Deploy the backend service, set environment variables
4. Build frontend (`npm run build` in `/frontend`) and serve from backend's `/public`
5. Set `FRONTEND_URL` to your deployed domain

---

### Option C — Docker

A `docker-compose.yml` is included for containerised deployment:

```bash
docker-compose up -d
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | Yes | Full PostgreSQL connection string |
| JWT_SECRET | Yes | Min 32-char random secret |
| REFRESH_TOKEN_SECRET | Yes | Separate secret for refresh tokens |
| PORT | No | API port (default: 4000) |
| NODE_ENV | Yes | `development` or `production` |
| FRONTEND_URL | Yes | Allowed CORS origin |
| SMTP_HOST | No | For password reset emails |
| SMTP_USER | No | Email sender address |
| SMTP_PASS | No | Email app password |

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Sign in, get tokens |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Revoke refresh token |
| GET | /api/auth/me | Current user profile |
| POST | /api/auth/change-password | Update own password |

### Lesson Plans
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /api/lesson-plans | All | List (filtered, paginated) |
| GET | /api/lesson-plans/stats | All | Dashboard stats |
| GET | /api/lesson-plans/:id | All | Get one plan |
| POST | /api/lesson-plans | All | Create plan |
| PATCH | /api/lesson-plans/:id | Owner | Update plan |
| DELETE | /api/lesson-plans/:id | Owner | Delete plan |
| POST | /api/lesson-plans/:id/submit | Teacher | Submit for review |
| POST | /api/lesson-plans/:id/approve | HOD+ | Approve plan |
| POST | /api/lesson-plans/:id/return | HOD+ | Return to teacher |

### Users
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /api/users | Admin | List all school users |
| POST | /api/users | Admin | Create user |
| PATCH | /api/users/:id | Admin/Self | Update profile |
| DELETE | /api/users/:id | Admin | Deactivate user |
| POST | /api/users/:id/reset-password | Admin | Admin password reset |

---

## Multi-School Expansion

The system is architected for multi-school deployment. Each school has its own isolated data via `school_id` on all records. To support multiple schools:

1. Build a school registration/onboarding flow
2. Add a super-admin role that can manage schools
3. Set up subdomain routing: `school1.eduplan.co.za`, `school2.eduplan.co.za`
4. The database schema already handles this — no changes needed

---

## Roadmap / Next Features

- [ ] Email notifications (submission, approval alerts)
- [ ] Bulk export — download all plans for a term as ZIP
- [ ] Lesson plan templates (pre-fill by subject/grade)
- [ ] CAPS/curriculum alignment tagging
- [ ] Annual planning view (all terms, all grades)
- [ ] Mobile app (React Native)
- [ ] School subscription billing

---

## License

Proprietary. All rights reserved.
