/**
 * HDL EDA Studio Application Logic (Verilog & VHDL)
 */
let designEditor = null;
let testbenchEditor = null;
let waveformEngine = null;
let currentLanguage = 'verilog'; // 'verilog' or 'vhdl'
let examplesData = {};
let currentProjectPath = '/home/punit/xilinx_projects/eda_playgrounds_acts';

// Wait for DOM & Monaco
document.addEventListener('DOMContentLoaded', () => {
  initWaveform();
  initMonaco();
  initUIEvents();
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
    const editorOptions = {
      language: 'systemverilog',
      theme: 'vs-dark',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      lineNumbers: 'on',
      renderLineHighlight: 'all'
    };

    // Initialize Design Editor
    designEditor = monaco.editor.create(document.getElementById('design-editor'), {
      ...editorOptions,
      value: `// SystemVerilog Design Module\nmodule logic_gates (\n    input  logic A,\n    input  logic B,\n    output logic out_and\n);\n    assign out_and = A & B;\nendmodule\n`
    });

    // Initialize Testbench Editor
    testbenchEditor = monaco.editor.create(document.getElementById('testbench-editor'), {
      ...editorOptions,
      value: `\`timescale 1ns/1ps\n\nmodule testbench;\n    logic A, B, out_and;\n\n    logic_gates dut (.A(A), .B(B), .out_and(out_and));\n\n    initial begin\n        $dumpfile("dump.vcd");\n        $dumpvars(0, testbench);\n        A = 0; B = 0; #10;\n        A = 1; B = 1; #10;\n        $finish;\n    end\nendmodule\n`
    });

    // Global Hotkey (Ctrl+Enter / Cmd+Enter to run simulation)
    const runAction = {
      id: 'run-simulation',
      label: 'Run Simulation',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: runSimulation
    };

    designEditor.addAction(runAction);
    testbenchEditor.addAction(runAction);

    // Initial load
    fetchExamples();
    loadProjectFromDisk();
  });
}

function initUIEvents() {
  // Language Switcher Dropdown
  const langSelect = document.getElementById('lang-select');
  langSelect.addEventListener('change', (e) => {
    switchLanguageMode(e.target.value);
  });

  // Run button
  document.getElementById('btn-run').addEventListener('click', runSimulation);

  // GTKWave launcher button
  document.getElementById('btn-launch-gtkwave').addEventListener('click', launchGTKWave);

  // Save / Load local
  document.getElementById('btn-save-local').addEventListener('click', saveProjectToDisk);
  document.getElementById('btn-load-local').addEventListener('click', () => loadProjectFromDisk());

  // Example templates dropdown
  document.getElementById('example-select').addEventListener('change', (e) => {
    const key = e.target.value;
    if (key && examplesData[key]) {
      const ex = examplesData[key];
      if (designEditor) designEditor.setValue(ex.design);
      if (testbenchEditor) testbenchEditor.setValue(ex.testbench);
      logConsole(`Loaded template: ${ex.title}`);
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

  document.getElementById('radix-select').addEventListener('change', (e) => {
    if (waveformEngine) waveformEngine.setRadix(e.target.value);
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
  document.getElementById('design-tab-title').innerHTML = isVHDL
    ? '📄 design.vhd <span class="badge bit">Entity & Arch</span>'
    : '📄 design.sv <span class="badge bit">Module</span>';

  document.getElementById('testbench-tab-title').innerHTML = isVHDL
    ? '🧪 testbench.vhd <span class="badge bus">Stimulus</span>'
    : '🧪 testbench.sv <span class="badge bus">Stimulus</span>';

  document.getElementById('design-meta-badge').innerText = isVHDL ? 'VHDL-2008' : 'SystemVerilog-2012';
  document.getElementById('testbench-meta-badge').innerText = isVHDL ? 'VHDL-2008' : 'SystemVerilog-2012';
  document.getElementById('hdl-std-label').innerText = isVHDL ? 'Mode: VHDL-2008 (GHDL)' : 'Mode: SystemVerilog-2012 (Icarus)';

  // Update Project Directory
  currentProjectPath = isVHDL
    ? '/home/punit/xilinx_projects/VHDL_Basics/Lab_Acts/01_logic_gates'
    : '/home/punit/xilinx_projects/eda_playgrounds_acts';

  document.getElementById('status-message').innerText = `Project: ${currentProjectPath}`;

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
    select.innerHTML = '<option value="">📂 Load Example Template...</option>';
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
      
      // Auto run first simulation
      setTimeout(runSimulation, 400);
    }
  } catch (err) {
    logConsole(`Error loading project: ${err.message}`, true);
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
      logConsole(`✅ ${data.message}`);
      alert(`Files successfully saved to ${currentProjectPath}!`);
    }
  } catch (err) {
    logConsole(`❌ Error saving: ${err.message}`, true);
  }
}

// Run Simulation
async function runSimulation() {
  const runBtn = document.getElementById('btn-run');
  const simTimeBadge = document.getElementById('sim-time-badge');
  runBtn.innerText = '⏳ Simulating...';
  runBtn.disabled = true;

  const design = designEditor ? designEditor.getValue() : '';
  const testbench = testbenchEditor ? testbenchEditor.getValue() : '';

  logConsole(`\n[${new Date().toLocaleTimeString()}] Starting ${currentLanguage.toUpperCase()} simulation (${currentLanguage === 'vhdl' ? 'GHDL' : 'Icarus'})...`);

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
      logConsole(`❌ SIMULATION ERROR (${data.stage}):`, true);
      logConsole(data.stderr || data.error || data.stdout, true);
      document.getElementById('tab-console-btn').click();
    } else {
      logConsole(`✅ ${currentLanguage.toUpperCase()} SIMULATION SUCCESS (${data.executionTimeMs}ms)`);
      if (data.stdout) {
        logConsole(`--- Simulator Output ---\n${data.stdout}`);
      }

      if (data.hasVcd && data.vcdContent) {
        logConsole(`📊 Waveform generated (${data.vcdContent.length} bytes). Rendering timing diagram...`);
        waveformEngine.parseVCD(data.vcdContent);
        document.getElementById('tab-waveform-btn').click();
      } else {
        logConsole(`⚠️ Note: No dump.vcd detected.`);
      }
    }
  } catch (err) {
    logConsole(`❌ Server error: ${err.message}`, true);
  } finally {
    runBtn.innerText = '▶ Run Simulation';
    runBtn.disabled = false;
  }
}

// Launch GTKWave
async function launchGTKWave() {
  try {
    logConsole('Launching external GTKWave...');
    const res = await fetch('/api/open-gtkwave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDir: currentProjectPath })
    });
    const data = await res.json();
    if (data.success) {
      logConsole(`🌊 ${data.message}`);
    } else {
      logConsole(`⚠️ ${data.error}`, true);
    }
  } catch (err) {
    logConsole(`❌ Failed to launch GTKWave: ${err.message}`, true);
  }
}

// Append logs to the console tab
function logConsole(msg, isError = false) {
  const consoleEl = document.getElementById('console-output');
  const line = document.createElement('div');
  line.className = isError ? 'stderr' : 'stdout';
  line.innerText = msg;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}
