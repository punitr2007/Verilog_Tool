<div align="center">

# ⚡ HDL EDA Studio (`Verilog_Tool`)

**A Standalone Native Desktop Workstation (Tauri v2 + Rust) & Web Integrated Development Environment for SystemVerilog, Verilog & VHDL**

*Instant Sub-Millisecond Native Simulation • Ultra-Lightweight (~15MB Executable) • Dual Monaco Editors • Interactive High-DPI Waveform Viewer • Drag & Drop Signal Reordering • Auto-Dump Safeguards • Offline Ready*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Platform: Desktop & Web](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-7c3aed?style=for-the-badge)](https://tauri.app/)
[![Rust Core](https://img.shields.io/badge/Core-Tauri%20v2%20%2B%20Rust-orange?style=for-the-badge)](https://www.rust-lang.org/)
[![Verilog Standard](https://img.shields.io/badge/Standard-SystemVerilog--2012-06b6d4?style=for-the-badge)](https://en.wikipedia.org/wiki/SystemVerilog)
[![VHDL Standard](https://img.shields.io/badge/Standard-VHDL--2008-8b5cf6?style=for-the-badge)](https://en.wikipedia.org/wiki/VHDL)
[![Simulator: Icarus](https://img.shields.io/badge/Simulator-Icarus%20Verilog-10b981?style=for-the-badge)](http://iverilog.icarus.com/)
[![Simulator: GHDL](https://img.shields.io/badge/Simulator-GHDL-f59e0b?style=for-the-badge)](https://ghdl.github.io/ghdl/)

<br />

</div>

---

## 📖 Overview

**HDL EDA Studio** is a full-fledged, standalone local desktop EDA workstation (benchmarked against tools like Analog Devices' **LTspice**, ModelSim, and GTKWave) and web IDE for digital hardware designers, FPGA engineers, and computer architecture students. 

Built with **Tauri v2 and a compiled Rust process-orchestration core**, it launches instantly with a minimal RAM footprint, delivers native OS file pickers, executes simulations directly on host compilers (`iverilog`, `vvp`, `ghdl`), and renders digital waveforms in a high-DPI interactive timing canvas with zero browser dependency required.

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
│                     HDL EDA STUDIO NATIVE WORKSTATION (TAURI v2)                │
│                                                                                 │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │ Dual Monaco Editor    │  │ Rust Native Process   │  │ Interactive High-DPI│  │
│  │ (Design + Testbench)  │─▶│ Orchestrator          │─▶│ Waveform Viewer     │  │
│  │ SystemVerilog / VHDL  │  │ (Icarus & GHDL Engine)│  │ Drag-Drop, Radix    │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────────┘  │
│                                                                                 │
│   ✅ 100% Standalone Native Desktop App (like LTspice, ~15MB binary)            │
│   ✅ Sub-millisecond direct process spawning with zero Electron bloat           │
│   ✅ Native OS file/folder pickers & desktop menu integration                   │
│   ✅ Dual compatibility: Run as standalone desktop app OR web service          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🖥️ 1. Standalone Native Desktop Application (Tauri v2 + Rust)
* **LTspice-Grade Efficiency:** Lightweight standalone binary (~15MB) with instantaneous startup and low memory usage.
* **Native File Pickers:** Direct OS folder and file pickers (`rfd`) to open project files anywhere on your disk.
* **Linux Desktop Integration:** Includes `.desktop` entry and icons for application launcher and dock pinning.

### 📝 2. Dual Monaco Editor (VS Code Engine)
* **Side-by-Side Split View:** Simultaneously view and edit your hardware description (`design.sv` / `design.vhd`) alongside the simulation stimulus (`testbench.sv` / `testbench.vhd`).
* **Custom `eda-dark` Theme:** Tailored dark theme with clear contrast, font ligatures, line highlights, and syntax coloring for SystemVerilog-2012 and VHDL-2008.
* **Quick Actions:** Dedicated Copy Code and Clear buttons on both design and testbench headers.
* **Global Hotkeys:** Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> anywhere to trigger compilation & simulation, and <kbd>Ctrl</kbd> + <kbd>S</kbd> to save directly to disk.

### 🔄 3. Segmented HDL Mode Switcher
* Seamless toggle between **SystemVerilog (`.sv` / `.v`)** and **VHDL (`.vhd`)** via the segmented top navbar.
* Automatically updates Monaco syntax models, file naming, backend compiler commands, and target disk paths on the fly.

### ⚡ 4. Real-Time Native Simulation Engines
* **Verilog Engine:** Native [Icarus Verilog](http://iverilog.icarus.com/) (`iverilog -g2012`) + `vvp` execution.
* **VHDL Engine:** Native [GHDL](https://ghdl.github.io/ghdl/) (`ghdl -a --std=08`, `ghdl -e`, `ghdl -r`) execution.
* **Console Terminal:** Real-time log streamer displaying compilation warnings, syntax error line numbers, simulation status, and `$display` / `report` outputs with syntax coloring.

### 📈 5. Interactive Digital Waveform Viewer & Reordering
* **Drag-and-Drop Signal Reordering:** Every signal row features a drag handle (`≡`). Drag any signal up or down to reorder nets dynamically; the timing diagram automatically updates the trace order in sync!
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

### 🛡️ 6. Auto-Dump Waveform Safeguard
* Never suffer from empty waveforms again: If a testbench is missing `$dumpfile` or `$dumpvars`, the backend automatically injects the necessary VCD dump hooks before compilation.

### 🌊 7. External GTKWave Bridge
* Need desktop GTKWave for deep legacy inspection? Click the **"GTKWave"** button to automatically spawn GTKWave on your host display.

### 📂 8. Pre-Built Circuit Templates
Built-in, one-click loadable templates for rapid prototyping and learning:
* **SystemVerilog:** Basic Logic Gates, 4-bit Synchronous Up-Counter, 1011 Mealy FSM Sequence Detector, Multi-function 8-bit ALU.
* **VHDL:** Basic Logic Gates (Dataflow architecture), 4-bit Synchronous Counter with Reset & Enable, 4-to-1 Multiplexer.

---

## 🏗️ Architecture & Tech Stack

```
Verilog_Tool/
├── src-tauri/                  # Tauri v2 Native Rust Core
│   ├── src/
│   │   ├── lib.rs              # Native Process Orchestrator, File Dialogs & Simulator Commands
│   │   └── main.rs             # Desktop Application Entry Point
│   ├── icons/                  # Desktop Application Icons
│   ├── Cargo.toml              # Rust Dependencies & Features
│   └── tauri.conf.json         # Tauri v2 Desktop Window & Bundle Settings
├── public/                     # Universal Frontend (Tauri Desktop & Web Ready)
│   ├── index.html              # Studio Layout, Segmented Switcher & Toolbars
│   ├── styles.css              # Custom Properties, Inter & JetBrains Mono Fonts
│   ├── app.js                  # Unified Bridge Client (Tauri Rust IPC <-> Express API)
│   └── waveform.js             # High-DPI VCD Parser, Drag-Drop Reordering & Canvas Engine
├── server.js                   # Node.js Express Backend (Optional Web Mode)
├── launch.sh                   # Browser Web Mode Launcher Script
├── hdl-eda-studio.desktop      # Linux Desktop Entry Shortcut
└── package.json                # Project Dependencies & Scripts
```

---

## 🚀 Quickstart & Installation Guide

### 1. Prerequisites

Ensure Rust, Node.js, and the HDL compilers are installed on your system:

#### Arch Linux / CachyOS / Manjaro
```bash
sudo pacman -S rustup nodejs npm iverilog gtkwave
# For VHDL (GHDL from AUR):
yay -S ghdl-mcode
```

#### Ubuntu / Debian / Linux Mint
```bash
sudo apt update
sudo apt install -y build-essential curl libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev nodejs npm iverilog gtkwave ghdl
# Install Rust if not present:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
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

3. **Run as Native Desktop App (Tauri v2):**
```bash
npm run desktop
```
*Or build the standalone release binary:*
```bash
npm run desktop:build
# Executable located at: src-tauri/target/release/hdl-eda-studio
```

4. **Run as Web Service / Browser IDE:**
```bash
./launch.sh
# Opens http://localhost:4500 in your browser
```

---

## 💡 Keyboard Shortcuts & Controls

| Action | Shortcut / Control |
|---|---|
| **Compile & Simulate** | <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>Cmd</kbd> + <kbd>Enter</kbd>) |
| **Save Project to Disk** | <kbd>Ctrl</kbd> + <kbd>S</kbd> (or <kbd>Cmd</kbd> + <kbd>S</kbd>) |
| **Reorder Signals** | Drag the `≡` handle up or down |
| **Zoom In Waveform** | <kbd>Ctrl</kbd> + <kbd>MouseWheel Up</kbd> or click `🔍+` |
| **Zoom Out Waveform** | <kbd>Ctrl</kbd> + <kbd>MouseWheel Down</kbd> or click `🔍-` |
| **Fit Waveform to Screen** | Click `↔ Fit` |
| **Inspect Time Slice** | Hover / Click & Drag on waveform canvas |
| **Filter Signals** | Type in the `🔍 Filter signals...` search box |
| **Switch Bus Radix** | Change `Radix` dropdown (`HEX`, `BIN`, `DEC`, `ASCII`) |
| **Switch HDL Mode** | Toggle `SystemVerilog` or `VHDL` in the top navbar |
| **Export Waveform Snapshot** | Click `📷 Export` to download a PNG image |

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ for hardware developers, students, and open-source EDA enthusiasts.</sub>
</div>
