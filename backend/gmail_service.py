import os
import base64
import re
from typing import List, Dict
from email.utils import parsedate_to_datetime

try:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False


def clean_html(raw_html: str) -> str:
    """Strip HTML tags and collapse whitespace."""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, ' ', raw_html)
    return ' '.join(cleantext.split())


def _extract_body(payload: dict) -> str:
    """Recursively extract plain text body from a MIME payload."""
    mime_type = payload.get('mimeType', '')

    # Direct text/plain body
    if mime_type == 'text/plain':
        data = payload.get('body', {}).get('data')
        if data:
            return base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')

    # Multipart – recurse into parts
    if 'parts' in payload:
        # Prefer text/plain over text/html
        plain_body = ''
        html_body = ''
        for part in payload['parts']:
            part_body = _extract_body(part)
            if part.get('mimeType') == 'text/plain' and part_body:
                plain_body = part_body
            elif part.get('mimeType') == 'text/html' and part_body:
                html_body = clean_html(part_body)
            elif part_body:
                plain_body = plain_body or part_body
        return plain_body or html_body

    # Fallback: top-level body data (possibly HTML)
    data = payload.get('body', {}).get('data')
    if data:
        text = base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')
        if mime_type == 'text/html':
            return clean_html(text)
        return text

    return ''


def fetch_emails_from_gmail(access_token: str, max_results: int = 15) -> List[Dict]:
    """
    Fetch latest emails using a short-lived OAuth access token.
    Credentials are NEVER stored server-side.
    """
    if not GOOGLE_API_AVAILABLE:
        raise Exception("Google API Python Client is not installed. Run: pip install google-api-python-client google-auth")

    creds = Credentials(token=access_token)

    service = build('gmail', 'v1', credentials=creds)
    results = service.users().messages().list(userId='me', maxResults=max_results).execute()
    messages = results.get('messages', [])

    email_data = []

    for msg in messages:
        msg_id = msg['id']
        message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()

        payload = message.get('payload', {})
        headers = {h['name'].lower(): h['value'] for h in payload.get('headers', [])}

        subject = headers.get('subject', '(No Subject)')
        sender = headers.get('from', 'Unknown Sender')
        date_raw = headers.get('date', '')

        # Parse date
        date_str = ''
        try:
            if date_raw:
                dt = parsedate_to_datetime(date_raw)
                date_str = dt.strftime('%b %d, %Y %H:%M')
        except Exception:
            date_str = date_raw[:20] if date_raw else ''

        body = _extract_body(payload)
        if not body.strip():
            body = '(Empty Body)'

        email_data.append({
            "id": msg_id,
            "sender": sender,
            "subject": subject,
            "body": body[:1200],
            "date": date_str,
        })

    return email_data


def generate_mock_emails() -> List[Dict]:
    """
    Rich set of mock emails for demonstration — spans phishing, spam, and legitimate.
    """
    return [
        {
            "id": "mock_1",
            "sender": "security-alert@paypa1-verify.com",
            "subject": "ACTION REQUIRED: Your Account Has Been Limited",
            "body": "Dear Customer, we detected unusual sign-in activity on your PayPal account. Your access has been temporarily restricted. Click here to restore access immediately: http://192.168.10.254/paypal-verify or your account will be permanently suspended within 24 hours.",
            "date": "Apr 19, 2026 08:03",
        },
        {
            "id": "mock_2",
            "sender": "noreply@github.com",
            "subject": "Your weekly GitHub digest",
            "body": "Here are the top trending repositories this week! Explore new open source projects in AI, web development, and systems programming. Check out what the community is building.",
            "date": "Apr 19, 2026 06:00",
        },
        {
            "id": "mock_3",
            "sender": "prize-claim@lottery-win.online",
            "subject": "CONGRATULATIONS!!! YOU ARE A WINNER — CLAIM $10,000 NOW",
            "body": "You have been randomly selected as the GRAND PRIZE WINNER in our international lottery draw! To claim your FREE reward of $10,000, reply immediately with your full name, address and bank details.",
            "date": "Apr 18, 2026 23:47",
        },
        {
            "id": "mock_4",
            "sender": "team@company-internal.com",
            "subject": "Q3 Planning Meeting Rescheduled",
            "body": "Hi team, the Q3 planning meeting has been moved to Thursday at 2:00 PM. Please update your calendars. The agenda document will be shared by EOD today.",
            "date": "Apr 18, 2026 14:30",
        },
        {
            "id": "mock_5",
            "sender": "offers@amaz0n-deals.xyz",
            "subject": "URGENT: Your Order Is On Hold — Verify Payment Info",
            "body": "Dear Amazon Customer, your recent order #113-3948273 is on hold due to a payment issue. Please verify your credit card information immediately at http://amaz0n-secure-checkout.tk/verify to avoid cancellation.",
            "date": "Apr 18, 2026 11:12",
        },
        {
            "id": "mock_6",
            "sender": "newsletter@producthunt.com",
            "subject": "Today's top products — April 19",
            "body": "Good morning! Here are today's top products on Product Hunt. Discover the newest tools in AI, productivity, and design that makers are shipping today.",
            "date": "Apr 19, 2026 07:30",
        },
        {
            "id": "mock_7",
            "sender": "hr@yourcompany.com",
            "subject": "Reminder: Submit Your Timesheet by Friday",
            "body": "This is a friendly reminder that timesheets for this week are due by Friday 5:00 PM. Please log into the HR portal and submit your hours. Contact hr@yourcompany.com with any questions.",
            "date": "Apr 17, 2026 09:00",
        },
        {
            "id": "mock_8",
            "sender": "win@free-iphone16-claim.cf",
            "subject": "You have been selected to WIN a FREE iPhone 16 Pro!!!",
            "body": "CLAIM YOUR FREE IPHONE 16 PRO NOW!!! You are the lucky visitor #1000000! Click the link and fill in your details to claim your prize before it expires in 10 minutes! http://free-prize.cf/claim",
            "date": "Apr 17, 2026 03:21",
        },
    ]
