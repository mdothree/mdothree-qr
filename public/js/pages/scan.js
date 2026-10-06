// Page controller: scan.html
import { saveToHistory } from '../config/firebase.js';

const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewCanvas = document.getElementById('previewCanvas');
    const resultPanel = document.getElementById('resultPanel');
    const decodedText = document.getElementById('decodedText');
    const copyBtn = document.getElementById('copyBtn');
    const openBtn = document.getElementById('openBtn');
    const alertArea = document.getElementById('alertArea');

    function detectContentType(text) {
      if (/^https?:\/\//i.test(text)) return '🔗 URL';
      if (/^WIFI:/i.test(text)) return '📶 WiFi Credentials';
      if (/^BEGIN:VCARD/i.test(text)) return '👤 Contact (vCard)';
      if (/^mailto:/i.test(text)) return '📧 Email';
      if (/^smsto:/i.test(text)) return '💬 SMS';
      if (/^tel:/i.test(text)) return '📞 Phone Number';
      return '📄 Text';
    }

    function showAlert(type, msg) {
      alertArea.innerHTML = '';
      const div = document.createElement('div');
      div.className = `alert alert-${type}`;
      div.textContent = msg;
      alertArea.appendChild(div);
    }

    function clearResult() {
      // A failed decode used to leave the previous code's result visible
      // next to the new image.
      resultPanel.style.display = 'none';
      document.getElementById('infoPanel').style.display = 'none';
      decodedText.textContent = '';
      openBtn.style.display = 'none';
    }

    // attemptBoth: also read light-on-dark (inverted) codes, which the
    // generator on this site can produce.
    function findCode(imageData) {
      return jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    }

    async function decodeImage(file) {
      alertArea.innerHTML = '';
      clearResult();
      if (!(file.type || '').startsWith('image/') && !/\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name || '')) {
        showAlert('error', "❌ That file isn't an image. Drop a screenshot or photo of a QR code.");
        return;
      }
      let bitmap;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (e) {
        showAlert('error', `❌ Could not load image: ${e.message}`);
        return;
      }
      try {
      const maxDim = Math.max(bitmap.width, bitmap.height);
      const scale = maxDim > 1200 ? 1200 / maxDim : 1;
      previewCanvas.width = Math.round(bitmap.width * scale);
      previewCanvas.height = Math.round(bitmap.height * scale);
      const ctx = previewCanvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, previewCanvas.width, previewCanvas.height);
      previewCanvas.style.display = 'block';

      const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
      let code = findCode(imageData);
      if (!code && scale < 1) {
        // Small codes in large photos can be lost by the 1200px downscale:
        // retry at full resolution (cap ~16MP to stay within canvas limits).
        const full = document.createElement('canvas');
        const fs = Math.min(1, Math.sqrt(16e6 / (bitmap.width * bitmap.height)));
        full.width = Math.round(bitmap.width * fs); full.height = Math.round(bitmap.height * fs);
        const fctx = full.getContext('2d');
        fctx.drawImage(bitmap, 0, 0, full.width, full.height);
        code = findCode(fctx.getImageData(0, 0, full.width, full.height));
        if (code) {
          // Map the outline back onto the preview canvas.
          const k = previewCanvas.width / full.width;
          for (const key of Object.keys(code.location)) {
            const pt = code.location[key];
            if (pt && typeof pt.x === 'number') code.location[key] = { x: pt.x * k, y: pt.y * k };
          }
        }
      }

      if (code) {
        const text = code.data;
        decodedText.textContent = text;
        document.getElementById('contentType').textContent = detectContentType(text);
        resultPanel.style.display = 'block';
        document.getElementById('infoPanel').style.display = 'block';

        // Draw bounding box on canvas
        const loc = code.location;
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(loc.topLeftCorner.x, loc.topLeftCorner.y);
        ctx.lineTo(loc.topRightCorner.x, loc.topRightCorner.y);
        ctx.lineTo(loc.bottomRightCorner.x, loc.bottomRightCorner.y);
        ctx.lineTo(loc.bottomLeftCorner.x, loc.bottomLeftCorner.y);
        ctx.closePath();
        ctx.stroke();

        if (/^https?:\/\//i.test(text)) {
          openBtn.style.display = 'inline-flex';
          openBtn.onclick = () => window.open(text, '_blank', 'noopener');
        } else {
          openBtn.style.display = 'none';
        }
        showAlert('success', '✅ QR code decoded successfully.');
        // detectContentType returns a label string here (no .type property).
        await saveToHistory('qr-scan', { contentType: detectContentType(text) });
      } else {
        showAlert('error', '❌ No QR code found in this image. Try a clearer or tighter-cropped image.');
      }
      } catch (e) {
        showAlert('error', `❌ Decode failed: ${e.message}`);
      }
    }

    fileInput.addEventListener('change', () => { if (fileInput.files[0]) decodeImage(fileInput.files[0]); fileInput.value = ''; });
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault(); dropZone.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if (f) decodeImage(f);
    });

    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(decodedText.textContent);
      copyBtn.textContent = '✅ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
    });
