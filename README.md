<div align="center">

# ⚡ HDL EDA Studio (`Verilog_Tool`)

**A Modern, CollectUI-Inspired Web Integrated Development Environment for SystemVerilog, Verilog & VHDL**

*Real-Time Native Simulation • Dual Monaco Editors • Interactive High-DPI Waveform Viewer • Signal Filtering • Auto-Dump Safeguards • Image Export*

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

**HDL EDA Studio** is a unified, local browser-based EDA workstation designed for digital hardware designers, FPGA engineers, and computer architecture students. It eliminates the friction of traditional multi-window command-line EDA workflows by fusing VS Code-tier Monaco editors with instant native simulation, interactive digital waveform analysis, signal search, and diagnostics in a single responsive pane.

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
│  │ Dual Monaco Editor    │  │ 1-Click / Hotkey Run  │  │ Interactive High-DPI│  │
│  │ (Design + Testbench)  │─▶│ (Native Icarus & GHDL)│─▶│ Waveform Viewer     │  │
│  │ SystemVerilog / VHDL  │  │ + Auto-Dump Safeguard │  │ Search, Bus, Radix  │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────────┘  │
│                                                                                 │
│   ✅ 100% unified in a single responsive glassmorphic workstation               │
│   ✅ Auto-detects & injects waveform dumping if omitted                         │
│   ✅ Real-time signal search, radix decoding, and image export                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🖥️ 1. Dual Monaco Editor (VS Code Engine)
* **Side-by-Side Split View:** Simultaneously view and edit your hardware description (`design.sv` / `design.vhd`) alongside the simulation stimulus (`testbench.sv` / `testbench.vhd`).
* **Custom `eda-dark` Theme:** Tailored dark theme with clear contrast, font ligatures, line highlights, and syntax coloring for SystemVerilog-2012 and VHDL-2008.
* **Quick Actions:** Dedicated Copy Code and Clear buttons on both design and testbench headers.
* **Global Hotkey:** Press `Ctrl + Enter` (or `Cmd + Enter`) anywhere inside the studio to trigger instantaneous compilation and simulation.
* **Direct Save:** Press `Ctrl + S` to save files directly to disk without browser dialog interruptions.

### 🔄 2. Segmented HDL Mode Switcher
* Seamless toggle between **SystemVerilog (`.sv` / `.v`)** and **VHDL (`.vhd`)** via the segmented top navbar.
* Automatically updates Monaco syntax models, file naming, backend compiler commands, and target disk paths on the fly.

### ⚡ 3. Real-Time Native Simulation Engines
* **Verilog Engine:** Native [Icarus Verilog](http://iverilog.icarus.com/) (`iverilog -g2012`) + `vvp` execution.
* **VHDL Engine:** Native [GHDL](https://ghdl.github.io/ghdl/) (`ghdl -a --std=08`, `ghdl -e`, `ghdl -r`) execution.
* **Console Terminal:** Real-time log streamer displaying compilation warnings, syntax error line numbers, simulation status, and `$display` / `report` outputs with syntax coloring.

### 📈 4. Interactive In-Browser Digital Waveform Viewer
* **High-DPI Canvas Engine:** Device-pixel-ratio aware 2D canvas that renders sharp timing diagrams without relying on external plugins or window switching.
* **Signal Search & Filter:** Instant search bar in the signal sidebar to isolate specific nets and buses in large modules.
* **Hover Row Synchronization:** Hovering over any signal in the sidebar highlights the corresponding trace and vice-versa.
* **Digital Pulse & Bus Diamond Rendering:**
  * 1-bit signals: Crisp high/low square waveforms in electric cyan.
  * Multi-bit buses: Diamond polygon transitions with decoded data labels inside bus segments.
* **Interactive Time Cursor:** Scrub anywhere along the timeline with the mouse to inspect live signal values at that exact timestamp.
* **Configurable Radix Display:** Switch multi-bit bus values instantly between **HEX** (`0x..`), **BINARY** (`b..`), **DECIMAL** (`0..9`), and **ASCII**.
* **Navigation Controls:** Dynamic timeline ruler, Zoom In (`+`), Zoom Out (`-`), Zoom to Fit (`Fit`), and Zoom Percentage readout.
* **Snapshot Export:** One-click **"Export"** button generates a downloadable PNG image of the timing diagram for lab reports.

### 🛡️ 5. Auto-Dump Waveform Safeguard
* Never suffer from empty waveforms again: If a testbench is missing `$dumpfile` or `$dumpvars`, the backend automatically injects the necessary VCD dump hooks before compilation.

### 🌊 6. External GTKWave Bridge
* Need desktop GTKWave for deep legacy inspection? Click the **"GTKWave"** button to automatically spawn GTKWave with your customized color themes on your host X11 display.

### 📂 7. Pre-Built Circuit Templates
Built-in, one-click loadable templates for rapid prototyping and learning:
* **SystemVerilog:** Basic Logic Gates, 4-bit Synchronous Up-Counter, 1011 Mealy FSM Sequence Detector, Multi-function 8-bit ALU.
* **VHDL:** Basic Logic Gates (Dataflow architecture), 4-bit Synchronous Counter with Reset & Enable, 4-to-1 Multiplexer.

### 🔔 8. Non-Blocking Toast System & Shortcuts Modal
* Replaces jarring browser alerts with sleek, auto-dismissing toast notifications.
* Press `⌨️` or view the built-in modal for quick access to keyboard shortcuts.

---

## 🏗️ Architecture & Tech Stack

```
Verilog_Tool/
├── public/                     # Frontend Client (CollectUI & Modern Design System)
│   ├── index.html              # Studio Layout, Segmented Switcher & Toolbars
│   ├── styles.css              # Custom Properties, Inter & JetBrains Mono Fonts
│   ├── app.js                  # Monaco Integration, Keybindings & State Management
│   └── waveform.js             # High-DPI VCD Parser, Signal Search & Canvas Engine
├── server.js                   # Express Backend & Simulator CLI Orchestrator
├── launch.sh                   # Auto-start & Browser Launcher Script
├── package.json                # Project Dependencies & Scripts
└── .gitignore                  # Clean Repo Boundaries
```

* **Frontend:** Vanilla JavaScript (ES6+), HTML5 Canvas 2D API (High-DPI Aware), Modern CSS Custom Properties, Monaco Editor CDN.
* **Backend:** Node.js, Express, Child Process CLI runner.
* **Compilers & Simulators:**
  * Icarus Verilog (`iverilog`, `vvp`)
  * GHDL (`ghdl-mcode` / `ghdl-llvm` / `ghdl-gcc`)
  * GTKWave (`gtkwave` / `gtkwave_light`)

---

## 🚀 Quickstart & Installation Guide

### 1. Prerequisites

Ensure Node.js and the HDL compilers are installed on your system:

#### Arch Linux / CachyOS / Manjaro
```bash
sudo pacman -S nodejs npm iverilog gtkwave
# For VHDL (GHDL from AUR):
yay -S ghdl-mcode
```

#### Ubuntu / Debian / Linux Mint
```bash
sudo apt update
sudo apt install -y nodejs npm iverilog gtkwave ghdl
```

#### Fedora / RHEL
```bash
sudo dnf install -y nodejs npm iverilog gtkwave ghdl
```

#### macOS (Homebrew)
```bash
brew install node icarus-verilog gtkwave ghdl
```

#### Windows (WSL2 - Ubuntu)
Install Ubuntu under WSL2, then run:
```bash
sudo apt update && sudo apt install -y nodejs npm iverilog gtkwave ghdl
```

---

### 2. Setup & Execution

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
*Or start manually with:*
```bash
npm start
```

4. **Open in Browser:**
Navigate to **`http://localhost:4500`** in any modern web browser.

---

## 💡 Keyboard Shortcuts & Controls

| Action | Shortcut / Control |
|---|---|
| **Compile & Simulate** | <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>Cmd</kbd> + <kbd>Enter</kbd>) |
| **Save Project to Disk** | <kbd>Ctrl</kbd> + <kbd>S</kbd> (or <kbd>Cmd</kbd> + <kbd>S</kbd>) |
| **Zoom In Waveform** | <kbd>Ctrl</kbd> + <kbd>MouseWheel Up</kbd> or click `🔍+` |
| **Zoom Out Waveform** | <kbd>Ctrl</kbd> + <kbd>MouseWheel Down</kbd> or click `🔍-` |
| **Fit Waveform to Screen** | Click `↔ Fit` |
| **Inspect Time Slice** | Hover / Click & Drag on waveform canvas |
| **Filter Signals** | Type in the `🔍 Filter signals...` search box |
| **Switch Bus Radix** | Change `Radix` dropdown (`HEX`, `BIN`, `DEC`, `ASCII`) |
| **Switch HDL Mode** | Toggle `SystemVerilog` or `VHDL` in the top navbar |
| **Export Waveform Snapshot** | Click `📷 Export` to download a PNG image |

---

## 🔮 Future Roadmap & Enhancements

- [ ] **RTL Schematic & Netlist Visualizer:** Integrate [Yosys](https://github.com/YosysHQ/yosys) and [netlistsvg](https://github.com/nturley/netlistsvg) to generate interactive circuit block diagrams from HDL code.
- [ ] **WebAssembly Standalone Simulator:** Compile `iverilog` and `ghdl` into WebAssembly (Wasm) for a zero-installation, purely client-side simulation option.
- [ ] **WaveDrom / JSON Export:** Export rendered timing diagrams to WaveDrom JSON format for documentation and reports.
- [ ] **Assertion & Coverage Metrics:** Real-time coverage reports for SystemVerilog assertions (`SVA`).
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
  <sub>Built with ❤️ for hardware developers, students, and open-source EDA enthusiasts.</sub>
</div>
