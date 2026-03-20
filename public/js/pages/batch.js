// Page controller: batch.html
import { initPaywall, isPremium, requirePremium, FREE_LIMITS } from '../stripe-paywall.js';
    import { saveToHistory } from '../config/firebase.js';
    initPaywall();
    const generateBtn = document.getElementById('generateBtn');
    const batchInput = document.getElementById('batchInput');
    const previewGrid = document.getElementById('previewGrid');
    const progressWrap = document.getElementById('progressWrap');
    const progressFill = document.getElementById('progressFill');
    const progressLabel = document.getElementById('progressLabel');
    const downloadAllWrap = document.getElementById('downloadAllWrap');
    const alertArea = document.getElementById('alertArea');
    let generatedCanvases = [];

    generateBtn.addEventListener('click', async () => {
      const lines = batchInput.value.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) { alertArea.innerHTML = '<div class="alert alert-error">❌ Enter at least one item.</div>'; return; }
      if (!isPremium() && lines.length > FREE_LIMITS.qrBatch) {
        requirePremium('Generating more than 5 QR codes at once', 'qr-batch');
        return;
      }
      if (lines.length > 1000) { alertArea.innerHTML = '<div class="alert alert-error">❌ Maximum 1,000 items.</div>'; return; }

      generateBtn.disabled = true;
      try {
      previewGrid.innerHTML = '';
      generatedCanvases = [];
      progressWrap.classList.remove('hidden');
      alertArea.innerHTML = '';

      const size = parseInt(document.getElementById('qrSize').value);
      const fg = document.getElementById('fgColor').value;
      const bg = document.getElementById('bgColor').value;

      for (let i = 0; i < lines.length; i++) {
        const pct = Math.round((i + 1) / lines.length * 100);
        progressFill.style.width = pct + '%';
        progressLabel.textContent = `Generating ${i + 1}/${lines.length}...`;

        const canvas = document.createElement('canvas');
        try {
          await QRCode.toCanvas(canvas, lines[i], {
            width: size, margin: 2,
            color: { dark: fg, light: bg },
            errorCorrectionLevel: 'M',
          });
          generatedCanvases.push({ canvas, label: lines[i] });

          // Add to preview grid
          const wrap = document.createElement('div');
          wrap.style.cssText = 'background:var(--slate-800);border:1px solid rgba(255,255,255,0.07);border-radius:8px;overflow:hidden;';
          const prevCanvas = document.createElement('canvas');
          const s = 200 / size;
          prevCanvas.width = Math.round(size * Math.min(1, s));
          prevCanvas.height = prevCanvas.width;
          prevCanvas.style.cssText = 'width:100%;display:block;';
          prevCanvas.getContext('2d').drawImage(canvas, 0, 0, prevCanvas.width, prevCanvas.height);
          const lbl = document.createElement('div');
          lbl.style.cssText = 'padding:8px;font-family:var(--font-mono);font-size:0.7rem;color:var(--slate-400);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;justify-content:space-between;';
          const dlBtn = document.createElement('a');
          dlBtn.textContent = '⬇️';
          dlBtn.style.cursor = 'pointer';
          dlBtn.addEventListener('click', () => {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            const safeName = lines[i].replace(/[^a-z0-9]/gi, '_').slice(0, 40);
            a.href = url; a.download = `qr_${safeName}.png`; a.click();
          });
          lbl.innerHTML = `<span>${lines[i].slice(0, 30)}${lines[i].length > 30 ? '…' : ''}</span>`;
          lbl.appendChild(dlBtn);
          wrap.appendChild(prevCanvas); wrap.appendChild(lbl);
          previewGrid.appendChild(wrap);
        } catch (e) {
          console.warn(`Skipping "${lines[i]}": ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 10));
      }

    } finally {
      generateBtn.disabled = false;
      progressWrap.classList.add('hidden');
    }
      downloadAllWrap.classList.remove('hidden');
      alertArea.innerHTML = `<div class="alert alert-success">✅ Generated ${generatedCanvases.length} QR codes.</div>`;
      await saveToHistory('qr-batch', { count: generatedCanvases.length });
    });

    document.getElementById('downloadAll').addEventListener('click', async () => {
      if (!generatedCanvases.length) return;
      try {
        const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
        const zip = new JSZip();
        generatedCanvases.forEach(({ canvas, label }, i) => {
          const dataUrl = canvas.toDataURL('image/png');
          const base64 = dataUrl.split(',')[1];
          const safeName = label.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
          zip.file(`qr_${String(i + 1).padStart(3, '0')}_${safeName}.png`, base64, { base64: true });
        });
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'qrcodes.zip'; a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        alertArea.innerHTML = `<div class="alert alert-error">❌ ZIP failed: ${e.message}</div>`;
      }
    });
