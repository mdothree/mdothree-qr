// qrGenerator.js — Build QR content strings for different content types

export function buildQRContent(type, fields = {}) {
  switch (type) {
    case 'url':
      return fields.url || '';

    case 'text':
      return fields.text || '';

    case 'wifi': {
      const { wifiSSID = '', wifiPass = '', wifiSec = 'WPA', wifiHidden = false } = fields;
      const hidden = wifiHidden ? 'H:true;' : '';
      return `WIFI:T:${wifiSec};S:${escapeWifi(wifiSSID)};P:${escapeWifi(wifiPass)};${hidden};`;
    }

    case 'vcard': {
      const { vcFirst = '', vcLast = '', vcPhone = '', vcEmail = '', vcOrg = '', vcUrl = '' } = fields;
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${vcFirst} ${vcLast}`.trim(),
        `N:${vcLast};${vcFirst};;;`,
        vcPhone ? `TEL:${vcPhone}` : '',
        vcEmail ? `EMAIL:${vcEmail}` : '',
        vcOrg   ? `ORG:${vcOrg}` : '',
        vcUrl   ? `URL:${vcUrl}` : '',
        'END:VCARD',
      ].filter(Boolean).join('\n');
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

function escapeWifi(str) {
  return str.replace(/([\\";,:])/g, '\\$1');
}
