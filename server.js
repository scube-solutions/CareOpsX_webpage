const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── SMTP CONFIG ───────────────────────────────────────────────
const SMTP_HOST     = 'smtp.gmail.com';   // change if different host
const SMTP_PORT     = 587;
const SMTP_SECURE   = false;                   // true for port 465, false for 587
const SMTP_USER     = 'kammarisumanth@scube.solutions';  // sending address
const SMTP_PASS     = 'vmzx wxgo hkkh jbgv';  // ← replace with real password
const MAIL_TO       = 'kammarisumanth@scube.solutions';  // receiving address
// ───────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

function buildTable(fields) {
  const rows = Object.entries(fields)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `<tr><td style="padding:8px 12px;font-weight:600;color:#0b1220;background:#f6f8fc;border:1px solid #e5eaf2;white-space:nowrap">${k}</td><td style="padding:8px 12px;border:1px solid #e5eaf2;color:#334155">${v || '—'}</td></tr>`)
    .join('');
  return `<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">${rows}</table>`;
}

app.post('/api/send', async (req, res) => {
  const { _subject, _type, ...fields } = req.body;

  const subject = _subject || `CareOpsX ${_type === 'demo' ? 'Demo Request' : 'Contact Request'}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0a1a3f,#12265a);padding:24px 28px;border-radius:10px 10px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">${subject}</h2>
        <p style="color:#a6b1c5;margin:6px 0 0;font-size:13px">Received via CareOpsX website</p>
      </div>
      <div style="background:#fff;padding:24px 28px;border:1px solid #e5eaf2;border-top:0;border-radius:0 0 10px 10px">
        ${buildTable(fields)}
        <p style="margin-top:20px;font-size:12px;color:#5b6a85">
          Sent from careopsx.co.in · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"CareOpsX Website" <${SMTP_USER}>`,
      to: MAIL_TO,
      replyTo: fields['Work Email'] || fields['Email Address'] || SMTP_USER,
      subject,
      html,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── ADMIN CONFIG ──────────────────────────────────────────────
const ADMIN_URL          = 'https://demo.careopsx.co.in';
const ADMIN_REGISTER_API = 'https://care-opsx-api.vercel.app/auth/admin-register';
// NOTE: API is on registration branch — not merged to main yet.
// Once deployed, accounts will be created automatically.
// Until then, falls back to email-only flow.
// ───────────────────────────────────────────────────────────────

const REGISTRATIONS_FILE = path.join(__dirname, 'registrations.json');

function loadRegistrations() {
  try { return JSON.parse(fs.readFileSync(REGISTRATIONS_FILE, 'utf8')); }
  catch { return []; }
}

function saveRegistration(record) {
  const list = loadRegistrations();
  list.push(record);
  fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(list, null, 2));
}

const PLAN_LABELS = {
  basic:   'Basic — ₹1,499/mo (1 doctor, 4 users, 100 patients)',
  premium: 'Premium — ₹2,999/mo (5 doctors, 20 users, unlimited patients)',
};

app.post('/api/register', async (req, res) => {
  const { plan, email, displayName, orgName, phone, password } = req.body;

  // Validate required fields
  if (!plan || !email || !displayName || !orgName || !phone || !password) {
    return res.status(400).json({ ok: false, error: 'All fields are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address.' });
  }
  if (!/^\d{10}$/.test(phone.replace(/\s/g, ''))) {
    return res.status(400).json({ ok: false, error: 'Phone must be 10 digits.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters.' });
  }

  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const planLabel = PLAN_LABELS[plan] || plan;

  // ── Call admin registration API ────────────────────────────────
  let adminApiStatus = 'pending';
  let adminApiError  = '';
  try {
    const apiRes = await fetch(ADMIN_REGISTER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        display_name: displayName,
        org_name:     orgName,
        phone,
        password,
        plan,
      }),
    });
    const apiData = await apiRes.json().catch(() => ({}));
    if (apiRes.ok) {
      adminApiStatus = 'created';
    } else {
      adminApiStatus = 'failed';
      adminApiError  = apiData?.message || `HTTP ${apiRes.status}`;
      console.warn('Admin API error:', adminApiError);
    }
  } catch (err) {
    adminApiStatus = 'unreachable';
    adminApiError  = err.message;
    console.warn('Admin API unreachable (not deployed yet?):', err.message);
  }

  // Save to local log (without password)
  saveRegistration({ id: Date.now(), plan, email, displayName, orgName, phone, adminApiStatus, registeredAt: timestamp });

  // ── Email to admin ─────────────────────────────────────────────
  const adminHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0a1a3f,#12265a);padding:24px 28px;border-radius:10px 10px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">🆕 New Account Registration</h2>
        <p style="color:#a6b1c5;margin:6px 0 0;font-size:13px">${timestamp} IST · careopsx.co.in</p>
      </div>
      <div style="background:#fff;padding:24px 28px;border:1px solid #e5eaf2;border-top:0;border-radius:0 0 10px 10px">
        <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:8px 12px;font-weight:600;background:#f6f8fc;border:1px solid #e5eaf2;white-space:nowrap">Plan</td><td style="padding:8px 12px;border:1px solid #e5eaf2;color:#0d9488;font-weight:700">${planLabel}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;background:#f6f8fc;border:1px solid #e5eaf2;white-space:nowrap">Display Name</td><td style="padding:8px 12px;border:1px solid #e5eaf2">${displayName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;background:#f6f8fc;border:1px solid #e5eaf2;white-space:nowrap">Organization</td><td style="padding:8px 12px;border:1px solid #e5eaf2">${orgName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;background:#f6f8fc;border:1px solid #e5eaf2;white-space:nowrap">Email</td><td style="padding:8px 12px;border:1px solid #e5eaf2"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;background:#f6f8fc;border:1px solid #e5eaf2;white-space:nowrap">Phone</td><td style="padding:8px 12px;border:1px solid #e5eaf2">${phone}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;background:#f6f8fc;border:1px solid #e5eaf2;white-space:nowrap">Password</td><td style="padding:8px 12px;border:1px solid #e5eaf2;font-family:monospace">${password}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;background:#f6f8fc;border:1px solid #e5eaf2;white-space:nowrap">API Status</td><td style="padding:8px 12px;border:1px solid #e5eaf2;font-weight:700;color:${adminApiStatus==='created'?'#166534':adminApiStatus==='failed'?'#b91c1c':'#92400e'}">${adminApiStatus.toUpperCase()}${adminApiError ? ' — ' + adminApiError : ''}</td></tr>
        </table>
        <div style="margin-top:20px;padding:14px 16px;background:${adminApiStatus==='created'?'#f0fdf4':'#fff7ed'};border:1px solid ${adminApiStatus==='created'?'#bbf7d0':'#fed7aa'};border-radius:8px">
          <p style="margin:0;font-size:13px;font-weight:600;color:${adminApiStatus==='created'?'#166534':'#92400e'}">${adminApiStatus==='created'?'✅ Account auto-created in admin system':'⚠️ API not live yet — manually create this account in admin panel'}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#5b6a85">→ <a href="${ADMIN_URL}" style="color:#0d9488">${ADMIN_URL}</a></p>
        </div>
      </div>
    </div>
  `;

  // ── Welcome email to user ──────────────────────────────────────
  const userHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0a1a3f,#12265a);padding:32px 28px;border-radius:10px 10px 0 0;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">Welcome to CareOpsX!</h1>
        <p style="color:#a6b1c5;margin:10px 0 0;font-size:14px">Your account is being set up</p>
      </div>
      <div style="background:#fff;padding:28px;border:1px solid #e5eaf2;border-top:0;border-radius:0 0 10px 10px">
        <p style="color:#334155;font-size:15px">Hi <strong>${displayName}</strong>,</p>
        <p style="color:#334155;font-size:14px;line-height:1.7">Thank you for registering with CareOpsX. Our team has received your account request and will activate it within <strong>one business day</strong>.</p>
        <div style="margin:20px 0;padding:16px;background:#f6f8fc;border-radius:8px;border:1px solid #e5eaf2">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0b1220">Your registration details:</p>
          <p style="margin:4px 0;font-size:13px;color:#334155">📋 <strong>Plan:</strong> ${planLabel}</p>
          <p style="margin:4px 0;font-size:13px;color:#334155">🏥 <strong>Organization:</strong> ${orgName}</p>
          <p style="margin:4px 0;font-size:13px;color:#334155">📧 <strong>Email:</strong> ${email}</p>
        </div>
        <p style="color:#334155;font-size:14px;line-height:1.7">Once activated, you can login at:</p>
        <div style="text-align:center;margin:16px 0">
          <a href="${ADMIN_URL}" style="display:inline-block;background:#14b8a6;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">Access CareOpsX Dashboard →</a>
        </div>
        <p style="color:#5b6a85;font-size:12px;margin-top:24px">Questions? Call +91 96666 69377 or email <a href="mailto:info@careopsx.co.in" style="color:#0d9488">info@careopsx.co.in</a></p>
      </div>
    </div>
  `;

  try {
    await Promise.all([
      transporter.sendMail({
        from: `"CareOpsX Website" <${SMTP_USER}>`,
        to: MAIL_TO,
        replyTo: email,
        subject: `🆕 New Registration: ${displayName} (${orgName}) — ${plan.toUpperCase()} plan`,
        html: adminHtml,
      }),
      transporter.sendMail({
        from: `"CareOpsX" <${SMTP_USER}>`,
        to: email,
        subject: 'Welcome to CareOpsX — Account Registration Received',
        html: userHtml,
      }),
    ]);

    res.json({ ok: true, redirectUrl: ADMIN_URL });
  } catch (err) {
    console.error('Register mail error:', err.message);
    // Still save the registration even if email fails
    res.status(500).json({ ok: false, error: 'Registration saved but email failed. We will contact you shortly.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CareOpsX server running → http://localhost:${PORT}`));
