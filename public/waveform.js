/**
 * High-Performance Interactive Digital Waveform Engine & VCD Parser
 * CollectUI / Modern EDA Edition
 */
class WaveformEngine {
  constructor(canvasContainer, signalListContainer, timelineHeader) {
    this.canvasContainer = canvasContainer;
    this.signalListContainer = signalListContainer;
    this.timelineHeader = timelineHeader;

    this.signals = [];        // All parsed signal descriptors
    this.visibleSignals = []; // Signals filtered by query
    this.filterQuery = '';

    this.timeScale = "ns";
    this.minTime = 0;
    this.maxTime = 100;
    this.cursorTime = 0;

    // Viewport & Zoom parameters
    this.baseZoom = 15;
    this.zoom = 15; // pixels per time unit
    this.scrollLeft = 0;
    this.rowHeight = 36;
    this.headerHeight = 28;

    this.radixMode = 'hex'; // 'hex', 'bin', 'dec', 'ascii'
    this.hoveredSignalIndex = -1;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.className = 'waveform-canvas';
    this.canvasContainer.innerHTML = '';
    this.canvasContainer.appendChild(this.canvas);

    this.headerCanvas = document.createElement('canvas');
    this.headerCtx = this.headerCanvas.getContext('2d');
    this.headerCanvas.className = 'timeline-canvas';
    this.timelineHeader.innerHTML = '';
    this.timelineHeader.appendChild(this.headerCanvas);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Mouse Move & Cursor scrubbing
    const handleScrub = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + this.canvasContainer.scrollLeft;
      const t = Math.max(this.minTime, Math.min(this.maxTime, x / this.zoom));
      this.cursorTime = Math.round(t * 10) / 10;

      // Determine hovered signal row
      const y = e.clientY - rect.top + this.canvasContainer.scrollTop;
      const rowIndex = Math.floor(y / this.rowHeight);
      if (rowIndex >= 0 && rowIndex < this.visibleSignals.length) {
        this.setHoveredRow(rowIndex);
      } else {
        this.setHoveredRow(-1);
      }

      this.render();
      this.updateSignalValuesAtCursor();
    };

    let isMouseDown = false;
    this.canvasContainer.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      handleScrub(e);
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    this.canvasContainer.addEventListener('mousemove', (e) => {
      handleScrub(e);
    });

    this.canvasContainer.addEventListener('mouseleave', () => {
      this.setHoveredRow(-1);
      this.render();
    });

    // Horizontal Scroll sync
    this.canvasContainer.addEventListener('scroll', () => {
      this.scrollLeft = this.canvasContainer.scrollLeft;
      this.timelineHeader.scrollLeft = this.scrollLeft;
      this.renderTimeline();
    });

    // Zoom with Ctrl + Wheel
    this.canvasContainer.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.25 : 0.8;
        this.setZoom(this.zoom * delta);
      }
    }, { passive: false });
  }

  setHoveredRow(index) {
    if (this.hoveredSignalIndex === index) return;
    this.hoveredSignalIndex = index;

    // Sync highlight in sidebar
    const rows = this.signalListContainer.querySelectorAll('.signal-row');
    rows.forEach((row, i) => {
      if (i === index) {
        row.classList.add('highlighted');
      } else {
        row.classList.remove('highlighted');
      }
    });
  }

  setFilter(query) {
    this.filterQuery = (query || '').toLowerCase().trim();
    if (!this.filterQuery) {
      this.visibleSignals = [...this.signals];
    } else {
      this.visibleSignals = this.signals.filter(s => 
        s.shortName.toLowerCase().includes(this.filterQuery) ||
        s.name.toLowerCase().includes(this.filterQuery)
      );
    }
    this.renderSignalList();
    this.resize();
    this.render();
  }

  setZoom(newZoom) {
    this.zoom = Math.max(0.5, Math.min(300, newZoom));
    this.updateZoomIndicator();
    this.resize();
    this.render();
  }

  zoomFit() {
    const availableWidth = this.canvasContainer.clientWidth - 40;
    const duration = Math.max(1, this.maxTime - this.minTime);
    this.zoom = Math.max(1, availableWidth / duration);
    this.updateZoomIndicator();
    this.resize();
    this.render();
  }

  updateZoomIndicator() {
    const el = document.getElementById('zoom-indicator-text');
    if (el) {
      const pct = Math.round((this.zoom / 15) * 100);
      el.innerText = `${pct}%`;
    }
  }

  setRadix(radix) {
    this.radixMode = radix;
    this.render();
    this.updateSignalValuesAtCursor();
  }

  parseVCD(vcdText) {
    if (!vcdText || typeof vcdText !== 'string') return false;

    this.signals = [];
    const idMap = new Map();
    const lines = vcdText.split('\n');
    let currentTime = 0;
    let maxTimeFound = 0;
    let currentScope = [];
    let inDefinitions = true;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Definitions stage
      if (inDefinitions) {
        if (line.startsWith('$timescale')) {
          const match = line.match(/\$timescale\s+([^\$]+)\s+\$end/);
          if (match) {
            let ts = match[1].trim();
            if (ts === '1s') ts = 'ns';
            this.timeScale = ts;
          }
        } else if (line.startsWith('$scope')) {
          const parts = line.split(/\s+/);
          if (parts[2]) currentScope.push(parts[2]);
        } else if (line.startsWith('$upscope')) {
          currentScope.pop();
        } else if (line.startsWith('$var')) {
          const parts = line.split(/\s+/);
          const type = parts[1];
          const width = parseInt(parts[2], 10) || 1;
          const id = parts[3];
          const name = parts[4];
          const bitRange = parts[5] && parts[5].startsWith('[') ? parts[5] : '';
          const scopeStr = currentScope.length ? currentScope.join('.') : '';
          const fullName = (scopeStr ? scopeStr + '.' : '') + name + (bitRange ? ' ' + bitRange : '');

          const sigObj = {
            id,
            name: fullName,
            shortName: name + (bitRange ? ' ' + bitRange : ''),
            scope: scopeStr,
            depth: currentScope.length,
            width,
            type,
            changes: []
          };

          this.signals.push(sigObj);

          if (!idMap.has(id)) {
            idMap.set(id, []);
          }
          idMap.get(id).push(sigObj);
        } else if (line.startsWith('$enddefinitions')) {
          inDefinitions = false;
        }
        continue;
      }

      // Value Dump Stage
      if (line.startsWith('#')) {
        currentTime = parseInt(line.substring(1), 10);
        if (currentTime > maxTimeFound) maxTimeFound = currentTime;
      } else if (line.startsWith('$dumpvars') || line.startsWith('$end')) {
        continue;
      } else if (line.startsWith('b') || line.startsWith('B') || line.startsWith('r') || line.startsWith('R')) {
        const parts = line.split(/\s+/);
        const val = parts[0].substring(1);
        const id = parts[1];
        const sigList = idMap.get(id);
        if (sigList) {
          sigList.forEach(s => s.changes.push({ time: currentTime, val: val.toLowerCase() }));
        }
      } else if (line.length >= 2) {
        const val = line[0].toLowerCase();
        const id = line.substring(1);
        const sigList = idMap.get(id);
        if (sigList) {
          sigList.forEach(s => s.changes.push({ time: currentTime, val }));
        }
      }
    }

    // Deduplicate redundant nets, keeping top-level signals
    const seenNames = new Set();
    const uniqueSignals = [];
    this.signals.sort((a, b) => a.depth - b.depth);

    for (const sig of this.signals) {
      if (!seenNames.has(sig.shortName)) {
        seenNames.add(sig.shortName);
        uniqueSignals.push(sig);
      }
    }
    this.signals = uniqueSignals.length > 0 ? uniqueSignals : this.signals;
    this.visibleSignals = [...this.signals];

    this.minTime = 0;
    this.maxTime = maxTimeFound > 0 ? maxTimeFound : 40;
    this.cursorTime = 0;

    this.renderSignalList();
    this.zoomFit();
    return true;
  }

  formatValue(val, width, radix = this.radixMode) {
    if (!val) return 'x';
    if (val === 'x' || val === 'z') return val.toUpperCase();
    if (width === 1) return val;

    try {
      const cleanBinary = val.replace(/[^01]/g, '0');
      const num = parseInt(cleanBinary, 2);
      if (isNaN(num)) return val;

      if (radix === 'hex') {
        const hexDigits = Math.ceil(width / 4);
        return '0x' + num.toString(16).toUpperCase().padStart(hexDigits, '0');
      } else if (radix === 'dec') {
        return num.toString(10);
      } else if (radix === 'ascii') {
        return String.fromCharCode(num & 0xFF) || val;
      } else {
        return val.padStart(width, '0');
      }
    } catch (e) {
      return val;
    }
  }

  getValueAtTime(signal, t) {
    if (!signal.changes || signal.changes.length === 0) return 'x';
    let lastVal = signal.changes[0].val;
    for (let i = 0; i < signal.changes.length; i++) {
      if (signal.changes[i].time <= t) {
        lastVal = signal.changes[i].val;
      } else {
        break;
      }
    }
    return lastVal;
  }

  renderSignalList() {
    this.signalListContainer.innerHTML = '';
    if (this.visibleSignals.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '16px 12px';
      empty.style.color = 'var(--text-muted)';
      empty.style.fontSize = '11px';
      empty.style.textAlign = 'center';
      empty.innerText = this.signals.length === 0 ? 'No signals in VCD' : 'No matching signals';
      this.signalListContainer.appendChild(empty);
      return;
    }

    this.visibleSignals.forEach((sig, idx) => {
      const item = document.createElement('div');
      item.className = 'signal-row';
      item.style.height = `${this.rowHeight}px`;

      const typeBadge = sig.width > 1 
        ? `<span class="sig-type-pill bus">[${sig.width}]</span>` 
        : `<span class="sig-type-pill wire">1b</span>`;

      item.innerHTML = `
        <div class="signal-info" title="${sig.name}">
          ${typeBadge}
          <span class="sig-name-text">${sig.shortName}</span>
        </div>
        <div class="sig-value-text" id="sig-val-${idx}">-</div>
      `;

      item.addEventListener('mouseenter', () => {
        this.setHoveredRow(idx);
        this.render();
      });

      this.signalListContainer.appendChild(item);
    });
    this.updateSignalValuesAtCursor();
  }

  updateSignalValuesAtCursor() {
    this.visibleSignals.forEach((sig, idx) => {
      const el = document.getElementById(`sig-val-${idx}`);
      if (el) {
        const rawVal = this.getValueAtTime(sig, this.cursorTime);
        const formatted = this.formatValue(rawVal, sig.width);
        el.innerText = formatted;
        
        let valClass = 'val-low';
        if (rawVal === '1') valClass = 'val-high';
        else if (rawVal === 'x') valClass = 'val-x';
        else if (rawVal === 'z') valClass = 'val-z';
        
        el.className = `sig-value-text ${valClass}`;
      }
    });

    const cursorTimeEl = document.getElementById('cursor-time-display');
    if (cursorTimeEl) {
      cursorTimeEl.innerText = `${this.cursorTime} ${this.timeScale}`;
    }
  }

  resize() {
    const totalWidth = Math.max(this.canvasContainer.clientWidth, (this.maxTime - this.minTime + 5) * this.zoom + 120);
    const totalHeight = Math.max(this.canvasContainer.clientHeight, this.visibleSignals.length * this.rowHeight);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = totalWidth * dpr;
    this.canvas.height = totalHeight * dpr;
    this.canvas.style.width = `${totalWidth}px`;
    this.canvas.style.height = `${totalHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.headerCanvas.width = totalWidth * dpr;
    this.headerCanvas.height = this.headerHeight * dpr;
    this.headerCanvas.style.width = `${totalWidth}px`;
    this.headerCanvas.style.height = `${this.headerHeight}px`;
    this.headerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  calculateNiceStep(rawStep) {
    if (rawStep <= 0) return 10;
    const exponent = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / exponent;
    let niceFraction;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
    return Math.max(1, niceFraction * exponent);
  }

  renderTimeline() {
    const ctx = this.headerCtx;
    const width = parseFloat(this.headerCanvas.style.width) || this.headerCanvas.width;
    const height = this.headerHeight;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0e1526';
    ctx.fillRect(0, 0, width, height);

    const minPixelStep = 70;
    const timeStep = this.calculateNiceStep(minPixelStep / this.zoom);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    for (let t = this.minTime; t <= this.maxTime + timeStep; t += timeStep) {
      const x = t * this.zoom;
      ctx.beginPath();
      ctx.moveTo(x, height - 6);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillText(`${t} ${this.timeScale}`, x, height - 10);
    }
  }

  render() {
    this.renderTimeline();

    const ctx = this.ctx;
    const width = parseFloat(this.canvas.style.width) || this.canvas.width;
    const height = parseFloat(this.canvas.style.height) || this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    const timeStep = this.calculateNiceStep(70 / this.zoom);

    // Grid vertical lines (crisp and high-contrast)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let t = this.minTime; t <= this.maxTime + timeStep; t += timeStep) {
      const x = t * this.zoom;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Render each signal trace
    this.visibleSignals.forEach((sig, idx) => {
      const yBase = idx * this.rowHeight;

      // Row background hover highlight
      if (idx === this.hoveredSignalIndex) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.fillRect(0, yBase, width, this.rowHeight);
      }

      // Row separator line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(0, yBase + this.rowHeight);
      ctx.lineTo(width, yBase + this.rowHeight);
      ctx.stroke();

      if (sig.width === 1) {
        this.renderSingleBitWave(ctx, sig, yBase);
      } else {
        this.renderBusWave(ctx, sig, yBase);
      }
    });

    // Render Cursor Line
    const cursorX = this.cursorTime * this.zoom;
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  renderSingleBitWave(ctx, sig, yBase) {
    const highY = yBase + 8;
    const lowY = yBase + this.rowHeight - 8;
    const midY = (highY + lowY) / 2;

    const changes = sig.changes.length > 0 ? sig.changes : [{ time: 0, val: '0' }];
    ctx.strokeStyle = '#38bdf8'; // Electric Cyan
    ctx.lineWidth = 2;

    ctx.beginPath();
    let prevY = lowY;
    let prevX = 0;

    for (let i = 0; i < changes.length; i++) {
      const cur = changes[i];
      const nextTime = (i + 1 < changes.length) ? changes[i + 1].time : (this.maxTime + 5);
      const startX = cur.time * this.zoom;
      const endX = nextTime * this.zoom;

      let curY = lowY;
      if (cur.val === '1') curY = highY;
      else if (cur.val === '0') curY = lowY;
      else curY = midY;

      if (i === 0) {
        ctx.moveTo(startX, curY);
      } else {
        ctx.lineTo(startX, prevY);
        ctx.lineTo(startX, curY);
      }

      ctx.lineTo(endX, curY);
      prevY = curY;
      prevX = endX;
    }
    ctx.stroke();
  }

  renderBusWave(ctx, sig, yBase) {
    const topY = yBase + 7;
    const botY = yBase + this.rowHeight - 7;
    const midY = (topY + botY) / 2;

    const changes = sig.changes.length > 0 ? sig.changes : [{ time: 0, val: 'x' }];

    for (let i = 0; i < changes.length; i++) {
      const cur = changes[i];
      const nextTime = (i + 1 < changes.length) ? changes[i + 1].time : (this.maxTime + 5);
      const startX = cur.time * this.zoom;
      const endX = nextTime * this.zoom;
      const segmentWidth = endX - startX;
      const slant = Math.min(4, segmentWidth / 2);

      ctx.beginPath();
      ctx.moveTo(startX, midY);
      ctx.lineTo(startX + slant, topY);
      ctx.lineTo(endX - slant, topY);
      ctx.lineTo(endX, midY);
      ctx.lineTo(endX - slant, botY);
      ctx.lineTo(startX + slant, botY);
      ctx.closePath();

      ctx.fillStyle = cur.val === 'x' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(168, 85, 247, 0.18)';
      ctx.fill();

      ctx.strokeStyle = cur.val === 'x' ? '#f43f5e' : '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (segmentWidth > 30) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const formatted = this.formatValue(cur.val, sig.width);
        ctx.fillText(formatted, startX + segmentWidth / 2, midY);
      }
    }
  }

  exportImage() {
    try {
      const exportCanvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      const width = parseFloat(this.canvas.style.width) || this.canvas.width;
      const height = parseFloat(this.canvas.style.height) || this.canvas.height;
      const headerH = this.headerHeight;

      exportCanvas.width = width * dpr;
      exportCanvas.height = (height + headerH) * dpr;
      const expCtx = exportCanvas.getContext('2d');
      expCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Draw header then body
      expCtx.drawImage(this.headerCanvas, 0, 0, width, headerH);
      expCtx.drawImage(this.canvas, 0, headerH, width, height);

      const link = document.createElement('a');
      link.download = `waveform_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
      return true;
    } catch (e) {
      console.error('Failed to export waveform image:', e);
      return false;
    }
  }
}

window.WaveformEngine = WaveformEngine;
