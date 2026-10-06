// Page controller: generate.html
import { buildQRContent, validateQRFields } from '../services/qrGenerator.js';
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

    function showAlert(type, msg) {
      alertArea.innerHTML = '';
      if (!msg) return;
      const div = document.createElement('div');
      div.className = `alert alert-${type}`;
      div.textContent = msg;
      alertArea.appendChild(div);
    }

    function readFields() {
      return {
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
      };
    }

    // Exactly what the preview canvas encodes, so SVG export matches it.
    let lastRender = null;

    generateBtn.addEventListener('click', async () => {
      const fields = readFields();
      // Validate before disabling the button: the old early return skipped
      // the finally block and left Generate disabled until reload.
      const invalid = validateQRFields(currentType, fields);
      if (invalid) { showAlert('error', `❌ ${invalid}`); return; }
      const content = buildQRContent(currentType, fields);

      generateBtn.disabled = true;
      try {
        const opts = {
          width: parseInt(qrSizeSlider.value),
          color: { dark: fgColor.value, light: bgColor.value },
          errorCorrectionLevel: document.getElementById('errorLevel').value,
          margin: 2,
        };
        await QRCode.toCanvas(qrCanvas, content, opts);
        lastRender = { content, opts, type: currentType };
        qrCanvas.style.display = 'block';
        qrPlaceholder.style.display = 'none';
        downloadActions.style.display = 'flex';
        showAlert('', '');
        await saveToHistory('qr-generate', { type: currentType });
      } catch (err) {
        const tooBig = /too big|amount of data/i.test(err.message || '');
        showAlert('error', tooBig
          ? '❌ Too much content for one QR code at this error-correction level. Shorten it or choose a lower level (L or M).'
          : `❌ ${err.message}`);
      } finally {
        generateBtn.disabled = false;
      }
    });

    function downloadUrl(url, name, revoke = false) {
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    document.getElementById('dlPng').addEventListener('click', () => {
      downloadUrl(qrCanvas.toDataURL('image/png'), `qrcode-${lastRender?.type || 'code'}.png`);
    });

    document.getElementById('dlSvg').addEventListener('click', async () => {
      // Previously read qrCanvas.dataset.content (never set) and fell back to
      // the URL field, so WiFi/vCard/text SVGs encoded different data.
      if (!lastRender) return;
      try {
        const svgStr = await QRCode.toString(lastRender.content, { ...lastRender.opts, type: 'svg' });
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        downloadUrl(URL.createObjectURL(blob), `qrcode-${lastRender.type}.svg`, true);
      } catch (err) {
        showAlert('error', `❌ SVG export failed: ${err.message}`);
      }
    });

    document.getElementById('copyDataUrl').addEventListener('click', async () => {
      const dataUrl = qrCanvas.toDataURL('image/png');
      await navigator.clipboard.writeText(dataUrl);
      document.getElementById('copyDataUrl').textContent = '✅ Copied!';
      setTimeout(() => { document.getElementById('copyDataUrl').textContent = '📋 Copy'; }, 2000);
    });
