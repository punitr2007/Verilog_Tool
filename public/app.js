/**
 * HDL EDA Studio - Core Application Logic
 * Unified SystemVerilog & VHDL Desktop Workstation (Tauri v2 + Web Ready)
 */

let designEditor = null;
let testbenchEditor = null;
let waveformEngine = null;
let currentLanguage = 'verilog'; // 'verilog' or 'vhdl'
let examplesData = {};
let currentProjectPath = '/home/punit/xilinx_projects/eda_playgrounds_acts';

// Detection for Tauri Desktop Environment
function isTauri() {
  return Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

// Unified Backend Bridge (Tauri Rust IPC <-> Web Express API)
const Backend = {
  async runSimulation(payload) {
    if (isTauri()) {
      return await window.__TAURI__.core.invoke('run_simulation', {
        design: payload.design,
        testbench: payload.testbench,
        targetDir: payload.targetDir,
        lang: payload.lang
      });
    }
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async loadProject(dirPath, lang) {
    if (isTauri()) {
      return await window.__TAURI__.core.invoke('load_project', {
        dirPath,
        lang
      });
    }
    const res = await fetch(`/api/project/load?path=${encodeURIComponent(dirPath)}&lang=${lang}`);
    return await res.json();
  },

  async saveProject(dirPath, design, testbench, lang) {
    if (isTauri()) {
      return await window.__TAURI__.core.invoke('save_project', {
        dirPath,
        design,
        testbench,
        lang
      });
    }
    const res = await fetch('/api/project/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dirPath, design, testbench, lang })
    });
    return await res.json();
  },

  async launchGTKWave(targetDir) {
    if (isTauri()) {
      try {
        const msg = await window.__TAURI__.core.invoke('launch_gtkwave', { targetDir });
        return { success: true, message: msg };
      } catch (err) {
        return { success: false, error: err };
      }
    }
    const res = await fetch('/api/open-gtkwave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDir })
    });
    return await res.json();
  },

  async selectFolder() {
    if (isTauri()) {
      try {
        return await window.__TAURI__.core.invoke('select_folder');
      } catch (e) {
        return null;
      }
    }
    return null;
  }
};

// Built-in offline fallback templates for standalone native execution
const STATIC_EXAMPLES = {
  verilog: {
    logic_gates: {
      title: "Basic Logic Gates (SV)",
      description: "AND, OR, NOT, NAND, NOR, XOR, XNOR implementation with stimulus testbench",
      design: `// SystemVerilog: Basic Logic Gates\nmodule basic_gates (\n    input a, \n    input b,\n    output yAND,\n    output yOR,\n    output yNOT,\n    output yNAND,\n    output yNOR,\n    output yXOR,\n    output yXNOR\n);\n\n    assign yAND  = a & b;       // AND gate\n    assign yOR   = a | b;       // OR gate\n    assign yNOT  = ~a;          // NOT gate\n    assign yNAND = ~(a & b);    // NAND gate\n    assign yNOR  = ~(a | b);    // NOR gate\n    assign yXOR  = a ^ b;       // XOR gate\n    assign yXNOR = ~(a ^ b);    // XNOR gate\n\nendmodule\n`,
      testbench: `\`timescale 1ns/1ps\n\nmodule tb_basic_gates;\n    reg a, b;\n    wire yAND, yOR, yNOT, yNAND, yNOR, yXOR, yXNOR;\n\n    basic_gates uut (\n        .a(a), .b(b),\n        .yAND(yAND), .yOR(yOR), .yNOT(yNOT),\n        .yNAND(yNAND), .yNOR(yNOR), .yXOR(yXOR), .yXNOR(yXNOR)\n    );\n\n    initial begin\n        $dumpfile("dump.vcd");\n        $dumpvars(0, tb_basic_gates);\n\n        $monitor("Time=%0t | a=%b b=%b | AND=%b OR=%b NOT=%b NAND=%b NOR=%b XOR=%b XNOR=%b", \n                 $time, a, b, yAND, yOR, yNOT, yNAND, yNOR, yXOR, yXNOR);\n        \n        a = 0; b = 0; #10;\n        a = 0; b = 1; #10;\n        a = 1; b = 0; #10;\n        a = 1; b = 1; #10;\n        $finish;\n    end\nendmodule\n`
    },
    counter_4bit: {
      title: "4-bit Counter (SV)",
      description: "Synchronous up-counter with active-low reset and terminal count",
      design: `// 4-bit Synchronous Up-Counter\nmodule counter_4bit (\n    input  logic       clk,\n    input  logic       rst_n,\n    input  logic       enable,\n    output logic [3:0] count,\n    output logic       tc\n);\n\n    always_ff @(posedge clk or negedge rst_n) begin\n        if (!rst_n) begin\n            count <= 4'b0000;\n        end else if (enable) begin\n            count <= count + 1'b1;\n        end\n    end\n\n    assign tc = (count == 4'b1111) && enable;\n\nendmodule\n`,
      testbench: `\`timescale 1ns/1ps\n\nmodule testbench;\n    logic       clk;\n    logic       rst_n;\n    logic       enable;\n    logic [3:0] count;\n    logic       tc;\n\n    counter_4bit dut (\n        .clk(clk),\n        .rst_n(rst_n),\n        .enable(enable),\n        .count(count),\n        .tc(tc)\n    );\n\n    always #5 clk = ~clk;\n\n    initial begin\n        $dumpfile("dump.vcd");\n        $dumpvars(0, testbench);\n\n        clk = 0; rst_n = 0; enable = 0;\n        #12 rst_n = 1;\n        #10 enable = 1;\n        #180;\n        enable = 0; #20;\n        enable = 1; #40;\n        $finish;\n    end\nendmodule\n`
    },
    fsm_detector: {
      title: "1011 Sequence Detector (SV)",
      description: "Mealy FSM bit pattern detector",
      design: `// Mealy FSM: Detects '1011'\nmodule sequence_detector_1011 (\n    input  logic clk,\n    input  logic rst,\n    input  logic din,\n    output logic dout\n);\n    typedef enum logic [1:0] { S0 = 2'b00, S1 = 2'b01, S2 = 2'b10, S3 = 2'b11 } state_t;\n    state_t state, next_state;\n\n    always_ff @(posedge clk or posedge rst) begin\n        if (rst) state <= S0;\n        else     state <= next_state;\n    end\n\n    always_comb begin\n        next_state = state;\n        dout = 1'b0;\n        case (state)\n            S0: next_state = din ? S1 : S0;\n            S1: next_state = din ? S1 : S2;\n            S2: next_state = din ? S3 : S0;\n            S3: begin\n                if (din) begin\n                    dout = 1'b1;\n                    next_state = S1;\n                end else next_state = S2;\n            end\n            default: next_state = S0;\n        endcase\n    end\nendmodule\n`,
      testbench: `\`timescale 1ns/1ps\n\nmodule testbench;\n    logic clk, rst, din, dout;\n\n    sequence_detector_1011 dut (\n        .clk(clk), .rst(rst), .din(din), .dout(dout)\n    );\n\n    always #5 clk = ~clk;\n\n    initial begin\n        $dumpfile("dump.vcd");\n        $dumpvars(0, testbench);\n\n        clk = 0; rst = 1; din = 0; #15 rst = 0;\n\n        @(posedge clk); din = 1;\n        @(posedge clk); din = 0;\n        @(posedge clk); din = 1;\n        @(posedge clk); din = 1; // Match 1\n        @(posedge clk); din = 0;\n        @(posedge clk); din = 1;\n        @(posedge clk); din = 1; // Match 2\n        @(posedge clk); din = 0;\n        #20;\n        $finish;\n    end\nendmodule\n`
    }
  },
  vhdl: {
    logic_gates_vhdl: {
      title: "Basic Logic Gates (VHDL)",
      description: "AND, OR, NOT, NAND, NOR, XOR, XNOR entity & architecture with stimulus",
      design: `-- VHDL: Basic Logic Gates\nlibrary IEEE;\nuse IEEE.STD_LOGIC_1164.ALL;\n\nentity basic_gates is\n    Port ( \n        a         : in  STD_LOGIC;\n        b         : in  STD_LOGIC;\n        c         : in  STD_LOGIC;\n        y_and     : out STD_LOGIC;\n        y_or      : out STD_LOGIC;\n        y_nand    : out STD_LOGIC;\n        y_nor     : out STD_LOGIC;\n        y_xor     : out STD_LOGIC;\n        y_xnor    : out STD_LOGIC;\n        y_complex : out STD_LOGIC\n    );\nend basic_gates;\n\narchitecture Dataflow of basic_gates is\nbegin\n    y_and     <= a and b;\n    y_or      <= a or b;\n    y_nand    <= not (a and b);\n    y_nor     <= not (a or b);\n    y_xor     <= a xor b;\n    y_xnor    <= not (a xor b);\n    y_complex <= (a and b) or (not c);\nend Dataflow;\n`,
      testbench: `-- VHDL: Testbench for Basic Logic Gates\nlibrary IEEE;\nuse IEEE.STD_LOGIC_1164.ALL;\n\nentity testbench is\nend testbench;\n\narchitecture Behavioral of testbench is\n    signal a         : STD_LOGIC := '0';\n    signal b         : STD_LOGIC := '0';\n    signal c         : STD_LOGIC := '0';\n    signal y_and     : STD_LOGIC;\n    signal y_or      : STD_LOGIC;\n    signal y_nand    : STD_LOGIC;\n    signal y_nor     : STD_LOGIC;\n    signal y_xor     : STD_LOGIC;\n    signal y_xnor    : STD_LOGIC;\n    signal y_complex : STD_LOGIC;\nbegin\n\n    dut: entity work.basic_gates\n        port map (\n            a         => a,\n            b         => b,\n            c         => c,\n            y_and     => y_and,\n            y_or      => y_or,\n            y_nand    => y_nand,\n            y_nor     => y_nor,\n            y_xor     => y_xor,\n            y_xnor    => y_xnor,\n            y_complex => y_complex\n        );\n\n    stim_proc: process\n    begin\n        a <= '0'; b <= '0'; c <= '0'; wait for 10 ns;\n        a <= '0'; b <= '1'; c <= '1'; wait for 10 ns;\n        a <= '1'; b <= '0'; c <= '0'; wait for 10 ns;\n        a <= '1'; b <= '1'; c <= '1'; wait for 10 ns;\n        \n        report "VHDL Simulation Finished Successfully!";\n        wait;\n    end process;\n\nend Behavioral;\n`
    }
  }
};

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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveProjectToDisk();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runSimulation();
    }
  });
}

function initUIEvents() {
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

  document.getElementById('btn-run').addEventListener('click', runSimulation);
  document.getElementById('btn-launch-gtkwave').addEventListener('click', launchGTKWave);
  document.getElementById('btn-save-local').addEventListener('click', saveProjectToDisk);

  // Load local folder (Native OS dialog in Desktop mode / Prompt in browser)
  document.getElementById('btn-load-local').addEventListener('click', async () => {
    if (isTauri()) {
      try {
        const folder = await Backend.selectFolder();
        if (folder) {
          loadProjectFromDisk(folder);
        }
      } catch (err) {
        loadProjectFromDisk();
      }
    } else {
      const folder = prompt('Enter project folder path to load:', currentProjectPath);
      if (folder && folder.trim()) {
        loadProjectFromDisk(folder.trim());
      }
    }
  });

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

  if (designEditor && designEditor.getModel()) {
    monaco.editor.setModelLanguage(designEditor.getModel(), monacoLang);
  }
  if (testbenchEditor && testbenchEditor.getModel()) {
    monaco.editor.setModelLanguage(testbenchEditor.getModel(), monacoLang);
  }

  document.getElementById('design-filename').innerText = isVHDL ? 'design.vhd' : 'design.sv';
  document.getElementById('testbench-filename').innerText = isVHDL ? 'testbench.vhd' : 'testbench.sv';
  document.getElementById('design-badge').innerText = isVHDL ? 'Entity & Arch' : 'Module';
  document.getElementById('hdl-std-label').innerText = isVHDL ? 'Mode: VHDL-2008 (GHDL)' : 'Mode: SystemVerilog-2012 (Icarus)';

  currentProjectPath = isVHDL
    ? '/home/punit/xilinx_projects/VHDL_Basics/Lab_Acts/01_logic_gates'
    : '/home/punit/xilinx_projects/eda_playgrounds_acts';

  document.getElementById('status-message').innerText = `Project: ${currentProjectPath}`;

  Toast.show('info', 'Mode Switched', `Active HDL mode: ${isVHDL ? 'VHDL (GHDL)' : 'SystemVerilog (Icarus)'}`);

  fetchExamples();
  loadProjectFromDisk(currentProjectPath);
}

// Fetch Examples from server or static fallback
async function fetchExamples() {
  try {
    if (isTauri()) {
      examplesData = STATIC_EXAMPLES[currentLanguage] || STATIC_EXAMPLES.verilog;
    } else {
      const res = await fetch(`/api/examples?lang=${currentLanguage}`);
      examplesData = await res.json();
    }
    const select = document.getElementById('example-select');
    select.innerHTML = '<option value="">📂 Load Example...</option>';
    for (const [key, item] of Object.entries(examplesData)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${item.title}`;
      select.appendChild(opt);
    }
  } catch (err) {
    examplesData = STATIC_EXAMPLES[currentLanguage] || STATIC_EXAMPLES.verilog;
  }
}

// Load Project from local disk
async function loadProjectFromDisk(dirPath = currentProjectPath) {
  try {
    logConsole(`Loading ${currentLanguage.toUpperCase()} project from: ${dirPath}...`);
    const data = await Backend.loadProject(dirPath, currentLanguage);
    if (data.success) {
      if (designEditor && data.design) designEditor.setValue(data.design);
      if (testbenchEditor && data.testbench) testbenchEditor.setValue(data.testbench);
      currentProjectPath = dirPath;
      document.getElementById('status-message').innerText = `Project: ${dirPath}`;
      logConsole(`Loaded source files (${data.design.length} bytes design, ${data.testbench.length} bytes tb).`);
      Toast.show('success', 'Project Loaded', `Loaded files from ${dirPath}`);
      
      setTimeout(runSimulation, 400);
    }
  } catch (err) {
    logConsole(`Error loading project: ${err.message || err}`, 'stderr');
    Toast.show('error', 'Load Failed', err.message || err);
  }
}

// Save Project to local disk
async function saveProjectToDisk() {
  try {
    const design = designEditor ? designEditor.getValue() : '';
    const testbench = testbenchEditor ? testbenchEditor.getValue() : '';
    const data = await Backend.saveProject(currentProjectPath, design, testbench, currentLanguage);
    if (data.success) {
      logConsole(`✅ ${data.message}`, 'success');
      Toast.show('success', 'Saved Successfully', `Saved files to ${currentProjectPath}`);
    } else {
      logConsole(`❌ Error saving: ${data.error}`, 'stderr');
      Toast.show('error', 'Save Failed', data.error);
    }
  } catch (err) {
    logConsole(`❌ Error saving: ${err.message || err}`, 'stderr');
    Toast.show('error', 'Save Failed', err.message || err);
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
    const data = await Backend.runSimulation({
      design,
      testbench,
      targetDir: currentProjectPath,
      lang: currentLanguage
    });

    const execTime = data.execution_time_ms || data.executionTimeMs || 0;
    simTimeBadge.innerText = `Sim: ${execTime} ms`;

    if (!data.success) {
      logConsole(`❌ SIMULATION ERROR (${data.stage}):`, 'stderr');
      logConsole(data.stderr || data.error || data.stdout, 'stderr');
      Toast.show('error', 'Simulation Error', `Failed at ${data.stage}. Check console.`);
      document.getElementById('tab-console-btn').click();
    } else {
      logConsole(`✅ ${currentLanguage.toUpperCase()} SIMULATION SUCCESS (${execTime}ms)`, 'success');
      Toast.show('success', 'Simulation Successful', `Completed in ${execTime} ms`);

      if (data.stdout) {
        logConsole(`--- Simulator Output ---\n${data.stdout}`, 'stdout');
      }

      const vcd = data.vcd_content || data.vcdContent;
      const hasVcd = data.has_vcd || data.hasVcd;

      if (hasVcd && vcd) {
        logConsole(`📊 Waveform generated (${vcd.length} bytes). Rendering timing diagram...`, 'info');
        waveformEngine.parseVCD(vcd);
        document.getElementById('tab-waveform-btn').click();
      } else {
        logConsole(`⚠️ Note: No dump.vcd detected.`, 'warning');
      }
    }
  } catch (err) {
    logConsole(`❌ Backend error: ${err.message || err}`, 'stderr');
    Toast.show('error', 'Simulator Error', err.message || err);
  } finally {
    runBtn.innerHTML = `<span>▶</span> Run Simulation <span class="kbd-shortcut">Ctrl+↵</span>`;
    runBtn.disabled = false;
  }
}

// Launch GTKWave
async function launchGTKWave() {
  try {
    logConsole('Launching external GTKWave...', 'info');
    const data = await Backend.launchGTKWave(currentProjectPath);
    if (data.success) {
      logConsole(`🌊 ${data.message}`, 'success');
      Toast.show('success', 'GTKWave', data.message);
    } else {
      logConsole(`⚠️ ${data.error}`, 'warning');
      Toast.show('warning', 'GTKWave', data.error);
    }
  } catch (err) {
    logConsole(`❌ Failed to launch GTKWave: ${err.message || err}`, 'stderr');
    Toast.show('error', 'GTKWave Error', err.message || err);
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
