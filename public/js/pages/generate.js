// Page controller: generate.html
import { buildQRContent } from '../services/qrGenerator.js';
import { saveToHistory } from '../config/firebase.js';

    let currentType = 'url';
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;
        document.querySelectorAll('[id^="type"]').forEach(el => el.classList.add('hidden'));
        document.getElementById('type' + currentType.charAt(0).toUpperCase() + currentType.slice(1))?.classList.remove('hidden');
      });
    });

    const fgColor = document.getElementById('fgColor');
    const bgColor = document.getElementById('bgColor');
    const fgHex = document.getElementById('fgColorHex');
    const bgHex = document.getElementById('bgColorHex');
    fgColor.addEventListener('input', () => { fgHex.value = fgColor.value; });
    bgColor.addEventListener('input', () => { bgHex.value = bgColor.value; });
    fgHex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(fgHex.value)) fgColor.value = fgHex.value; });
    bgHex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(bgHex.value)) bgColor.value = bgHex.value; });

    const qrSizeSlider = document.getElementById('qrSize');
    const qrSizeVal = document.getElementById('qrSizeVal');
    qrSizeSlider.addEventListener('input', () => { qrSizeVal.textContent = qrSizeSlider.value + 'px'; });

    const generateBtn = document.getElementById('generateBtn');
    const qrCanvas = document.getElementById('qrCanvas');
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    const downloadActions = document.getElementById('downloadActions');
    const alertArea = document.getElementById('alertArea');

    generateBtn.addEventListener('click', async () => {
      generateBtn.disabled = true;
      const content = buildQRContent(currentType, {
        url: document.getElementById('urlInput')?.value,
        text: document.getElementById('textInput')?.value,
        wifiSSID: document.getElementById('wifiSSID')?.value,
        wifiPass: document.getElementById('wifiPass')?.value,
        wifiSec: document.getElementById('wifiSec')?.value,
        wifiHidden: document.getElementById('wifiHidden')?.checked,
        vcFirst: document.getElementById('vcFirst')?.value,
        vcLast: document.getElementById('vcLast')?.value,
        vcPhone: document.getElementById('vcPhone')?.value,
        vcEmail: document.getElementById('vcEmail')?.value,
        vcOrg: document.getElementById('vcOrg')?.value,
        vcUrl: document.getElementById('vcUrl')?.value,
        emailTo: document.getElementById('emailTo')?.value,
        emailSubject: document.getElementById('emailSubject')?.value,
        emailBody: document.getElementById('emailBody')?.value,
        smsPhone: document.getElementById('smsPhone')?.value,
        smsMsg: document.getElementById('smsMsg')?.value,
      });

      if (!content.trim()) {
        alertArea.innerHTML = `<div class="alert alert-error">❌ Please fill in the required fields.</div>`;
        return;
      }

      try {
        const size = parseInt(qrSizeSlider.value);
        await QRCode.toCanvas(qrCanvas, content, {
          width: size,
          color: { dark: fgColor.value, light: bgColor.value },
          errorCorrectionLevel: document.getElementById('errorLevel').value,
          margin: 2,
        });
        qrCanvas.style.display = 'block';
        qrPlaceholder.style.display = 'none';
        downloadActions.style.display = 'flex';
        await saveToHistory('qr-generate', { type: currentType });
        alertArea.innerHTML = '';
      } catch (err) {
        alertArea.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
      } finally {
        generateBtn.disabled = false;
      }
    });

    document.getElementById('dlPng').addEventListener('click', () => {
      const url = qrCanvas.toDataURL('image/png');
      const a = document.createElement('a'); a.href = url; a.download = 'qrcode.png'; a.click();
    });

    document.getElementById('dlSvg').addEventListener('click', async () => {
      const content = qrCanvas.dataset.content || document.getElementById('urlInput').value;
      const svgStr = await QRCode.toString(content, { type: 'svg', color: { dark: fgColor.value, light: bgColor.value }, errorCorrectionLevel: document.getElementById('errorLevel').value });
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'qrcode.svg'; a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('copyDataUrl').addEventListener('click', async () => {
      const dataUrl = qrCanvas.toDataURL('image/png');
      await navigator.clipboard.writeText(dataUrl);
      document.getElementById('copyDataUrl').textContent = '✅ Copied!';
      setTimeout(() => { document.getElementById('copyDataUrl').textContent = '📋 Copy'; }, 2000);
    });
