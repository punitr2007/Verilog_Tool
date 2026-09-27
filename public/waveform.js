/**
 * High-Performance Interactive Digital Waveform Engine & VCD Parser
 * CollectUI / Modern EDA Edition with Drag-and-Drop Signal Reordering
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
    this.zoom = Math.max(0.001, Math.min(2000, newZoom));
    this.updateZoomIndicator();
    this.resize();
    this.render();
  }

  zoomFit() {
    const availableWidth = Math.max(200, (this.canvasContainer.clientWidth || 800) - 60);
    const duration = Math.max(0.1, this.maxTime - this.minTime);
    this.zoom = Math.max(0.01, availableWidth / duration);
    this.updateZoomIndicator();
    this.resize();
    this.render();
  }

  updateZoomIndicator() {
    const el = document.getElementById('zoom-indicator-text');
    if (el) {
      const pct = Math.round((this.zoom / this.baseZoom) * 100);
      el.innerText = `${Math.max(1, pct)}%`;
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

    // 1. Extract timescale across multi-line or single-line declarations
    let timescaleUnit = 'ns';
    let timescaleMultiplier = 1;
    
    // Match variations like: $timescale 1ns $end, $timescale\n  100ps\n$end, $timescale 1 ps $end
    const timescaleMatch = vcdText.match(/\$timescale\s+([0-9]+)?\s*([a-zA-Z]+)\s*\$end/i);
    if (timescaleMatch) {
      timescaleMultiplier = parseInt(timescaleMatch[1] || '1', 10);
      timescaleUnit = (timescaleMatch[2] || 'ns').toLowerCase();
    }

    const unitToSec = {
      's': 1,
      'ms': 1e-3,
      'us': 1e-6,
      'ns': 1e-9,
      'ps': 1e-12,
      'fs': 1e-15
    };
    const tickInSeconds = (timescaleMultiplier || 1) * (unitToSec[timescaleUnit] || 1e-9);

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Definitions stage
      if (inDefinitions) {
        if (line.startsWith('$scope')) {
          const parts = line.split(/\s+/);
          if (parts[2]) currentScope.push(parts[2]);
        } else if (line.startsWith('$upscope')) {
          currentScope.pop();
        } else if (line.startsWith('$var')) {
          const parts = line.split(/\s+/);
          const type = (parts[1] || '').toLowerCase();
          const width = parseInt(parts[2], 10) || 1;
          const id = parts[3];
          const name = parts[4];
          const bitRange = parts[5] && parts[5].startsWith('[') ? parts[5] : '';
          const scopeStr = currentScope.length ? currentScope.join('.') : '';
          const fullName = (scopeStr ? scopeStr + '.' : '') + name + (bitRange ? ' ' + bitRange : '');

          const isRealType = type === 'real' || type === 'analog';
          const sigObj = {
            id,
            name: fullName,
            shortName: name + (bitRange ? ' ' + bitRange : ''),
            scope: scopeStr,
            depth: currentScope.length,
            width,
            type,
            isAnalog: isRealType,
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
      } else if (line.startsWith('$dumpvars') || line.startsWith('$end') || line.startsWith('$comment') || line.startsWith('$dumpall')) {
        continue;
      } else if (line.startsWith('r') || line.startsWith('R')) {
        // Real / Floating Point Analog VCD Dump (e.g. r12.45 !)
        const parts = line.substring(1).trim().split(/\s+/);
        const val = parseFloat(parts[0]);
        const id = parts[1];
        const sigList = idMap.get(id);
        if (sigList) {
          sigList.forEach(s => {
            s.isAnalog = true;
            s.changes.push({ time: currentTime, val: isNaN(val) ? 0 : val });
          });
        }
      } else if (line.startsWith('b') || line.startsWith('B')) {
        const parts = line.split(/\s+/);
        const rawVal = parts[0].substring(1);
        const id = parts[1];
        const sigList = idMap.get(id);
        if (sigList) {
          sigList.forEach(s => {
            s.changes.push({ time: currentTime, val: rawVal.toLowerCase() });
          });
        }
      } else if (line.length >= 2) {
        const val = line[0].toLowerCase();
        const id = line.substring(1).trim();
        const sigList = idMap.get(id);
        if (sigList) {
          sigList.forEach(s => s.changes.push({ time: currentTime, val }));
        }
      }
    }

    // Determine optimal human display unit (ps, ns, us, ms, s)
    const totalSimDurationSec = maxTimeFound * tickInSeconds;
    let displayUnit = 'ns';
    let scaleToDisplay = 1;

    if (totalSimDurationSec === 0) {
      displayUnit = timescaleUnit || 'ns';
      scaleToDisplay = 1;
    } else if (totalSimDurationSec < 1e-9) {
      displayUnit = 'ps';
      scaleToDisplay = tickInSeconds / 1e-12;
    } else if (totalSimDurationSec < 1e-6) {
      displayUnit = 'ns';
      scaleToDisplay = tickInSeconds / 1e-9;
    } else if (totalSimDurationSec < 1e-3) {
      displayUnit = 'us';
      scaleToDisplay = tickInSeconds / 1e-6;
    } else if (totalSimDurationSec < 1) {
      displayUnit = 'ms';
      scaleToDisplay = tickInSeconds / 1e-3;
    } else {
      displayUnit = 's';
      scaleToDisplay = tickInSeconds / 1;
    }

    this.timeScale = displayUnit;

    // Scale all changes to the display unit
    this.signals.forEach(sig => {
      sig.changes.forEach(c => {
        c.time = Math.round(c.time * scaleToDisplay * 1000000) / 1000000;
      });

      // Auto-detect analog signals from names or numeric value patterns if not already flagged
      if (!sig.isAnalog) {
        const lowerName = sig.name.toLowerCase();
        const isAnalogName = lowerName.startsWith('v_') || lowerName.startsWith('i_') || 
                             lowerName.includes('.v_') || lowerName.includes('.i_') ||
                             lowerName.startsWith('v(') || lowerName.startsWith('i(') ||
                             lowerName.includes('vout') || lowerName.includes('v_out') ||
                             lowerName.includes('i_ind') || lowerName.includes('v_sw') ||
                             lowerName.includes('vc') || lowerName.includes('ic');
        if (isAnalogName && sig.changes.length > 0) {
          sig.isAnalog = true;
        }
      }

      // If analog, convert all string changes to numbers and compute min / max span
      if (sig.isAnalog && sig.changes.length > 0) {
        let min = Infinity;
        let max = -Infinity;
        sig.changes.forEach(c => {
          let numVal = typeof c.val === 'number' ? c.val : parseFloat(c.val);
          if (isNaN(numVal) && typeof c.val === 'string') {
            const clean = c.val.replace(/^b/i, '');
            const parsedInt = parseInt(clean, 2);
            if (!isNaN(parsedInt)) numVal = parsedInt / 1000.0;
          }
          if (isNaN(numVal)) numVal = 0;
          c.val = numVal;
          if (numVal < min) min = numVal;
          if (numVal > max) max = numVal;
        });

        sig.minVal = isFinite(min) ? min : 0;
        sig.maxVal = isFinite(max) ? max : 1;
        if (sig.maxVal === sig.minVal) {
          sig.minVal -= (Math.abs(sig.maxVal) * 0.2 || 1);
          sig.maxVal += (Math.abs(sig.maxVal) * 0.2 || 1);
        }
      }
    });

    // Deduplicate nets sharing the same VCD id while preserving clear names
    const seenIds = new Set();
    const seenNames = new Set();
    const uniqueSignals = [];
    this.signals.sort((a, b) => a.depth - b.depth);

    for (const sig of this.signals) {
      const key = `${sig.shortName}#${sig.id}`;
      if (!seenNames.has(sig.shortName) || !seenIds.has(sig.id)) {
        seenNames.add(sig.shortName);
        seenIds.add(sig.id);
        uniqueSignals.push(sig);
      }
    }
    this.signals = uniqueSignals.length > 0 ? uniqueSignals : this.signals;
    this.visibleSignals = [...this.signals];

    this.minTime = 0;
    this.maxTime = maxTimeFound > 0 ? (Math.round(maxTimeFound * scaleToDisplay * 1000000) / 1000000) : 40;
    this.cursorTime = 0;

    this.renderSignalList();
    this.zoomFit();
    return true;
  }

  formatValue(val, width, radix = this.radixMode, sig = null) {
    if (val === null || val === undefined) return 'x';

    // Handle Analog Floating Point Signals
    if (typeof val === 'number' || (sig && sig.isAnalog)) {
      const num = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(num)) return 'x';
      const sName = sig ? sig.name.toLowerCase() : '';
      let unit = '';
      if (sName.startsWith('v_') || sName.includes('v(') || sName.includes('vout') || sName.includes('vsw') || sName.includes('vc')) {
        unit = ' V';
      } else if (sName.startsWith('i_') || sName.includes('i(') || sName.includes('i_ind') || sName.includes('ic') || sName.includes('il')) {
        unit = ' A';
      }

      if (Math.abs(num) >= 100) return num.toFixed(1) + unit;
      if (Math.abs(num) >= 10) return num.toFixed(2) + unit;
      if (Math.abs(num) >= 0.001) return num.toFixed(3) + unit;
      if (num === 0) return '0.00' + unit;
      return num.toExponential(2) + unit;
    }

    if (val === 'x' || val === 'z') return val.toUpperCase();
    if (width === 1) return val;

    try {
      const cleanBinary = String(val).replace(/[^01]/g, '0');
      const num = parseInt(cleanBinary, 2);
      if (isNaN(num)) return String(val);

      if (radix === 'hex') {
        const hexDigits = Math.ceil(width / 4);
        return '0x' + num.toString(16).toUpperCase().padStart(hexDigits, '0');
      } else if (radix === 'dec') {
        return num.toString(10);
      } else if (radix === 'ascii') {
        return String.fromCharCode(num & 0xFF) || val;
      } else {
        return String(val).padStart(width, '0');
      }
    } catch (e) {
      return String(val);
    }
  }

  getValueAtTime(signal, t) {
    if (!signal.changes || signal.changes.length === 0) return 'x';

    // Smooth Linear Interpolation for Continuous Analog Signals
    if (signal.isAnalog) {
      const changes = signal.changes;
      if (t <= changes[0].time) return changes[0].val;
      if (t >= changes[changes.length - 1].time) return changes[changes.length - 1].val;

      for (let i = 0; i < changes.length - 1; i++) {
        const c1 = changes[i];
        const c2 = changes[i + 1];
        if (t >= c1.time && t <= c2.time) {
          const dt = c2.time - c1.time;
          const ratio = dt > 0 ? (t - c1.time) / dt : 0;
          const v1 = typeof c1.val === 'number' ? c1.val : parseFloat(c1.val) || 0;
          const v2 = typeof c2.val === 'number' ? c2.val : parseFloat(c2.val) || 0;
          return v1 + ratio * (v2 - v1);
        }
      }
      return changes[changes.length - 1].val;
    }

    // Step function for discrete digital signals
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

  reorderSignals(fromIndex, toIndex, isAfter) {
    if (fromIndex < 0 || fromIndex >= this.visibleSignals.length) return;
    if (toIndex < 0 || toIndex >= this.visibleSignals.length) return;

    const movedSignal = this.visibleSignals[fromIndex];
    this.visibleSignals.splice(fromIndex, 1);

    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
      insertIndex = isAfter ? toIndex : toIndex - 1;
    } else {
      insertIndex = isAfter ? toIndex + 1 : toIndex;
    }
    insertIndex = Math.max(0, Math.min(this.visibleSignals.length, insertIndex));

    this.visibleSignals.splice(insertIndex, 0, movedSignal);

    // Sync master list order
    const masterFrom = this.signals.indexOf(movedSignal);
    if (masterFrom !== -1) {
      this.signals.splice(masterFrom, 1);
      const nextVisible = this.visibleSignals[insertIndex + 1];
      const masterTo = nextVisible ? this.signals.indexOf(nextVisible) : this.signals.length;
      this.signals.splice(masterTo === -1 ? this.signals.length : masterTo, 0, movedSignal);
    }

    this.renderSignalList();
    this.render();
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
      item.draggable = true;
      item.dataset.index = idx;

      let typeBadge = `<span class="sig-type-pill wire">1b</span>`;
      if (sig.isAnalog) {
        typeBadge = `<span class="sig-type-pill" style="background:rgba(16,185,129,0.18);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-size:9px;padding:1px 4px;">∿ Analog</span>`;
      } else if (sig.width > 1) {
        typeBadge = `<span class="sig-type-pill bus">[${sig.width}]</span>`;
      }

      item.innerHTML = `
        <div class="signal-info" title="${sig.name}">
          <span class="drag-handle" title="Drag to reorder signal">≡</span>
          ${typeBadge}
          <span class="sig-name-text">${sig.shortName}</span>
        </div>
        <div class="sig-value-text" id="sig-val-${idx}">-</div>
      `;

      item.addEventListener('mouseenter', () => {
        this.setHoveredRow(idx);
        this.render();
      });

      // Drag and Drop Events for Reordering
      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        const rows = this.signalListContainer.querySelectorAll('.signal-row');
        rows.forEach(r => r.classList.remove('drop-before', 'drop-after'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          item.classList.add('drop-before');
          item.classList.remove('drop-after');
        } else {
          item.classList.add('drop-after');
          item.classList.remove('drop-before');
        }
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drop-before', 'drop-after');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIndex = idx;
        const rect = item.getBoundingClientRect();
        const isAfter = (e.clientY >= rect.top + rect.height / 2);

        if (!isNaN(fromIndex) && fromIndex !== toIndex) {
          this.reorderSignals(fromIndex, toIndex, isAfter);
        }
        item.classList.remove('drop-before', 'drop-after');
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
        const formatted = this.formatValue(rawVal, sig.width, this.radixMode, sig);
        el.innerText = formatted;
        
        let valClass = 'val-low';
        if (sig.isAnalog) valClass = 'val-high';
        else if (rawVal === '1') valClass = 'val-high';
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
    if (rawStep <= 0 || !isFinite(rawStep)) return 10;
    const exponent = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / exponent;
    let niceFraction;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
    const result = niceFraction * exponent;
    return parseFloat(result.toPrecision(6));
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

    const maxT = Math.max(this.maxTime, width / this.zoom);
    for (let t = this.minTime; t <= maxT + timeStep; t += timeStep) {
      const x = t * this.zoom;
      if (x > width + 50) break;
      ctx.beginPath();
      ctx.moveTo(x, height - 6);
      ctx.lineTo(x, height);
      ctx.stroke();

      const roundedT = Math.round(t * 1000) / 1000;
      ctx.fillText(`${roundedT} ${this.timeScale}`, x, height - 10);
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
    const maxT = Math.max(this.maxTime, width / this.zoom);
    for (let t = this.minTime; t <= maxT + timeStep; t += timeStep) {
      const x = t * this.zoom;
      if (x > width + 50) break;
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

      if (sig.isAnalog) {
        this.renderAnalogWave(ctx, sig, yBase, width);
      } else if (sig.width === 1) {
        this.renderSingleBitWave(ctx, sig, yBase, width);
      } else {
        this.renderBusWave(ctx, sig, yBase, width);
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

  renderAnalogWave(ctx, sig, yBase, totalWidth = 0) {
    const topY = yBase + 6;
    const botY = yBase + this.rowHeight - 6;
    const heightSpan = botY - topY;

    const changes = sig.changes.length > 0 ? sig.changes : [{ time: 0, val: 0 }];
    const endLimit = Math.max(this.maxTime, (totalWidth || 0) / this.zoom);

    const minV = sig.minVal !== undefined ? sig.minVal : 0;
    const maxV = sig.maxVal !== undefined ? sig.maxVal : 1;
    const vRange = (maxV - minV) || 1;

    // Determine theme colors based on signal name
    const sName = sig.name.toLowerCase();
    let strokeColor = '#38bdf8'; // Cyan default
    let fillColorTop = 'rgba(56, 189, 248, 0.25)';
    let fillColorBot = 'rgba(56, 189, 248, 0.02)';

    if (sName.startsWith('i_') || sName.includes('i_ind') || sName.includes('i(') || sName.includes('ic')) {
      strokeColor = '#10b981'; // Emerald for Current
      fillColorTop = 'rgba(16, 185, 129, 0.25)';
      fillColorBot = 'rgba(16, 185, 129, 0.02)';
    } else if (sName.includes('sw') || sName.includes('gate') || sName.includes('pwm')) {
      strokeColor = '#f59e0b'; // Amber for Switches
      fillColorTop = 'rgba(245, 158, 11, 0.25)';
      fillColorBot = 'rgba(245, 158, 11, 0.02)';
    }

    // Zero-crossing baseline if in range
    if (minV < 0 && maxV > 0) {
      const zeroY = botY - ((0 - minV) / vRange) * heightSpan;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(endLimit * this.zoom, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Calculate (x, y) points
    const points = [];
    for (let i = 0; i < changes.length; i++) {
      const cur = changes[i];
      const valNum = typeof cur.val === 'number' ? cur.val : (parseFloat(cur.val) || 0);
      const x = cur.time * this.zoom;
      const norm = (valNum - minV) / vRange;
      const y = botY - Math.max(0, Math.min(1, norm)) * heightSpan;
      points.push({ x, y });
    }

    if (points.length === 0) return;

    // Extend to endLimit
    const lastPt = points[points.length - 1];
    if (lastPt.x < endLimit * this.zoom) {
      points.push({ x: endLimit * this.zoom, y: lastPt.y });
    }

    // Draw Filled Area below curve
    const grad = ctx.createLinearGradient(0, topY, 0, botY);
    grad.addColorStop(0, fillColorTop);
    grad.addColorStop(1, fillColorBot);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, botY);
    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, botY);
    ctx.closePath();
    ctx.fill();

    // Draw Smooth Waveform Trace
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Min / Max range label on the right
    const labelX = Math.min(width - 45, Math.max(20, (this.maxTime * this.zoom) + 10));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${maxV.toFixed(1)}`, labelX, topY + 8);
    ctx.fillText(`${minV.toFixed(1)}`, labelX, botY - 2);
  }

  renderSingleBitWave(ctx, sig, yBase, totalWidth = 0) {
    const highY = yBase + 8;
    const lowY = yBase + this.rowHeight - 8;
    const midY = (highY + lowY) / 2;

    const changes = sig.changes.length > 0 ? sig.changes : [{ time: 0, val: '0' }];
    ctx.strokeStyle = '#38bdf8'; // Electric Cyan
    ctx.lineWidth = 2;

    const endLimit = Math.max(this.maxTime, (totalWidth || 0) / this.zoom);
    ctx.beginPath();
    let prevY = lowY;
    let prevX = 0;

    for (let i = 0; i < changes.length; i++) {
      const cur = changes[i];
      const nextTime = (i + 1 < changes.length) ? changes[i + 1].time : endLimit;
      const startX = cur.time * this.zoom;
      const endX = Math.max(startX, nextTime * this.zoom);

      let curY = lowY;
      if (cur.val === '1' || cur.val === 'h') curY = highY;
      else if (cur.val === '0' || cur.val === 'l') curY = lowY;
      else curY = midY;

      if (i === 0) {
        if (startX > 0) {
          ctx.moveTo(0, curY);
          ctx.lineTo(startX, curY);
        } else {
          ctx.moveTo(startX, curY);
        }
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

  renderBusWave(ctx, sig, yBase, totalWidth = 0) {
    const topY = yBase + 7;
    const botY = yBase + this.rowHeight - 7;
    const midY = (topY + botY) / 2;

    const changes = sig.changes.length > 0 ? sig.changes : [{ time: 0, val: 'x' }];
    const endLimit = Math.max(this.maxTime, (totalWidth || 0) / this.zoom);

    for (let i = 0; i < changes.length; i++) {
      const cur = changes[i];
      const nextTime = (i + 1 < changes.length) ? changes[i + 1].time : endLimit;
      const startX = cur.time * this.zoom;
      const endX = Math.max(startX, nextTime * this.zoom);
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

      ctx.fillStyle = (cur.val === 'x' || cur.val === 'z') ? 'rgba(244, 63, 94, 0.25)' : 'rgba(168, 85, 247, 0.18)';
      ctx.fill();

      ctx.strokeStyle = (cur.val === 'x' || cur.val === 'z') ? '#f43f5e' : '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (segmentWidth > 30) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const formatted = this.formatValue(cur.val, sig.width, this.radixMode, sig);
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
