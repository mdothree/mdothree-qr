// qrGenerator.js — Build QR content strings for different content types

export function buildQRContent(type, fields = {}) {
  switch (type) {
    case 'url': {
      // "example.com" without a scheme encodes as plain text and phones won't
      // open it as a link; default to https://.
      const url = (fields.url || '').trim();
      if (!url) return '';
      return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    }

    case 'text':
      return fields.text || '';

    case 'wifi': {
      const { wifiSSID = '', wifiPass = '', wifiSec = 'WPA', wifiHidden = false } = fields;
      const hidden = wifiHidden ? 'H:true;' : '';
      const pass = wifiSec === 'nopass' ? '' : `P:${escapeWifi(wifiPass)};`;
      return `WIFI:T:${wifiSec};S:${escapeWifi(wifiSSID)};${pass}${hidden};`;
    }

    case 'vcard': {
      const { vcFirst = '', vcLast = '', vcPhone = '', vcEmail = '', vcOrg = '', vcUrl = '' } = fields;
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${escapeVcard(`${vcFirst} ${vcLast}`.trim())}`,
        `N:${escapeVcard(vcLast)};${escapeVcard(vcFirst)};;;`,
        vcPhone ? `TEL:${escapeVcard(vcPhone)}` : '',
        vcEmail ? `EMAIL:${escapeVcard(vcEmail)}` : '',
        vcOrg   ? `ORG:${escapeVcard(vcOrg)}` : '',
        vcUrl   ? `URL:${escapeVcard(vcUrl)}` : '',
        'END:VCARD',
      ].filter(Boolean).join('\r\n'); // vCard 3.0 requires CRLF
    }

    case 'email': {
      const { emailTo = '', emailSubject = '', emailBody = '' } = fields;
      const params = [];
      if (emailSubject) params.push(`subject=${encodeURIComponent(emailSubject)}`);
      if (emailBody)    params.push(`body=${encodeURIComponent(emailBody)}`);
      return `mailto:${emailTo}${params.length ? '?' + params.join('&') : ''}`;
    }

    case 'sms': {
      const { smsPhone = '', smsMsg = '' } = fields;
      return `smsto:${smsPhone}:${smsMsg}`;
    }

    default:
      return '';
  }
}

/**
 * Return an error message if the required fields for `type` are empty,
 * else null. buildQRContent always returns scaffolding for structured types
 * ("mailto:", "smsto::", "WIFI:T:WPA;S:;;", an empty vCard), so checking its
 * output for emptiness never caught blank forms.
 */
export function validateQRFields(type, f = {}) {
  const blank = (v) => !String(v ?? '').trim();
  switch (type) {
    case 'url':   return blank(f.url) ? 'Enter a URL.' : null;
    case 'text':  return blank(f.text) ? 'Enter some text.' : null;
    case 'wifi':
      if (blank(f.wifiSSID)) return 'Enter the network name (SSID).';
      if (f.wifiSec !== 'nopass' && blank(f.wifiPass)) return 'Enter the WiFi password, or set Security to None.';
      return null;
    case 'vcard': return blank(f.vcFirst) && blank(f.vcLast) ? 'Enter a first or last name.' : null;
    case 'email': return blank(f.emailTo) ? 'Enter the recipient email address (To).' : null;
    case 'sms':   return blank(f.smsPhone) ? 'Enter a phone number.' : null;
    default:      return 'Choose a content type.';
  }
}

function escapeVcard(str) {
  return String(str).replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n');
}

function escapeWifi(str) {
  return str.replace(/([\\";,:])/g, '\\$1');
}
