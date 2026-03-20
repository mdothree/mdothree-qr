// Page controller: scan.html
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

    async function decodeImage(file) {
      alertArea.innerHTML = '';
      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch (e) {
        alertArea.innerHTML = `<div class="alert alert-error">❌ Could not load image: ${e.message}</div>`;
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
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

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
        alertArea.innerHTML = `<div class="alert alert-success">✅ QR code decoded successfully.</div>`;
        await saveToHistory('qr-scan', { contentType: detectContentType(text).type });
      } else {
        alertArea.innerHTML = `<div class="alert alert-error">❌ No QR code found in this image. Try a clearer image.</div>`;
      } catch (e) {
        alertArea.innerHTML = `<div class="alert alert-error">❌ Decode failed: ${e.message}</div>`;
      }
    }

    fileInput.addEventListener('change', () => { if (fileInput.files[0]) decodeImage(fileInput.files[0]); });
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault(); dropZone.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if (f?.type.startsWith('image/')) decodeImage(f);
    });

    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(decodedText.textContent);
      copyBtn.textContent = '✅ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
    });
