"""
Gmail IMAP service — connects using email + App Password.
This is how real email clients (Thunderbird, Outlook) work.
Credentials are NEVER stored. They are used once per request and discarded.

To generate a Gmail App Password:
  1. Go to https://myaccount.google.com/security
  2. Enable 2-Step Verification (required)
  3. Go to https://myaccount.google.com/apppasswords
  4. Create a new app password for "Mail" → "Other (custom name)"
  5. Use the 16-character code as your app password here
"""
import imaplib
import email as email_lib
from email.header import decode_header as _decode_header
from email.utils import parsedate_to_datetime
from typing import List, Dict
import re


# ── Helpers ───────────────────────────────────────────────────────────────────

def _decode(value) -> str:
    """Decode an encoded email header value reliably."""
    if value is None:
        return ''
    parts = _decode_header(str(value))
    result = []
    for part, charset in parts:
        if isinstance(part, bytes):
            result.append(part.decode(charset or 'utf-8', errors='replace'))
        else:
            result.append(str(part))
    return ''.join(result)


def _clean_html(html: str) -> str:
    """Strip HTML tags and collapse whitespace."""
    text = re.sub(r'<[^>]+>', ' ', html)
    return ' '.join(text.split())


def _extract_body(msg) -> str:
    """Recursively extract plain text from a MIME message."""
    if msg.is_multipart():
        plain = ''
        html  = ''
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get('Content-Disposition', ''))
            if 'attachment' in cd:
                continue
            try:
                payload = part.get_payload(decode=True)
                if payload is None:
                    continue
                charset = part.get_content_charset() or 'utf-8'
                text = payload.decode(charset, errors='replace')
                if ct == 'text/plain' and not plain:
                    plain = text
                elif ct == 'text/html' and not html:
                    html = _clean_html(text)
            except Exception:
                continue
        return plain or html or ''
    else:
        try:
            payload = msg.get_payload(decode=True)
            if payload is None:
                return ''
            charset = msg.get_content_charset() or 'utf-8'
            text = payload.decode(charset, errors='replace')
            if msg.get_content_type() == 'text/html':
                return _clean_html(text)
            return text
        except Exception:
            return ''


def _parse_date(date_str: str) -> str:
    """Convert RFC 2822 date string to a human-readable format."""
    try:
        dt = parsedate_to_datetime(date_str)
        return dt.strftime('%b %d, %Y %H:%M')
    except Exception:
        return date_str[:20] if date_str else ''


# ── Main fetch function ───────────────────────────────────────────────────────

def fetch_gmail_via_imap(
    email_address: str,
    app_password: str,
    max_results: int = 15,
    folder: str = 'INBOX',
) -> List[Dict]:
    """
    Fetch latest emails from Gmail via IMAP using an App Password.
    Credentials are used transiently and never persisted.
    """
    mail = imaplib.IMAP4_SSL('imap.gmail.com', 993)

    try:
        mail.login(email_address, app_password)
    except imaplib.IMAP4.error as e:
        raise PermissionError(
            "Gmail authentication failed. Make sure:\n"
            "  1. IMAP is enabled in Gmail Settings → See all settings → Forwarding and POP/IMAP\n"
            "  2. You are using an App Password, not your regular Gmail password\n"
            "  3. 2-Step Verification is enabled on your Google Account\n\n"
            f"Original error: {e}"
        )

    try:
        mail.select(folder)
        _status, data = mail.search(None, 'ALL')
        all_ids = data[0].split()

        # Take the latest N
        selected_ids = all_ids[-max_results:][::-1]

        emails: List[Dict] = []

        for eid in selected_ids:
            try:
                _s, raw = mail.fetch(eid, '(RFC822)')
                if not raw or not raw[0]:
                    continue
                raw_bytes = raw[0][1] if isinstance(raw[0], tuple) else raw[0]
                msg = email_lib.message_from_bytes(raw_bytes)

                subject = _decode(msg.get('Subject', '(No Subject)'))
                sender  = _decode(msg.get('From', 'Unknown Sender'))
                date    = _parse_date(msg.get('Date', ''))
                body    = _extract_body(msg)

                emails.append({
                    'id':      eid.decode(),
                    'sender':  sender,
                    'subject': subject or '(No Subject)',
                    'body':    (body[:1200] if body else '(Empty)'),
                    'date':    date,
                })
            except Exception:
                continue  # skip malformed messages silently

        return emails

    finally:
        try:
            mail.logout()
        except Exception:
            pass
