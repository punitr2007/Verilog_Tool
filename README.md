<div align="center">

# ⚡ HDL EDA Studio (`Verilog_Tool`)

**A Modern, Unified, Web-Based Integrated Development Environment for Verilog, SystemVerilog & VHDL**

*Real-time Native Simulation • Dual Monaco Editors • Interactive Canvas Digital Waveform Viewer • Auto-Dump Safeguards*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Verilog Standard](https://img.shields.io/badge/Standard-SystemVerilog--2012-06b6d4?style=for-the-badge)](https://en.wikipedia.org/wiki/SystemVerilog)
[![VHDL Standard](https://img.shields.io/badge/Standard-VHDL--2008-8b5cf6?style=for-the-badge)](https://en.wikipedia.org/wiki/VHDL)
[![Simulator: Icarus](https://img.shields.io/badge/Simulator-Icarus%20Verilog-10b981?style=for-the-badge)](http://iverilog.icarus.com/)
[![Simulator: GHDL](https://img.shields.io/badge/Simulator-GHDL-f59e0b?style=for-the-badge)](https://ghdl.github.io/ghdl/)
[![Viewer: GTKWave Bridge](https://img.shields.io/badge/Viewer-GTKWave%20Bridge-38bdf8?style=for-the-badge)](http://gtkwave.sourceforge.net/)

<br />

</div>

---

## 📖 Overview

**HDL EDA Studio** is an all-in-one, local browser-based EDA environment designed for digital hardware designers, FPGA engineers, and computer architecture students. It eliminates the friction of traditional command-line EDA workflows by fusing industry-standard editor capabilities with instant native compilation, testbench simulation, and interactive visual waveform inspection in a single pane of glass.

---

## 🎯 The Problem & The Solution

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TRADITIONAL WORKFLOW                               │
│  [VS Code / Vim] ──> [Terminal: iverilog] ──> [Terminal: vvp] ──> [X11 GTKWave] │
│      (Edit Code)        (Manual compile)      (Execute test)     (Slow popout)  │
│                                                                                 │
│   ❌ Context switching across 3-4 separate windows                              │
│   ❌ Forgetting $dumpfile / $dumpvars leads to blank/empty VCD waveforms        │
│   ❌ Difficult to test quick HDL snippets without creating build scripts        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           HDL EDA STUDIO WORKFLOW                               │
│                                                                                 │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │ Dual Monaco Editor    │  │ 1-Click / Hotkey Run  │  │ Interactive Canvas  │  │
│  │ (Design + Testbench)  │─▶│ (Native Icarus & GHDL)│─▶│ Waveform Viewer     │  │
│  │ SystemVerilog / VHDL  │  │ + Auto-Dump Safeguard │  │ Zoom, Bus, Radix    │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────────┘  │
│                                                                                 │
│   ✅ 100% unified in a single responsive studio                                 │
│   ✅ Auto-detects & injects waveform dumping if omitted                         │
│   ✅ Zero context switching; instant simulation feedback                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🖥️ 1. Dual Monaco Editor (VS Code Engine)
* **Side-by-Side Split View:** Simultaneously view and edit your hardware description (`design.sv` / `design.vhd`) alongside the simulation stimulus (`testbench.sv` / `testbench.vhd`).
* **Full Syntax Highlighting & Validation:** Powered by Microsoft's Monaco Editor with support for SystemVerilog-2012 and VHDL-2008 syntax, bracket matching, code folding, and auto-indentation.
* **Global Hotkey:** Press `Ctrl + Enter` (or `Cmd + Enter` on macOS) anywhere inside the editors to trigger instantaneous compilation and simulation.

### 🔄 2. Dynamic HDL Mode Switcher
* Seamless toggle between **SystemVerilog / Verilog (`.sv` / `.v`)** and **VHDL (`.vhd`)** via the top navigation bar.
* Automatically switches syntax highlighting, file templates, backend compiler commands, and target disk paths on the fly.

### ⚡ 3. Real-Time Native Simulation Engines
* **Verilog Engine:** Native [Icarus Verilog](http://iverilog.icarus.com/) (`iverilog -g2012`) + `vvp` execution.
* **VHDL Engine:** Native [GHDL](https://ghdl.github.io/ghdl/) (`ghdl -a --std=08`, `ghdl -e`, `ghdl -r`) execution.
* **Console Terminal:** Real-time log streamer displaying compilation warnings, syntax error line numbers, simulation status, and `$display` / `report` outputs.

### 📈 4. Interactive In-Browser Digital Waveform Viewer
* **High-Performance Canvas Engine:** Parses `.vcd` files directly in JavaScript and renders timing diagrams without relying on external plugins or window switching.
* **Digital Pulse & Bus Diamond Rendering:**
  * 1-bit signals: Clean high/low digital square waveforms with crisp transition edges.
  * Multi-bit buses: Diamond polygon transitions with decoded data labels inside bus segments.
* **Interactive Time Cursor:** Scrub anywhere along the timeline with the mouse to see live signal values at that exact instant.
* **Configurable Radix Display:** Switch multi-bit bus values instantly between **HEX** (`0x..`), **BINARY** (`b..`), and **DECIMAL** (`0..9`).
* **Navigation Controls:** Dynamic timeline ruler, Zoom In (`+`), Zoom Out (`-`), and Zoom to Fit (`Fit`).

### 🛡️ 5. Auto-Dump Waveform Safeguard
* Never suffer from empty waveforms again: If a testbench is missing `$dumpfile` or `$dumpvars`, the backend automatically injects the necessary VCD dump hooks before compilation.

### 🌊 6. External GTKWave Bridge
* Need desktop GTKWave for deep legacy inspection? Click the **"Launch GTKWave"** button to automatically spawn GTKWave with your customized color themes on your host X11 display.

### 📂 7. Pre-Built Circuit Templates
Built-in, one-click loadable templates for rapid prototyping and learning:
* **SystemVerilog:** Basic Logic Gates, 4-bit Synchronous Up-Counter, 1011 Mealy FSM Sequence Detector, Multi-function 8-bit ALU.
* **VHDL:** Basic Logic Gates (Dataflow architecture), 4-bit Synchronous Counter with Reset & Enable, 4-to-1 Multiplexer.

### 💾 8. Local Workspace Synchronization
* One-click **"Load Local Folder"** and **"Save"** buttons to sync code directly with your local workspace directories.

---

## 🏗️ Architecture & Tech Stack

```
verilog_tool/
├── public/                     # Frontend Client
│   ├── index.html              # Studio Layout & Toolbars
│   ├── styles.css              # Cyberpunk / Dark Glassmorphic Theme
│   ├── app.js                  # Monaco Integration & State Management
│   └── waveform.js             # High-Performance VCD Parser & Canvas Engine
├── server.js                   # Express Backend & Simulator CLI Orchestrator
├── launch.sh                   # Auto-start & Browser Launcher Script
├── package.json                # Project Dependencies & Scripts
└── .gitignore                  # Clean Repo Boundaries
```

* **Frontend:** Vanilla JavaScript (ES6+), HTML5 Canvas 2D API, CSS3 Flexbox/Grid, Monaco Editor CDN.
* **Backend:** Node.js, Express, Child Process CLI runner.
* **Compilers & Simulators:**
  * Icarus Verilog (`iverilog`, `vvp`)
  * GHDL (`ghdl-mcode` / `ghdl-llvm`)
  * GTKWave (`gtkwave`)

---

## 🚀 Quickstart Guide

### Prerequisites
Make sure you have Node.js and the HDL compilers installed on your Linux / macOS machine:

```bash
# On Arch Linux / CachyOS / Manjaro:
sudo pacman -S iverilog gtkwave nodejs npm

# On Ubuntu / Debian:
sudo apt-get install iverilog gtkwave nodejs npm ghdl
```

### Installation

1. **Clone the Repository:**
```bash
git clone https://github.com/punitr2007/Verilog_Tool.git
cd Verilog_Tool
```

2. **Install Node Dependencies:**
```bash
npm install
```

3. **Launch the Studio:**
```bash
./launch.sh
```
*The script starts the backend server on port `4500` and automatically opens `http://localhost:4500` in your default browser.*

---

## 💡 Keyboard Shortcuts & Usage

| Action | Shortcut / Control |
|---|---|
| **Compile & Simulate** | `Ctrl + Enter` (or `Cmd + Enter`) |
| **Zoom In Waveform** | `Ctrl + MouseWheel Up` or click `🔍+` |
| **Zoom Out Waveform** | `Ctrl + MouseWheel Down` or click `🔍-` |
| **Fit Waveform to Width** | Click `↔ Fit` |
| **Inspect Time Slice** | Hover / Click on waveform canvas |
| **Switch Bus Radix** | Change `Radix` dropdown (`HEX`, `BIN`, `DEC`) |
| **Switch Language** | Change `HDL Mode` dropdown (`Verilog` / `VHDL`) |

---

## 🔮 Future Roadmap & Enhancements

- [ ] **RTL Schematic & Netlist Visualizer:** Integrate [Yosys](https://github.com/YosysHQ/yosys) and [netlistsvg](https://github.com/nturley/netlistsvg) to generate interactive circuit block diagrams from HDL code.
- [ ] **WebAssembly Standalone Simulator:** Compile `iverilog` and `ghdl` into WebAssembly (Wasm) for a zero-installation, purely client-side simulation option.
- [ ] **WaveDrom / SVG Export:** Export rendered timing diagrams to SVG and WaveDrom JSON format for documentation and lab reports.
- [ ] **Assertion & Coverage Metrics:** Real-time coverage reports for SystemVerilog assertions (`SVA`) and functional coverage.
- [ ] **Multi-File Project Explorer:** Tabbed multi-module projects supporting complex hierarchical designs.

---

## 🤝 Contributing

Contributions, feature suggestions, and bug reports are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ for hardware developers and open-source EDA enthusiasts.</sub>
</div>
