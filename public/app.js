/**
 * HDL EDA Studio - Core Application Logic
 * Unified SystemVerilog & VHDL Workstation
 */

let designEditor = null;
let testbenchEditor = null;
let waveformEngine = null;
let currentLanguage = 'verilog'; // 'verilog' or 'vhdl'
let examplesData = {};
let currentProjectPath = '/home/punit/xilinx_projects/eda_playgrounds_acts';

// Toast Notification Manager
const Toast = {
  container: null,
  maxToasts: 4,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(type = 'info', title = '', message = '', duration = 4000) {
    if (!this.container) this.init();
    if (!this.container) return;

    // Limit active toasts
    while (this.container.children.length >= this.maxToasts) {
      this.container.removeChild(this.container.firstElementChild);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
    `;

    toast.addEventListener('click', () => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 200);
    });

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.classList.add('removing');
          setTimeout(() => toast.remove(), 200);
        }
      }, duration);
    }
  }
};

// Wait for DOM & Monaco
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  initWaveform();
  initMonaco();
  initUIEvents();
  initGlobalShortcuts();
});

function initWaveform() {
  const canvasContainer = document.getElementById('waveform-viewport');
  const signalList = document.getElementById('signal-list');
  const timelineHeader = document.getElementById('timeline-header');

  waveformEngine = new WaveformEngine(canvasContainer, signalList, timelineHeader);
}

function initMonaco() {
  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

  require(['vs/editor/editor.main'], function () {
    // Define modern dark theme matching our UI tokens
    monaco.editor.defineTheme('eda-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'type', foreground: 'a855f7' },
        { token: 'identifier', foreground: 'f8fafc' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'string', foreground: '34d399' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'operator', foreground: 'f43f5e' }
      ],
      colors: {
        'editor.background': '#080c14',
        'editor.foreground': '#f8fafc',
        'editor.lineHighlightBackground': '#121b2d',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#38bdf8',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#334155',
        'editorCursor.foreground': '#38bdf8',
        'editor.selectionBackground': '#1e3a8a80',
        'editor.inactiveSelectionBackground': '#1e293b80'
      }
    });

    const editorOptions = {
      language: 'systemverilog',
      theme: 'eda-dark',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      fontLigatures: true,
      padding: { top: 8, bottom: 8 }
    };

    // Design Editor
    designEditor = monaco.editor.create(document.getElementById('design-editor'), {
      ...editorOptions,
      value: `// SystemVerilog Design Module\nmodule logic_gates (\n    input  logic A,\n    input  logic B,\n    output logic out_and\n);\n    assign out_and = A & B;\nendmodule\n`
    });

    // Testbench Editor
    testbenchEditor = monaco.editor.create(document.getElementById('testbench-editor'), {
      ...editorOptions,
      value: `\`timescale 1ns/1ps\n\nmodule testbench;\n    logic A, B, out_and;\n\n    logic_gates dut (.A(A), .B(B), .out_and(out_and));\n\n    initial begin\n        $dumpfile("dump.vcd");\n        $dumpvars(0, testbench);\n        A = 0; B = 0; #10;\n        A = 1; B = 1; #10;\n        $finish;\n    end\nendmodule\n`
    });

    // Keybindings inside Monaco
    const runAction = {
      id: 'run-simulation',
      label: 'Run Simulation',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => runSimulation()
    };

    const saveAction = {
      id: 'save-project',
      label: 'Save Project',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => saveProjectToDisk()
    };

    designEditor.addAction(runAction);
    designEditor.addAction(saveAction);
    testbenchEditor.addAction(runAction);
    testbenchEditor.addAction(saveAction);

    // Initial load
    fetchExamples();
    loadProjectFromDisk();
  });
}

function initGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Intercept Ctrl+S / Cmd+S globally to prevent browser save dialog
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveProjectToDisk();
    }
    // Intercept Ctrl+Enter / Cmd+Enter globally
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runSimulation();
    }
  });
}

function initUIEvents() {
  // Segmented Language Mode Control
  const btnModeVerilog = document.getElementById('btn-mode-verilog');
  const btnModeVhdl = document.getElementById('btn-mode-vhdl');

  btnModeVerilog.addEventListener('click', () => {
    if (currentLanguage !== 'verilog') {
      btnModeVerilog.classList.add('active');
      btnModeVhdl.classList.remove('active');
      switchLanguageMode('verilog');
    }
  });

  btnModeVhdl.addEventListener('click', () => {
    if (currentLanguage !== 'vhdl') {
      btnModeVhdl.classList.add('active');
      btnModeVerilog.classList.remove('active');
      switchLanguageMode('vhdl');
    }
  });

  // Action Buttons
  document.getElementById('btn-run').addEventListener('click', runSimulation);
  document.getElementById('btn-launch-gtkwave').addEventListener('click', launchGTKWave);
  document.getElementById('btn-save-local').addEventListener('click', saveProjectToDisk);
  document.getElementById('btn-load-local').addEventListener('click', () => loadProjectFromDisk());

  // Panel copy / clear actions
  document.getElementById('btn-copy-design').addEventListener('click', () => {
    if (designEditor) {
      navigator.clipboard.writeText(designEditor.getValue());
      Toast.show('success', 'Copied', 'Design code copied to clipboard', 2000);
    }
  });

  document.getElementById('btn-clear-design').addEventListener('click', () => {
    if (designEditor && confirm('Clear Design Editor content?')) {
      designEditor.setValue('');
    }
  });

  document.getElementById('btn-copy-tb').addEventListener('click', () => {
    if (testbenchEditor) {
      navigator.clipboard.writeText(testbenchEditor.getValue());
      Toast.show('success', 'Copied', 'Testbench code copied to clipboard', 2000);
    }
  });

  document.getElementById('btn-clear-tb').addEventListener('click', () => {
    if (testbenchEditor && confirm('Clear Testbench Editor content?')) {
      testbenchEditor.setValue('');
    }
  });

  // Example templates dropdown
  document.getElementById('example-select').addEventListener('change', (e) => {
    const key = e.target.value;
    if (key && examplesData[key]) {
      const ex = examplesData[key];
      if (designEditor) designEditor.setValue(ex.design);
      if (testbenchEditor) testbenchEditor.setValue(ex.testbench);
      logConsole(`Loaded template: ${ex.title}`);
      Toast.show('info', 'Template Loaded', ex.title);
    }
  });

  // Tab switching (Waveform vs Console)
  const tabWaveformBtn = document.getElementById('tab-waveform-btn');
  const tabConsoleBtn = document.getElementById('tab-console-btn');
  const waveformTab = document.getElementById('waveform-tab');
  const consoleTab = document.getElementById('console-tab');
  const waveformControls = document.getElementById('waveform-controls');

  tabWaveformBtn.addEventListener('click', () => {
    tabWaveformBtn.classList.add('active');
    tabConsoleBtn.classList.remove('active');
    waveformTab.classList.add('active');
    consoleTab.classList.remove('active');
    waveformControls.style.display = 'flex';
    if (waveformEngine) waveformEngine.resize();
  });

  tabConsoleBtn.addEventListener('click', () => {
    tabConsoleBtn.classList.add('active');
    tabWaveformBtn.classList.remove('active');
    consoleTab.classList.add('active');
    waveformTab.classList.remove('active');
    waveformControls.style.display = 'none';
  });

  // Waveform Toolbar buttons
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    if (waveformEngine) waveformEngine.setZoom(waveformEngine.zoom * 1.3);
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (waveformEngine) waveformEngine.setZoom(waveformEngine.zoom * 0.77);
  });

  document.getElementById('btn-zoom-fit').addEventListener('click', () => {
    if (waveformEngine) waveformEngine.zoomFit();
  });

  document.getElementById('btn-export-waveform').addEventListener('click', () => {
    if (waveformEngine) {
      const ok = waveformEngine.exportImage();
      if (ok) Toast.show('success', 'Export Complete', 'Waveform image saved to downloads');
      else Toast.show('error', 'Export Failed', 'Could not export waveform image');
    }
  });

  document.getElementById('radix-select').addEventListener('change', (e) => {
    if (waveformEngine) waveformEngine.setRadix(e.target.value);
  });

  // Signal Search Input
  const signalSearchInput = document.getElementById('signal-search-input');
  signalSearchInput.addEventListener('input', (e) => {
    if (waveformEngine) waveformEngine.setFilter(e.target.value);
  });

  // Console Toolbar
  document.getElementById('btn-copy-console').addEventListener('click', () => {
    const text = document.getElementById('console-output').innerText;
    navigator.clipboard.writeText(text);
    Toast.show('success', 'Copied', 'Console logs copied to clipboard', 2000);
  });

  document.getElementById('btn-clear-console').addEventListener('click', () => {
    document.getElementById('console-output').innerHTML = '';
  });

  // Shortcuts Modal
  const modal = document.getElementById('shortcuts-modal');
  const btnOpenModal = document.getElementById('btn-shortcuts-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');

  btnOpenModal.addEventListener('click', () => modal.classList.add('active'));
  btnCloseModal.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

// Switch between Verilog and VHDL
function switchLanguageMode(newLang) {
  currentLanguage = newLang;
  const isVHDL = (currentLanguage === 'vhdl');
  const monacoLang = isVHDL ? 'vhdl' : 'systemverilog';

  // Update Monaco syntax models
  if (designEditor && designEditor.getModel()) {
    monaco.editor.setModelLanguage(designEditor.getModel(), monacoLang);
  }
  if (testbenchEditor && testbenchEditor.getModel()) {
    monaco.editor.setModelLanguage(testbenchEditor.getModel(), monacoLang);
  }

  // Update UI Labels & Badges
  document.getElementById('design-filename').innerText = isVHDL ? 'design.vhd' : 'design.sv';
  document.getElementById('testbench-filename').innerText = isVHDL ? 'testbench.vhd' : 'testbench.sv';
  document.getElementById('design-badge').innerText = isVHDL ? 'Entity & Arch' : 'Module';
  document.getElementById('hdl-std-label').innerText = isVHDL ? 'Mode: VHDL-2008 (GHDL)' : 'Mode: SystemVerilog-2012 (Icarus)';

  // Update Project Directory
  currentProjectPath = isVHDL
    ? '/home/punit/xilinx_projects/VHDL_Basics/Lab_Acts/01_logic_gates'
    : '/home/punit/xilinx_projects/eda_playgrounds_acts';

  document.getElementById('status-message').innerText = `Project: ${currentProjectPath}`;

  Toast.show('info', 'Mode Switched', `Active HDL mode: ${isVHDL ? 'VHDL (GHDL)' : 'SystemVerilog (Icarus)'}`);

  // Refresh examples and load corresponding folder
  fetchExamples();
  loadProjectFromDisk(currentProjectPath);
}

// Fetch Examples from server
async function fetchExamples() {
  try {
    const res = await fetch(`/api/examples?lang=${currentLanguage}`);
    examplesData = await res.json();
    const select = document.getElementById('example-select');
    select.innerHTML = '<option value="">📂 Load Example...</option>';
    for (const [key, item] of Object.entries(examplesData)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${item.title}`;
      select.appendChild(opt);
    }
  } catch (err) {
    console.error('Failed to load examples:', err);
  }
}

// Load Project from local disk
async function loadProjectFromDisk(dirPath = currentProjectPath) {
  try {
    logConsole(`Loading ${currentLanguage.toUpperCase()} project from: ${dirPath}...`);
    const res = await fetch(`/api/project/load?path=${encodeURIComponent(dirPath)}&lang=${currentLanguage}`);
    const data = await res.json();
    if (data.success) {
      if (designEditor && data.design) designEditor.setValue(data.design);
      if (testbenchEditor && data.testbench) testbenchEditor.setValue(data.testbench);
      document.getElementById('status-message').innerText = `Project: ${dirPath}`;
      logConsole(`Loaded source files (${data.design.length} bytes design, ${data.testbench.length} bytes tb).`);
      Toast.show('success', 'Project Loaded', `Loaded files from ${dirPath}`);
      
      // Auto run simulation
      setTimeout(runSimulation, 400);
    }
  } catch (err) {
    logConsole(`Error loading project: ${err.message}`, 'stderr');
    Toast.show('error', 'Load Failed', err.message);
  }
}

// Save Project to local disk
async function saveProjectToDisk() {
  try {
    const design = designEditor ? designEditor.getValue() : '';
    const testbench = testbenchEditor ? testbenchEditor.getValue() : '';
    const res = await fetch('/api/project/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dirPath: currentProjectPath, design, testbench, lang: currentLanguage })
    });
    const data = await res.json();
    if (data.success) {
      logConsole(`✅ ${data.message}`, 'success');
      Toast.show('success', 'Saved Successfully', `Saved files to ${currentProjectPath}`);
    }
  } catch (err) {
    logConsole(`❌ Error saving: ${err.message}`, 'stderr');
    Toast.show('error', 'Save Failed', err.message);
  }
}

// Run Simulation
async function runSimulation() {
  const runBtn = document.getElementById('btn-run');
  const simTimeBadge = document.getElementById('sim-time-badge');
  runBtn.innerHTML = `<span>⏳</span> Simulating...`;
  runBtn.disabled = true;

  const design = designEditor ? designEditor.getValue() : '';
  const testbench = testbenchEditor ? testbenchEditor.getValue() : '';

  logConsole(`\n[${new Date().toLocaleTimeString()}] Starting ${currentLanguage.toUpperCase()} compilation & simulation...`, 'info');

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        design,
        testbench,
        targetDir: currentProjectPath,
        lang: currentLanguage
      })
    });

    const data = await res.json();
    simTimeBadge.innerText = `Sim: ${data.executionTimeMs || 0} ms`;

    if (!data.success) {
      logConsole(`❌ SIMULATION ERROR (${data.stage}):`, 'stderr');
      logConsole(data.stderr || data.error || data.stdout, 'stderr');
      Toast.show('error', 'Simulation Error', `Failed at ${data.stage}. Check console for details.`);
      document.getElementById('tab-console-btn').click();
    } else {
      logConsole(`✅ ${currentLanguage.toUpperCase()} SIMULATION SUCCESS (${data.executionTimeMs}ms)`, 'success');
      Toast.show('success', 'Simulation Successful', `Completed in ${data.executionTimeMs} ms`);

      if (data.stdout) {
        logConsole(`--- Simulator Output ---\n${data.stdout}`, 'stdout');
      }

      if (data.hasVcd && data.vcdContent) {
        logConsole(`📊 Waveform generated (${data.vcdContent.length} bytes). Rendering timing diagram...`, 'info');
        waveformEngine.parseVCD(data.vcdContent);
        document.getElementById('tab-waveform-btn').click();
      } else {
        logConsole(`⚠️ Note: No dump.vcd detected.`, 'warning');
      }
    }
  } catch (err) {
    logConsole(`❌ Server error: ${err.message}`, 'stderr');
    Toast.show('error', 'Server Error', err.message);
  } finally {
    runBtn.innerHTML = `<span>▶</span> Run Simulation <span class="kbd-shortcut">Ctrl+↵</span>`;
    runBtn.disabled = false;
  }
}

// Launch GTKWave
async function launchGTKWave() {
  try {
    logConsole('Launching external GTKWave...', 'info');
    const res = await fetch('/api/open-gtkwave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDir: currentProjectPath })
    });
    const data = await res.json();
    if (data.success) {
      logConsole(`🌊 ${data.message}`, 'success');
      Toast.show('success', 'GTKWave', data.message);
    } else {
      logConsole(`⚠️ ${data.error}`, 'warning');
      Toast.show('warning', 'GTKWave', data.error);
    }
  } catch (err) {
    logConsole(`❌ Failed to launch GTKWave: ${err.message}`, 'stderr');
    Toast.show('error', 'GTKWave Error', err.message);
  }
}

// Append formatted logs to console
function logConsole(msg, type = 'stdout') {
  const consoleEl = document.getElementById('console-output');
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerText = msg;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}
