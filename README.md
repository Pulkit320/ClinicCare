# 🏥 ClinicCare - AI-Powered Healthcare Appointment & Pre-Triage Platform

ClinicCare is a modern, full-stack healthcare scheduling and AI pre-triage web application built with **React**, **Express.js**, **Prisma ORM**, **PostgreSQL (Neon Cloud)**, and **Google Gemini 2.5 Flash AI**.

---

## 🌟 Key Features

- **🤖 Gemini AI Pre-Triage Briefs**: Evaluates patient symptoms before consultations, providing urgency classification (`HIGH`, `MEDIUM`, `LOW`) and generating suggested doctor questions.
- **📄 1-Click PDF Exporter**: Export official, printable PDF summaries for both AI Pre-Visit Briefs and Doctor Post-Visit Care Plans.
- **📅 Google Calendar Sync**: Automatic Google Calendar event creation and interactive calendar invitations dispatched to patients.
- **📜 Patient Medical History Timeline**: View past consultations, doctor observations, prescriptions, and status updates.
- **🩺 Doctor Consultation Portal**: Real-time patient queue, AI pre-visit briefs, clinical notes editor, and patient-friendly post-visit summary generator.
- **🛡️ Admin Operations & Leave Conflict Manager**: Manage doctor schedules and automatically resolve/cancel conflicting appointments when doctors record leave dates.
- **💎 Apple Health Glassmorphism UI**: High-end translucent glass styling, responsive sidebar navigation, ambient background gradients, and micro-interactions.

---

## 🛠️ Project Setup & Installation Guide

### Prerequisites
- **Node.js**: `v18.x` or higher
- **PostgreSQL Database**: Neon Cloud PostgreSQL or local instance
- **Google Gemini API Key**: From Google AI Studio
- **Google OAuth 2.0 Credentials**: Client ID, Client Secret, and Refresh Token

---

### Step 1: Clone Repository
```bash
git clone https://github.com/Pulkit320/ClinicCare.git
cd ClinicCare
```

---

### Step 2: Backend Setup & Environment Variables
Navigate to the `backend/` directory:
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@ep-wandering-sunset-axdupvre-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your_jwt_secret_key"
CLIENT_URL="https://clinic-care-phi.vercel.app"

# Google Gemini AI Key
GEMINI_API_KEY="your_gemini_api_key"

# Google Calendar API (OAuth2)
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="https://developers.google.com/oauthplayground"
GOOGLE_REFRESH_TOKEN="your_google_refresh_token"

# SMTP Email Dispatch (Optional: Ethereal test account used by default if empty)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
```

Run Prisma Database Migrations & Seed Initial Data:
```bash
npx prisma db push
node prisma/seed.js
npm run dev
```

---

### Step 3: Frontend Setup & Environment Variables
Navigate to the `frontend/` directory:
```bash
cd ../frontend
npm install
```

Create a `.env` file inside `frontend/`:
```env
VITE_API_BASE_URL="https://cliniccare-1hho.onrender.com/api"
```

Start Vite Development Server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser!

---

## 🔑 Demo Login Credentials (Post-Seed)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Patient** | `alice@example.com` | `password123` |
| **Doctor** | `drsmith@example.com` | `password123` |
| **Admin** | `admin@example.com` | `password123` |

---

## 📅 Google Calendar API Integration Setup Steps

To enable automatic Google Calendar event creation and email calendar invites:

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Click **Create Project** and name it `ClinicCare`.
2. **Enable Google Calendar API**:
   - In Google Cloud Console, navigate to **APIs & Services > Library**.
   - Search for **Google Calendar API** and click **Enable**.
3. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services > OAuth consent screen**.
   - Select **External**, fill in app details, and add test user emails.
4. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services > Credentials > Create Credentials > OAuth Client ID**.
   - Select **Web Application**.
   - Set Authorized Redirect URI: `https://developers.google.com/oauthplayground`.
   - Copy your **Client ID** and **Client Secret** into `backend/.env`.
5. **Generate Refresh Token via OAuth Playground**:
   - Open [Google OAuth Playground](https://developers.google.com/oauthplayground).
   - Click gear icon ⚙️ -> Check **Use your own OAuth credentials** -> Enter Client ID & Secret.
   - In Step 1, select `https://www.googleapis.com/auth/calendar` -> Click **Authorize APIs**.
   - In Step 2, click **Exchange authorization code for tokens**.
   - Copy the generated `refresh_token` into `GOOGLE_REFRESH_TOKEN` in `backend/.env`.

---

## 🤖 LLM Prompts & Gemini Integration

### 1. Pre-Visit Triage Prompt (`backend/src/services/llmService.js`)
```text
Analyze these patient symptoms and return a JSON object with keys:
- "urgency": ("Low", "Medium", "High")
- "chiefComplaint": concise summary of the primary complaint
- "questions": array of exactly 3 suggested questions for the doctor

Symptoms: {symptoms}
```

### 2. Post-Visit Summary Prompt (`backend/src/services/llmService.js`)
```text
Convert these clinical notes into a patient-friendly JSON object with keys:
- "patientSummary": easy-to-understand patient summary of the visit
- "medicationSchedule": schedule of prescribed medications (name, dosage, frequency)
- "followUpSteps": actionable next steps and follow-up guidance

Clinical Notes: {clinicalNotes}
```

---

## 🗄️ Database Schema Breakdown (`prisma/schema.prisma`)

- **`User`**: System accounts (`PATIENT`, `DOCTOR`, `ADMIN`).
- **`DoctorProfile`**: Doctor working hours (`09:00-17:00`), slot durations (`30` mins), and leave days JSON array.
- **`Slot`**: Individual 30-min time slots (`date`, `startTime`, `endTime`, `isBooked`, `holdUntil`).
- **`Appointment`**: Consultation record connecting `patientId`, `doctorId`, `slotId`, symptoms, and Google Calendar event ID.
- **`LLMSummary`**: Stores generated AI summaries (`PRE_VISIT` or `POST_VISIT`), urgency badges, and raw text.
- **`MedicationReminder`**: Patient medication schedule and cron notification status.

---

## 📡 REST API Documentation

### Auth Endpoints
- `POST /api/auth/register` - Create patient/doctor user account.
- `POST /api/auth/login` - Authenticate user & return JWT token.

### Slot & Booking Endpoints
- `GET /api/slots/available?doctorId=1&date=YYYY-MM-DD` - Fetch time slots & leave status.
- `POST /api/slots/book` - Atomically book slot, trigger Gemini AI triage, sync GCal, & send email confirmation.
- `GET /api/slots/my-appointments` - Fetch patient's past & upcoming appointment history.

### Doctor & Admin Endpoints
- `GET /api/doctors` - List available doctors.
- `POST /api/doctors/:id/leave` - Record doctor leave date & automatically cancel conflicting appointments.

### LLM AI Endpoints
- `POST /api/llm/pre-visit` - Trigger Gemini Pre-Visit urgency brief.
- `POST /api/llm/post-visit` - Trigger Gemini Post-Visit patient summary.

---

## 📄 License
Distributed under the MIT License.
