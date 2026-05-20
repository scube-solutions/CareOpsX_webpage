const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── SMTP CONFIG ───────────────────────────────────────────────
const SMTP_HOST     = 'smtp.hostinger.com';   // change if different host
const SMTP_PORT     = 465;
const SMTP_SECURE   = true;                   // true for port 465, false for 587
const SMTP_USER     = 'info@careopsx.co.in';  // sending address
const SMTP_PASS     = 'YOUR_EMAIL_PASSWORD';  // ← replace with real password
const MAIL_TO       = 'info@careopsx.co.in';  // receiving address
// ───────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CareOpsX server running → http://localhost:${PORT}`));
