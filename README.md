# CareOpsX Website

Marketing website for CareOpsX — Hospital Management Platform.

## Pages

| File | Description |
|------|-------------|
| `index.html` | Landing page — hero, features, pricing, contact form |
| `book-demo.html` | Standalone demo booking page |

## Stack

- Static HTML/CSS/JS (no framework)
- Node.js + Express (serves files + email API)
- Nodemailer (SMTP email delivery)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure SMTP credentials

Open `server.js` and update the config block at the top:

```js
const SMTP_HOST   = 'smtp.hostinger.com';   // your SMTP host
const SMTP_PORT   = 465;                    // 465 (SSL) or 587 (TLS)
const SMTP_SECURE = true;                   // true for 465, false for 587
const SMTP_USER   = 'info@careopsx.co.in';  // your email address
const SMTP_PASS   = 'YOUR_EMAIL_PASSWORD';  // ← set this
const MAIL_TO     = 'info@careopsx.co.in';  // where emails are delivered
```

**Common SMTP hosts:**

| Provider | Host | Port |
|----------|------|------|
| Hostinger | `smtp.hostinger.com` | 465 |
| Gmail (App Password) | `smtp.gmail.com` | 587 |
| Zoho | `smtp.zoho.in` | 465 |
| Outlook/Office365 | `smtp.office365.com` | 587 |

### 3. Run

```bash
# Production
npm start

# Development (auto-restart on file change)
npm run dev
```

Site available at: **http://localhost:3000**

## How emails work

Both forms POST JSON to `/api/send` → `server.js` sends via SMTP → arrives at `info@careopsx.co.in`.

| Form | Trigger | Subject |
|------|---------|---------|
| Contact (index.html) | "Submit Request" | `CareOpsX Contact Request from <name>` |
| Book Demo (book-demo.html) | "Schedule My Free Demo" | `CareOpsX Demo Request from <name>` |

Email arrives as a branded HTML table with all submitted fields.

## Git branches

| Branch | Description |
|--------|-------------|
| `main` | Original codebase |
| `Anil` | All active development |

## Deployment

For production hosting (VPS / cPanel with Node.js support):

1. Upload all files
2. Set `SMTP_PASS` (use environment variable in production — do not commit the password)
3. Run `npm start` or configure PM2:

```bash
pm2 start server.js --name careopsx-web
pm2 save
```

## Contact

- Email: info@careopsx.co.in
- Phone: +91 96666 69377
- Address: 18-399/6/c/1, Shadnagar, Hyderabad 509216
