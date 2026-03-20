// qrDecoder.js — QR code decoding service wrapping jsQR
// jsQR must be loaded as a global script before calling decode()

export async function decodeQRFromFile(file, { maxDim = 1200 } = {}) {
  const bitmap = await createImageBitmap(file);
  const scale  = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width  * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);

  if (typeof jsQR === 'undefined') throw new Error('jsQR library not loaded');
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });
  if (!result) throw new Error('No QR code found in this image');
  return { text: result.data, location: result.location, canvas };
}

export function detectContentType(text) {
  if (/^https?:\/\//i.test(text))      return { type: 'url',   label: '🔗 URL',               isLink: true };
  if (/^WIFI:/i.test(text))             return { type: 'wifi',  label: '📶 WiFi Credentials',  isLink: false };
  if (/^BEGIN:VCARD/i.test(text))       return { type: 'vcard', label: '👤 Contact (vCard)',    isLink: false };
  if (/^mailto:/i.test(text))           return { type: 'email', label: '📧 Email',              isLink: true };
  if (/^smsto:/i.test(text))            return { type: 'sms',   label: '💬 SMS',               isLink: false };
  if (/^tel:/i.test(text))              return { type: 'phone', label: '📞 Phone Number',       isLink: true };
  return { type: 'text', label: '📄 Plain Text', isLink: false };
}
