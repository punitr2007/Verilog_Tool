const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4500;

// Ensure local tool paths are in PATH
const HOME_DIR = process.env.HOME || '/home/punit';
process.env.PATH = `${HOME_DIR}/.local/bin:${HOME_DIR}/.local/ghdl/bin:${process.env.PATH}`;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const RUNTIME_DIR = path.join(__dirname, '.sim_runtime');
if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

// Built-in Examples for both Verilog/SystemVerilog and VHDL
const EXAMPLES = {
  verilog: {
    logic_gates: {
      title: "Basic Logic Gates (SV)",
      description: "AND, OR, NOT, NAND, NOR, XOR, XNOR implementation with stimulus testbench",
      design: `// SystemVerilog: Basic Logic Gates
module basic_gates (
    input a, 
    input b,
    output yAND,
    output yOR,
    output yNOT,
    output yNAND,
    output yNOR,
    output yXOR,
    output yXNOR
);

    assign yAND  = a & b;       // AND gate
    assign yOR   = a | b;       // OR gate
    assign yNOT  = ~a;          // NOT gate
    assign yNAND = ~(a & b);    // NAND gate
    assign yNOR  = ~(a | b);    // NOR gate
    assign yXOR  = a ^ b;       // XOR gate
    assign yXNOR = ~(a ^ b);    // XNOR gate

endmodule
`,
      testbench: `\`timescale 1ns/1ps

module tb_basic_gates;
    reg a, b;
    wire yAND, yOR, yNOT, yNAND, yNOR, yXOR, yXNOR;

    basic_gates uut (
        .a(a), .b(b),
        .yAND(yAND), .yOR(yOR), .yNOT(yNOT),
        .yNAND(yNAND), .yNOR(yNOR), .yXOR(yXOR), .yXNOR(yXNOR)
    );

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, tb_basic_gates);

        $monitor("Time=%0t | a=%b b=%b | AND=%b OR=%b NOT=%b NAND=%b NOR=%b XOR=%b XNOR=%b", 
                 $time, a, b, yAND, yOR, yNOT, yNAND, yNOR, yXOR, yXNOR);
        
        a = 0; b = 0; #10;
        a = 0; b = 1; #10;
        a = 1; b = 0; #10;
        a = 1; b = 1; #10;
        $finish;
    end
endmodule
`
    },
    counter_4bit: {
      title: "4-bit Counter (SV)",
      description: "Synchronous up-counter with active-low reset and terminal count",
      design: `// 4-bit Synchronous Up-Counter
module counter_4bit (
    input  logic       clk,
    input  logic       rst_n,
    input  logic       enable,
    output logic [3:0] count,
    output logic       tc
);

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            count <= 4'b0000;
        end else if (enable) begin
            count <= count + 1'b1;
        end
    end

    assign tc = (count == 4'b1111) && enable;

endmodule
`,
      testbench: `\`timescale 1ns/1ps

module testbench;
    logic       clk;
    logic       rst_n;
    logic       enable;
    logic [3:0] count;
    logic       tc;

    counter_4bit dut (
        .clk(clk),
        .rst_n(rst_n),
        .enable(enable),
        .count(count),
        .tc(tc)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, testbench);

        clk = 0; rst_n = 0; enable = 0;
        #12 rst_n = 1;
        #10 enable = 1;
        #180;
        enable = 0; #20;
        enable = 1; #40;
        $finish;
    end
endmodule
`
    },
    fsm_detector: {
      title: "1011 Sequence Detector (SV)",
      description: "Mealy FSM bit pattern detector",
      design: `// Mealy FSM: Detects '1011'
module sequence_detector_1011 (
    input  logic clk,
    input  logic rst,
    input  logic din,
    output logic dout
);
    typedef enum logic [1:0] { S0 = 2'b00, S1 = 2'b01, S2 = 2'b10, S3 = 2'b11 } state_t;
    state_t state, next_state;

    always_ff @(posedge clk or posedge rst) begin
        if (rst) state <= S0;
        else     state <= next_state;
    end

    always_comb begin
        next_state = state;
        dout = 1'b0;
        case (state)
            S0: next_state = din ? S1 : S0;
            S1: next_state = din ? S1 : S2;
            S2: next_state = din ? S3 : S0;
            S3: begin
                if (din) begin
                    dout = 1'b1;
                    next_state = S1;
                end else next_state = S2;
            end
            default: next_state = S0;
        endcase
    end
endmodule
`,
      testbench: `\`timescale 1ns/1ps

module testbench;
    logic clk, rst, din, dout;

    sequence_detector_1011 dut (
        .clk(clk), .rst(rst), .din(din), .dout(dout)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, testbench);

        clk = 0; rst = 1; din = 0; #15 rst = 0;

        @(posedge clk); din = 1;
        @(posedge clk); din = 0;
        @(posedge clk); din = 1;
        @(posedge clk); din = 1; // Match 1
        @(posedge clk); din = 0;
        @(posedge clk); din = 1;
        @(posedge clk); din = 1; // Match 2
        @(posedge clk); din = 0;
        #20;
        $finish;
    end
endmodule
`
    }
  },
  vhdl: {
    logic_gates_vhdl: {
      title: "Basic Logic Gates (VHDL)",
      description: "AND, OR, NOT, NAND, NOR, XOR, XNOR entity & architecture with stimulus",
      design: `-- VHDL: Basic Logic Gates
library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity basic_gates is
    Port ( 
        a         : in  STD_LOGIC;
        b         : in  STD_LOGIC;
        c         : in  STD_LOGIC;
        y_and     : out STD_LOGIC;
        y_or      : out STD_LOGIC;
        y_nand    : out STD_LOGIC;
        y_nor     : out STD_LOGIC;
        y_xor     : out STD_LOGIC;
        y_xnor    : out STD_LOGIC;
        y_complex : out STD_LOGIC
    );
end basic_gates;

architecture Dataflow of basic_gates is
begin
    y_and     <= a and b;
    y_or      <= a or b;
    y_nand    <= not (a and b);
    y_nor     <= not (a or b);
    y_xor     <= a xor b;
    y_xnor    <= not (a xor b);
    y_complex <= (a and b) or (not c);
end Dataflow;
`,
      testbench: `-- VHDL: Testbench for Basic Logic Gates
library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity testbench is
end testbench;

architecture Behavioral of testbench is
    signal a         : STD_LOGIC := '0';
    signal b         : STD_LOGIC := '0';
    signal c         : STD_LOGIC := '0';
    signal y_and     : STD_LOGIC;
    signal y_or      : STD_LOGIC;
    signal y_nand    : STD_LOGIC;
    signal y_nor     : STD_LOGIC;
    signal y_xor     : STD_LOGIC;
    signal y_xnor    : STD_LOGIC;
    signal y_complex : STD_LOGIC;
begin

    dut: entity work.basic_gates
        port map (
            a         => a,
            b         => b,
            c         => c,
            y_and     => y_and,
            y_or      => y_or,
            y_nand    => y_nand,
            y_nor     => y_nor,
            y_xor     => y_xor,
            y_xnor    => y_xnor,
            y_complex => y_complex
        );

    stim_proc: process
    begin
        a <= '0'; b <= '0'; c <= '0'; wait for 10 ns;
        a <= '0'; b <= '1'; c <= '1'; wait for 10 ns;
        a <= '1'; b <= '0'; c <= '0'; wait for 10 ns;
        a <= '1'; b <= '1'; c <= '1'; wait for 10 ns;
        
        report "VHDL Simulation Finished Successfully!";
        wait;
    end process;

end Behavioral;
`
    }
  }
};

// API: Get Examples List by Language
app.get('/api/examples', (req, res) => {
  const lang = req.query.lang || 'verilog';
  res.json(EXAMPLES[lang] || EXAMPLES.verilog);
});

// API: Load existing files from disk
app.get('/api/project/load', (req, res) => {
  const lang = req.query.lang || 'verilog';
  const defaultDir = lang === 'vhdl' 
    ? '/home/punit/xilinx_projects/VHDL_Basics/Lab_Acts/01_logic_gates'
    : '/home/punit/xilinx_projects/eda_playgrounds_acts';
  const dirPath = req.query.path || defaultDir;

  try {
    const isVHDL = lang === 'vhdl';
    const designName = isVHDL ? (fs.existsSync(path.join(dirPath, '01_logic_gates.vhd')) ? '01_logic_gates.vhd' : 'design.vhd') : 'design.sv';
    const tbName = isVHDL ? 'testbench.vhd' : 'testbench.sv';

    const designPath = path.join(dirPath, designName);
    const testbenchPath = path.join(dirPath, tbName);
    const vcdPath = path.join(dirPath, 'dump.vcd');

    let design = fs.existsSync(designPath) ? fs.readFileSync(designPath, 'utf8') : '';
    let testbench = fs.existsSync(testbenchPath) ? fs.readFileSync(testbenchPath, 'utf8') : '';
    const vcdContent = fs.existsSync(vcdPath) ? fs.readFileSync(vcdPath, 'utf8') : '';

    if (isVHDL && !testbench && design) {
      testbench = EXAMPLES.vhdl.logic_gates_vhdl.testbench;
    }

    res.json({
      success: true,
      dirPath,
      design,
      testbench,
      hasVcd: Boolean(vcdContent)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Save files to disk
app.post('/api/project/save', (req, res) => {
  const { dirPath, design, testbench, lang } = req.body;
  const isVHDL = lang === 'vhdl';
  const defaultDir = isVHDL
    ? '/home/punit/xilinx_projects/VHDL_Basics/Lab_Acts/01_logic_gates'
    : '/home/punit/xilinx_projects/eda_playgrounds_acts';
  const targetDir = dirPath || defaultDir;

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const designFile = path.join(targetDir, isVHDL ? 'design.vhd' : 'design.sv');
    const tbFile = path.join(targetDir, isVHDL ? 'testbench.vhd' : 'testbench.sv');

    if (design !== undefined) fs.writeFileSync(designFile, design, 'utf8');
    if (testbench !== undefined) fs.writeFileSync(tbFile, testbench, 'utf8');
    res.json({ success: true, message: `Saved successfully to ${targetDir}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Run Simulation (Verilog / VHDL)
app.post('/api/simulate', (req, res) => {
  let { design, testbench, targetDir, lang = 'verilog' } = req.body;
  const simDir = targetDir && fs.existsSync(targetDir) ? targetDir : RUNTIME_DIR;
  const startTime = Date.now();
  const isVHDL = lang === 'vhdl';

  const designFile = path.join(simDir, isVHDL ? 'design.vhd' : 'design.sv');
  const tbFile = path.join(simDir, isVHDL ? 'testbench.vhd' : 'testbench.sv');
  const simvFile = path.join(simDir, 'simv');
  const vcdFile = path.join(simDir, 'dump.vcd');

  try {
    // For Verilog: If testbench is missing $dumpfile, auto-inject it so waveforms are guaranteed
    if (!isVHDL && !testbench.includes('$dumpfile')) {
      // Inject auto-dump into the testbench initial block
      if (testbench.includes('initial begin')) {
        testbench = testbench.replace('initial begin', 'initial begin\n        $dumpfile("dump.vcd");\n        $dumpvars(0);');
      } else {
        testbench += `\nmodule __auto_dumper;\n  initial begin\n    $dumpfile("dump.vcd");\n    $dumpvars(0);\n  end\nendmodule\n`;
      }
    }

    fs.writeFileSync(designFile, design, 'utf8');
    fs.writeFileSync(tbFile, testbench, 'utf8');

    if (fs.existsSync(simvFile)) fs.unlinkSync(simvFile);
    if (fs.existsSync(vcdFile)) fs.unlinkSync(vcdFile);

    if (isVHDL) {
      const topEntity = 'testbench';
      const ghdlCmd = `ghdl -a --std=08 "${designFile}" "${tbFile}" && ghdl -e --std=08 ${topEntity} && ghdl -r --std=08 ${topEntity} --vcd="${vcdFile}" --stop-time=1000ns`;

      exec(ghdlCmd, { cwd: simDir, env: process.env, timeout: 10000 }, (err, stdout, stderr) => {
        const executionTimeMs = Date.now() - startTime;
        let vcdContent = '';
        if (fs.existsSync(vcdFile)) {
          vcdContent = fs.readFileSync(vcdFile, 'utf8');
        }

        if (err && !vcdContent) {
          return res.json({
            success: false,
            stage: 'ghdl_compilation',
            error: stderr || err.message,
            stdout,
            stderr,
            executionTimeMs
          });
        }

        res.json({
          success: true,
          stage: 'simulation',
          stdout: stdout || 'VHDL Simulation finished cleanly.',
          stderr: stderr || '',
          vcdContent,
          hasVcd: Boolean(vcdContent),
          executionTimeMs
        });
      });
    } else {
      const compileCmd = `iverilog -g2012 -o "${simvFile}" "${designFile}" "${tbFile}"`;
      exec(compileCmd, { cwd: simDir, env: process.env }, (compileErr, compileStdout, compileStderr) => {
        if (compileErr) {
          return res.json({
            success: false,
            stage: 'compilation',
            error: compileStderr || compileErr.message,
            stdout: compileStdout,
            stderr: compileStderr,
            executionTimeMs: Date.now() - startTime
          });
        }

        const simCmd = `vvp "${simvFile}"`;
        exec(simCmd, { cwd: simDir, env: process.env, timeout: 10000 }, (simErr, simStdout, simStderr) => {
          const executionTimeMs = Date.now() - startTime;
          let vcdContent = '';
          if (fs.existsSync(vcdFile)) {
            vcdContent = fs.readFileSync(vcdFile, 'utf8');
          }

          res.json({
            success: !simErr,
            stage: 'simulation',
            stdout: simStdout,
            stderr: simStderr || (simErr ? simErr.message : ''),
            vcdContent,
            hasVcd: Boolean(vcdContent),
            executionTimeMs
          });
        });
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      stage: 'internal',
      error: err.message,
      executionTimeMs: Date.now() - startTime
    });
  }
});

// API: Launch GTKWave on Host
app.post('/api/open-gtkwave', (req, res) => {
  const { targetDir } = req.body;
  const simDir = targetDir && fs.existsSync(targetDir) ? targetDir : RUNTIME_DIR;
  const vcdFile = path.join(simDir, 'dump.vcd');

  if (!fs.existsSync(vcdFile)) {
    return res.status(404).json({ success: false, error: 'dump.vcd not found. Please run a simulation first.' });
  }

  const cmd = `(gtkwave_light "${vcdFile}" || gtkwave "${vcdFile}") >/dev/null 2>&1 &`;
  exec(cmd, { env: process.env }, (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'GTKWave launched successfully' });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Verilog/VHDL EDA Studio running at: http://localhost:${PORT}`);
});
