const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4500;

// Ensure local tool paths are in PATH (ghdl/bin first for standard IEEE library bindings)
const HOME_DIR = process.env.HOME || '/home/punit';
process.env.PATH = `${HOME_DIR}/.local/ghdl/bin:${HOME_DIR}/.local/bin:${process.env.PATH}`;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const RUNTIME_DIR = path.join(__dirname, '.sim_runtime');
if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

const SEQUEL_ENGINE_DIR = path.join(__dirname, 'sequel_engine');

// Helper: Convert SEQUEL .dat simulation file into standard VCD format
function convertSequelDatToVCD(cctText, datText) {
  if (!datText || typeof datText !== 'string') return '';
  const lines = datText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return '';

  // Extract variable names from "variables: ..." in cctText
  const varMatch = cctText.match(/variables:\s*([^\n\r]+)/i);
  let varNames = [];
  if (varMatch && varMatch[1]) {
    varNames = varMatch[1].trim().split(/\s+/);
  }

  const firstRow = lines[0].split(/\s+/).map(Number);
  const numCols = firstRow.length;
  if (varNames.length < (numCols - 1)) {
    for (let i = varNames.length + 1; i < numCols; i++) {
      varNames.push(`var_${i}`);
    }
  }

  const times = [];
  const rows = [];
  for (const line of lines) {
    const parts = line.split(/\s+/).map(Number);
    if (parts.length >= numCols && !isNaN(parts[0])) {
      times.push(parts[0]);
      rows.push(parts.slice(1));
    }
  }

  if (times.length === 0) return '';

  const minTime = times[0];
  const maxTime = times[times.length - 1];
  const timeSpan = maxTime - minTime > 0 ? maxTime - minTime : 1.0;

  let tMult = 1000;
  let timescaleUnit = '1ms';
  if (timeSpan >= 1.0) {
    tMult = 1000;
    timescaleUnit = '1ms';
  } else if (timeSpan >= 1e-3) {
    tMult = 1000000;
    timescaleUnit = '1us';
  } else if (timeSpan >= 1e-6) {
    tMult = 1000000000;
    timescaleUnit = '1ns';
  } else {
    tMult = 1e12;
    timescaleUnit = '1ps';
  }

  const vcd = [];
  vcd.push('$date\n   Sun Sep 27 2026\n$end');
  vcd.push('$version\n   SEQUEL Engine VCD Bridge\n$end');
  vcd.push(`$timescale\n   ${timescaleUnit}\n$end`);
  vcd.push('$scope module sequel_sim $end');

  const symbols = ['!', '"', '#', '$', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/', '0', '1', '2', '3'];
  for (let i = 0; i < varNames.length; i++) {
    const sym = symbols[i % symbols.length] + (i >= symbols.length ? Math.floor(i / symbols.length) : '');
    vcd.push(`$var wire 16 ${sym} ${varNames[i]} [15:0] $end`);
  }
  vcd.push('$upscope $end');
  vcd.push('$enddefinitions $end');
  vcd.push('$dumpvars');

  // Initial values at #0
  vcd.push('#0');
  for (let i = 0; i < varNames.length; i++) {
    const sym = symbols[i % symbols.length] + (i >= symbols.length ? Math.floor(i / symbols.length) : '');
    const val = (rows[0] && rows[0][i] !== undefined) ? rows[0][i] : 0;
    const valInt = Math.min(32767, Math.max(-32768, Math.round(val * 1000))) & 0xFFFF;
    const binStr = valInt.toString(2).padStart(16, '0');
    vcd.push(`b${binStr} ${sym}`);
  }

  // Dump time sequence
  for (let idx = 1; idx < times.length; idx++) {
    const tick = Math.max(0, Math.round((times[idx] - minTime) * tMult));
    vcd.push(`#${tick}`);
    for (let i = 0; i < varNames.length; i++) {
      const sym = symbols[i % symbols.length] + (i >= symbols.length ? Math.floor(i / symbols.length) : '');
      const val = rows[idx][i];
      const valInt = Math.min(32767, Math.max(-32768, Math.round(val * 1000))) & 0xFFFF;
      const binStr = valInt.toString(2).padStart(16, '0');
      vcd.push(`b${binStr} ${sym}`);
    }
  }

  return vcd.join('\n');
}

// Built-in Examples for Verilog/SystemVerilog, VHDL, and SEQUEL
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
    sv_deadtime_pwm: {
      title: "⚡ Dead-Time PWM Driver (Power Stage)",
      description: "Complementary High-Side / Low-Side PWM generator with shoot-through protection dead-time for H-Bridges",
      design: `// Power Electronics: Complementary PWM Generator with Configurable Dead-Time
// Prevents shoot-through currents in Half-Bridge MOSFET / IGBT power stages
module deadtime_pwm #(
    parameter int DEAD_TIME_TICKS = 4
)(
    input  logic clk,
    input  logic rst_n,
    input  logic pwm_in,        // Raw input PWM from controller/modulator
    output logic pwm_high,      // High-side switch gate drive
    output logic pwm_low        // Low-side switch gate drive
);

    logic [3:0] dt_cnt_high;
    logic [3:0] dt_cnt_low;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            pwm_high    <= 1'b0;
            pwm_low     <= 1'b0;
            dt_cnt_high <= '0;
            dt_cnt_low  <= '0;
        end else begin
            if (pwm_in) begin
                pwm_low    <= 1'b0; // Immediately turn off low-side
                dt_cnt_low <= '0;
                if (dt_cnt_high < DEAD_TIME_TICKS) begin
                    dt_cnt_high <= dt_cnt_high + 1'b1;
                    pwm_high    <= 1'b0; // Wait for dead-time
                end else begin
                    pwm_high    <= 1'b1; // Turn on high-side
                end
            end else begin
                pwm_high    <= 1'b0; // Immediately turn off high-side
                dt_cnt_high <= '0;
                if (dt_cnt_low < DEAD_TIME_TICKS) begin
                    dt_cnt_low <= dt_cnt_low + 1'b1;
                    pwm_low    <= 1'b0; // Wait for dead-time
                end else begin
                    pwm_low    <= 1'b1; // Turn on low-side
                end
            end
        end
    end

endmodule
`,
      testbench: `\`timescale 1ns/1ps

module testbench;
    logic clk, rst_n, pwm_in;
    logic pwm_high, pwm_low;

    deadtime_pwm #(.DEAD_TIME_TICKS(3)) uut (
        .clk(clk),
        .rst_n(rst_n),
        .pwm_in(pwm_in),
        .pwm_high(pwm_high),
        .pwm_low(pwm_low)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, testbench);

        clk = 0; rst_n = 0; pwm_in = 0;
        #15 rst_n = 1;

        // Switching sequence
        #10 pwm_in = 1;
        #50 pwm_in = 0;
        #60 pwm_in = 1;
        #70 pwm_in = 0;
        #50;
        $finish;
    end
endmodule
`
    },
    sv_svpwm: {
      title: "⚡ Space Vector PWM (SVPWM 3-Phase Inverter)",
      description: "Synthesizes 3-phase modulation voltages into sector switching times for motor drives & inverters",
      design: `// Power Electronics: 3-Phase Space Vector PWM (SVPWM) Modulator
module svpwm_generator (
    input  logic        clk,
    input  logic        rst_n,
    input  logic [7:0]  v_alpha, // Alpha reference voltage (-128 to 127)
    input  logic [7:0]  v_beta,  // Beta reference voltage (-128 to 127)
    output logic [2:0]  sector,  // Active sector (1 to 6)
    output logic        pwm_a,   // Phase A switching gate
    output logic        pwm_b,   // Phase B switching gate
    output logic        pwm_c    // Phase C switching gate
);

    logic [7:0] carrier_cnt;
    logic       carrier_dir;
    logic [7:0] cmp_a, cmp_b, cmp_c;

    // Triangular carrier generator (Center-aligned PWM)
    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            carrier_cnt <= 8'd0;
            carrier_dir <= 1'b0;
        end else begin
            if (carrier_dir == 1'b0) begin
                if (carrier_cnt == 8'd250) carrier_dir <= 1'b1;
                else carrier_cnt <= carrier_cnt + 1'b1;
            end else begin
                if (carrier_cnt == 8'd0) carrier_dir <= 1'b0;
                else carrier_cnt <= carrier_cnt - 1'b1;
            end
        end
    end

    // Sector & compare computation
    always_comb begin
        if (v_beta[7] == 1'b0) begin
            if (v_alpha[7] == 1'b0) sector = 3'd1;
            else sector = 3'd2;
        end else begin
            if (v_alpha[7] == 1'b0) sector = 3'd6;
            else sector = 3'd4;
        end

        cmp_a = 8'd128 + (v_alpha >>> 1);
        cmp_b = 8'd128 - (v_alpha >>> 2) + (v_beta >>> 1);
        cmp_c = 8'd128 - (v_alpha >>> 2) - (v_beta >>> 1);

        pwm_a = (carrier_cnt < cmp_a);
        pwm_b = (carrier_cnt < cmp_b);
        pwm_c = (carrier_cnt < cmp_c);
    end

endmodule
`,
      testbench: `\`timescale 1ns/1ps

module testbench;
    logic clk, rst_n;
    logic [7:0] v_alpha, v_beta;
    logic [2:0] sector;
    logic pwm_a, pwm_b, pwm_c;

    svpwm_generator dut (
        .clk(clk),
        .rst_n(rst_n),
        .v_alpha(v_alpha),
        .v_beta(v_beta),
        .sector(sector),
        .pwm_a(pwm_a),
        .pwm_b(pwm_b),
        .pwm_c(pwm_c)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, testbench);

        clk = 0; rst_n = 0; v_alpha = 8'd60; v_beta = 8'd30;
        #15 rst_n = 1;

        #500 v_alpha = 8'd20; v_beta = 8'd80;
        #500 v_alpha = -8'd50; v_beta = 8'd50;
        #500 v_alpha = -8'd60; v_beta = -8'd30;
        #500;
        $finish;
    end
endmodule
`
    },
    sv_delta_sigma: {
      title: "⚡ Delta-Sigma 1-bit DAC / Modulator",
      description: "1st-order error feedback Delta-Sigma noise-shaping digital-to-analog converter",
      design: `// Mixed-Signal: 1st-Order Delta-Sigma Digital-to-Analog Modulator
module delta_sigma_dac #(
    parameter int WIDTH = 8
)(
    input  logic             clk,
    input  logic             rst_n,
    input  logic [WIDTH-1:0] din,    // Multi-bit input code (0 to 255)
    output logic             dac_out // High-frequency 1-bit PDM stream
);

    logic [WIDTH:0] sigma; // Integrator accumulator with overflow headroom

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            sigma   <= '0;
            dac_out <= 1'b0;
        end else begin
            // Error integration: sigma_next = sigma + din - (dac_out ? 2^WIDTH : 0)
            if (sigma[WIDTH]) begin
                sigma   <= sigma[WIDTH-1:0] + din;
                dac_out <= 1'b1;
            end else begin
                sigma   <= sigma + din;
                dac_out <= 1'b0;
            end
        end
    end

endmodule
`,
      testbench: `\`timescale 1ns/1ps

module testbench;
    logic clk, rst_n;
    logic [7:0] din;
    logic dac_out;

    delta_sigma_dac uut (
        .clk(clk),
        .rst_n(rst_n),
        .din(din),
        .dac_out(dac_out)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, testbench);

        clk = 0; rst_n = 0; din = 8'd64; // 25% duty average
        #15 rst_n = 1;

        #200 din = 8'd128; // 50% duty average
        #200 din = 8'd192; // 75% duty average
        #200 din = 8'd230; // 90% duty average
        #300;
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
    },
    vhdl_deadtime_pwm: {
      title: "⚡ Dead-Time PWM Gate Driver (VHDL)",
      description: "Complementary PWM generator with interlock dead-time protection in VHDL",
      design: `-- VHDL: Complementary Dead-Time PWM Generator
library IEEE;
use IEEE.STD_LOGIC_1164.ALL;
use IEEE.NUMERIC_STD.ALL;

entity deadtime_pwm is
    generic (
        DEAD_TIME : integer := 4
    );
    port (
        clk      : in  std_logic;
        rst_n    : in  std_logic;
        pwm_in   : in  std_logic;
        pwm_high : out std_logic;
        pwm_low  : out std_logic
    );
end deadtime_pwm;

architecture Behavioral of deadtime_pwm is
    signal cnt_h : integer range 0 to DEAD_TIME := 0;
    signal cnt_l : integer range 0 to DEAD_TIME := 0;
begin
    process(clk, rst_n)
    begin
        if rst_n = '0' then
            pwm_high <= '0';
            pwm_low  <= '0';
            cnt_h    <= 0;
            cnt_l    <= 0;
        elsif rising_edge(clk) then
            if pwm_in = '1' then
                pwm_low <= '0';
                cnt_l   <= 0;
                if cnt_h < DEAD_TIME then
                    cnt_h    <= cnt_h + 1;
                    pwm_high <= '0';
                else
                    pwm_high <= '1';
                end if;
            else
                pwm_high <= '0';
                cnt_h    <= 0;
                if cnt_l < DEAD_TIME then
                    cnt_l   <= cnt_l + 1;
                    pwm_low <= '0';
                else
                    pwm_low <= '1';
                end if;
            end if;
        end if;
    end process;
end Behavioral;
`,
      testbench: `-- VHDL: Testbench for Dead-Time PWM Generator
library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity testbench is
end testbench;

architecture Behavioral of testbench is
    signal clk      : std_logic := '0';
    signal rst_n    : std_logic := '0';
    signal pwm_in   : std_logic := '0';
    signal pwm_high : std_logic;
    signal pwm_low  : std_logic;
begin
    clk <= not clk after 5 ns;

    dut: entity work.deadtime_pwm
        generic map ( DEAD_TIME => 3 )
        port map (
            clk      => clk,
            rst_n    => rst_n,
            pwm_in   => pwm_in,
            pwm_high => pwm_high,
            pwm_low  => pwm_low
        );

    stim_proc: process
    begin
        wait for 15 ns;
        rst_n <= '1';
        wait for 10 ns;
        pwm_in <= '1'; wait for 50 ns;
        pwm_in <= '0'; wait for 60 ns;
        pwm_in <= '1'; wait for 70 ns;
        pwm_in <= '0'; wait for 50 ns;
        report "VHDL Dead-Time PWM Simulation Completed";
        wait;
    end process;
end Behavioral;
`
    }
  },
  sequel: {
    buck_converter_ssw: {
      title: "🔌 Buck Converter (Steady-State Waveform SSW)",
      description: "DC-DC Buck Converter solved using SEQUEL's fast periodic Steady-State Waveform (SSW) solver in 3 cycles",
      design: `title: Buck Converter Steady-State Analysis (SEQUEL)

begin_circuit
   # DC input source
   eelement name=vdc type=vsrcdc p=in n=gnd vdc=24.0

   # High-side controlled switch (MOSFET model)
   eelement name=sw type=s p=in n=sw_node p_c=gate n_c=gnd ron=0.05 roff=1e6
   eelement name=vgate type=vsrcp p=gate n=gnd v0=0 v1=10 t1=0 t2=10u t3=10u t4=20u period=20u

   # Freewheeling diode
   eelement name=d1 type=d p=gnd n=sw_node ron=0.05 roff=1e6 vd=0.7

   # Filter Inductor & Capacitor
   eelement name=l1 type=l p=sw_node n=out l=100u
   eelement name=c1 type=c p=out n=gnd c=47u
   eelement name=rload type=r p=out n=gnd r=10

   refnode=gnd
   outvar: v_out=v1_of_c1 i_ind=i1_of_l1 v_sw=v1_of_sw
end_circuit
`,
      testbench: `begin_solve
   # Fast Steady-State Waveform (SSW) solve block
   solve_type=startup
   initial_sol initialize
   set_stparm v0sv_of_c1=12.0
   method: t_startup=0
end_solve

begin_solve
   solve_type=trns
   initial_sol previous
   begin_output
      filename=buck.dat
      variables: v_out i_ind v_sw
   end_output
   method: trapezoidal=yes
+    t_start=0 t_end=200u delt_const=0.2u
end_solve
end_cf
`
    },
    rc_transient: {
      title: "🔌 RC Step Response & Capacitor Charging",
      description: "First-order RC circuit step response simulation with voltage and current outputs",
      design: `title: RC Circuit Transient Response

begin_circuit
   eelement name=v1 type=vsrcdc p=b n=a vdc=10.0
   eelement name=r1 type=r p=b n=c r=5
   eelement name=c1 type=c p=c n=a c=1
   refnode=a
   outvar: vc=v1_of_c1 ic=i1_of_r1
end_circuit
`,
      testbench: `begin_solve
   solve_type=startup
   initial_sol initialize
   set_stparm v0sv_of_c1=0.0
   method: t_startup=0
end_solve

begin_solve
   solve_type=trns
   initial_sol previous
   begin_output
      filename=rc_sim.dat
      variables: vc ic
   end_output
   method: trapezoidal=yes
+    t_start=0 t_end=25 delt_const=0.2
end_solve
end_cf
`
    },
    timer_555_astable: {
      title: "🔌 IC 555 Timer Astable Multivibrator",
      description: "Mixed analog-digital multivibrator generating square and triangle waveforms",
      design: `title: 555 Timer Astable Multivibrator (SEQUEL)

begin_circuit
   eelement name=vcc type=vsrcdc p=vcc_node n=gnd vdc=5.0
   eelement name=r1 type=r p=vcc_node n=disch r=10k
   eelement name=r2 type=r p=disch n=thresh r=10k
   eelement name=c1 type=c p=thresh n=gnd c=100n
   eelement name=ic555 type=ic555 p_vcc=vcc_node p_gnd=gnd p_trig=thresh p_thresh=thresh p_disch=disch p_out=v_out
   refnode=gnd
   outvar: v_cap=v1_of_c1 v_sqr=v1_of_ic555
end_circuit
`,
      testbench: `begin_solve
   solve_type=startup
   initial_sol initialize
   set_stparm v0sv_of_c1=0.0
   method: t_startup=0
end_solve

begin_solve
   solve_type=trns
   initial_sol previous
   begin_output
      filename=ic555.dat
      variables: v_cap v_sqr
   end_output
   method: trapezoidal=yes
+    t_start=0 t_end=5m delt_const=5u
end_solve
end_cf
`
    }
  }
};

// API: Get Examples List by Language
app.get('/api/examples', (req, res) => {
  const lang = req.query.lang || 'verilog';
  res.json(EXAMPLES[lang] || EXAMPLES.verilog);
});

// API: Get SEQUEL Circuits Catalog
app.get('/api/sequel/circuits', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'sequel_hub', 'circuits_index.json');
  if (fs.existsSync(indexPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const cat = req.query.category;
      if (cat) {
        return res.json(data.filter(c => c.category === cat));
      }
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.json([]);
});

// API: Get SEQUEL Animations Catalog
app.get('/api/sequel/animations', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'sequel_hub', 'animations_index.json');
  if (fs.existsSync(indexPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.json([]);
});

// Helper: Scan a directory for all HDL files and identify design vs testbenches
function scanDirectoryHdl(dirPath) {
  if (!fs.existsSync(dirPath)) return { files: [], dirPath };

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.v', '.sv', '.vhd', '.vhdl', '.in'].includes(ext)) {
        const fullPath = path.join(dirPath, entry.name);
        let content = '';
        try {
          content = fs.readFileSync(fullPath, 'utf8');
        } catch (e) {}

        const lowerName = entry.name.toLowerCase();
        const lowerContent = content.toLowerCase();

        const isVHDL = ext === '.vhd' || ext === '.vhdl';
        const isSequel = ext === '.in';
        const isTestbench = lowerName.includes('_tb') || 
                            lowerName.startsWith('tb_') || 
                            lowerName.includes('testbench') || 
                            lowerName.includes('solve') ||
                            lowerContent.includes('$dumpfile') ||
                            lowerContent.includes('stim_proc') ||
                            lowerContent.includes('begin_solve') ||
                            (isVHDL && lowerContent.includes('entity testbench'));

        let lang = 'verilog';
        if (isVHDL) lang = 'vhdl';
        else if (isSequel) lang = 'sequel';

        files.push({
          name: entry.name,
          path: fullPath,
          size: entry.size || content.length,
          isTestbench,
          lang,
          content
        });
      }
    }
  }

  return { files, dirPath };
}

// API: Load existing files from disk (supports arbitrary folder and multi-file discovery)
app.get('/api/project/load', (req, res) => {
  const requestedLang = req.query.lang || 'verilog';
  let defaultDir = path.join(__dirname, 'workspace', '01_basic_gates');
  if (requestedLang === 'vhdl') {
    defaultDir = path.join(__dirname, 'workspace', '05_vhdl_logic_gates');
  } else if (requestedLang === 'sequel') {
    defaultDir = path.join(__dirname, 'workspace', '06_sequel_buck_ssw');
  }
  const dirPath = req.query.path || defaultDir;

  try {
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ success: false, error: `Directory not found: ${dirPath}` });
    }

    const { files } = scanDirectoryHdl(dirPath);
    let lang = requestedLang;

    // Detect language from files if directory has files
    const vhdlCount = files.filter(f => f.lang === 'vhdl').length;
    const verilogCount = files.filter(f => f.lang === 'verilog').length;
    const sequelCount = files.filter(f => f.lang === 'sequel').length;
    if (sequelCount > 0 && verilogCount === 0 && vhdlCount === 0) lang = 'sequel';
    else if (vhdlCount > 0 && verilogCount === 0) lang = 'vhdl';
    else if (verilogCount > 0 && vhdlCount === 0) lang = 'verilog';

    const testbenches = files.filter(f => f.isTestbench);
    const designs = files.filter(f => !f.isTestbench);

    // Pick active files
    let activeDesign = designs[0] || files[0] || null;
    let activeTestbench = testbenches[0] || null;

    if (req.query.designFile) {
      const found = files.find(f => f.name === req.query.designFile);
      if (found) activeDesign = found;
    }
    if (req.query.testbenchFile) {
      const found = files.find(f => f.name === req.query.testbenchFile);
      if (found) activeTestbench = found;
    }

    let defaultDesName = 'design.sv';
    let defaultTbName = 'testbench.sv';
    if (lang === 'vhdl') {
      defaultDesName = 'design.vhd';
      defaultTbName = 'testbench.vhd';
    } else if (lang === 'sequel') {
      defaultDesName = 'circuit.in';
      defaultTbName = 'solve.in';
    }

    let designContent = activeDesign ? activeDesign.content : '';
    let testbenchContent = activeTestbench ? activeTestbench.content : '';

    if (!designContent && lang === 'sequel') {
      designContent = EXAMPLES.sequel.buck_converter_ssw.design;
      testbenchContent = EXAMPLES.sequel.buck_converter_ssw.testbench;
    }

    const vcdFile = findVcdFile(dirPath, testbenchContent);

    res.json({
      success: true,
      dirPath,
      lang,
      files: files.map(f => ({ name: f.name, isTestbench: f.isTestbench, lang: f.lang, size: f.size })),
      activeDesignFile: activeDesign ? activeDesign.name : defaultDesName,
      activeTestbenchFile: activeTestbench ? activeTestbench.name : defaultTbName,
      design: designContent,
      testbench: testbenchContent,
      hasVcd: Boolean(vcdFile)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Save files to disk (supports custom filenames)
app.post('/api/project/save', (req, res) => {
  const { dirPath, design, testbench, lang, designFileName, testbenchFileName } = req.body;
  const isVHDL = lang === 'vhdl';
  const isSequel = lang === 'sequel';

  let defaultDir = path.join(__dirname, 'workspace', '01_basic_gates');
  if (isVHDL) defaultDir = path.join(__dirname, 'workspace', '05_vhdl_logic_gates');
  else if (isSequel) defaultDir = path.join(__dirname, 'workspace', '06_sequel_buck_ssw');

  const targetDir = dirPath || defaultDir;

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    let defaultDes = isVHDL ? 'design.vhd' : (isSequel ? 'circuit.in' : 'design.sv');
    let defaultTb = isVHDL ? 'testbench.vhd' : (isSequel ? 'solve.in' : 'testbench.sv');

    const designName = designFileName || defaultDes;
    const tbName = testbenchFileName || defaultTb;

    const designFile = path.join(targetDir, designName);
    const tbFile = path.join(targetDir, tbName);

    if (design !== undefined) fs.writeFileSync(designFile, design, 'utf8');
    if (testbench !== undefined) fs.writeFileSync(tbFile, testbench, 'utf8');
    res.json({ success: true, message: `Saved ${designName} and ${tbName} to ${targetDir}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to find any VCD file in simDir
function findVcdFile(simDir, testbench = '') {
  if (!fs.existsSync(simDir)) return null;
  if (testbench) {
    const match = testbench.match(/\$dumpfile\s*\(\s*["']([^"']+)["']\s*\)/i);
    if (match && match[1]) {
      const customPath = path.isAbsolute(match[1]) ? match[1] : path.join(simDir, match[1]);
      if (fs.existsSync(customPath)) return customPath;
    }
  }
  const defaultPath = path.join(simDir, 'dump.vcd');
  if (fs.existsSync(defaultPath)) return defaultPath;

  try {
    const files = fs.readdirSync(simDir)
      .filter(f => f.endsWith('.vcd'))
      .map(f => ({ name: f, time: fs.statSync(path.join(simDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0) return path.join(simDir, files[0].name);
  } catch (e) {}
  return null;
}

// API: Run Simulation (Verilog / VHDL / SEQUEL)
app.post('/api/simulate', (req, res) => {
  let { design, testbench, targetDir, lang = 'verilog', designFileName, testbenchFileName } = req.body;
  const simDir = targetDir && fs.existsSync(targetDir) ? targetDir : RUNTIME_DIR;
  const startTime = Date.now();
  const isVHDL = lang === 'vhdl';
  const isSequel = lang === 'sequel';

  // --- SEQUEL SIMULATION ENGINE ---
  if (isSequel) {
    try {
      const auxDir = path.join(simDir, '.sqlaux');
      const libDir = path.join(simDir, '.sqllib');
      if (!fs.existsSync(auxDir)) fs.mkdirSync(auxDir, { recursive: true });
      if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });

      // Copy libraries from sequel_engine if available
      const engineAux = path.join(SEQUEL_ENGINE_DIR, '.sqlaux');
      const engineLib = path.join(SEQUEL_ENGINE_DIR, '.sqllib');
      const engineExec = path.join(SEQUEL_ENGINE_DIR, 'exec');

      if (fs.existsSync(engineAux)) {
        fs.readdirSync(engineAux).forEach(f => {
          try { fs.copyFileSync(path.join(engineAux, f), path.join(auxDir, f)); } catch (e) {}
        });
      }
      if (fs.existsSync(engineLib)) {
        fs.readdirSync(engineLib).forEach(f => {
          try { fs.copyFileSync(path.join(engineLib, f), path.join(libDir, f)); } catch (e) {}
        });
      }
      if (fs.existsSync(path.join(engineExec, 'tmpdim.in'))) {
        try { fs.copyFileSync(path.join(engineExec, 'tmpdim.in'), path.join(simDir, 'tmpdim.in')); } catch (e) {}
      }

      // Combine circuit + solve directives into cct.in
      let combinedCct = (design || '').trim() + '\n\n' + (testbench || '').trim() + '\n';
      if (!combinedCct.includes('end_cf')) combinedCct += '\nend_cf\n';

      const cctInFile = path.join(auxDir, 'cct.in');
      fs.writeFileSync(cctInFile, combinedCct, 'utf8');
      fs.writeFileSync(path.join(simDir, designFileName || 'circuit.in'), design, 'utf8');
      fs.writeFileSync(path.join(simDir, testbenchFileName || 'solve.in'), testbench, 'utf8');

      // Execute sqlcppprep_fixed_static followed by sqlcppmain_fixed_static
      const prepCmd = `"${path.join(engineExec, 'sqlcppprep_fixed_static')}"`;
      const mainCmd = `"${path.join(engineExec, 'sqlcppmain_fixed_static')}"`;

      exec(prepCmd, { cwd: simDir, env: process.env, timeout: 5000 }, (prepErr, prepStdout, prepStderr) => {
        if (prepErr) {
          return res.json({
            success: false,
            stage: 'sequel_prep_error',
            error: prepStderr || prepErr.message,
            stdout: prepStdout,
            stderr: prepStderr,
            executionTimeMs: Date.now() - startTime
          });
        }

        exec(mainCmd, { cwd: simDir, env: process.env, timeout: 15000 }, (mainErr, mainStdout, mainStderr) => {
          const executionTimeMs = Date.now() - startTime;

          // Find generated .dat output files
          let datFile = null;
          try {
            const files = fs.readdirSync(simDir).filter(f => f.endsWith('.dat'));
            if (files.length > 0) {
              datFile = path.join(simDir, files[0]);
            }
          } catch (e) {}

          let vcdContent = '';
          if (datFile && fs.existsSync(datFile)) {
            const datContent = fs.readFileSync(datFile, 'utf8');
            vcdContent = convertSequelDatToVCD(combinedCct, datContent);
            if (vcdContent) {
              fs.writeFileSync(path.join(simDir, 'dump.vcd'), vcdContent, 'utf8');
            }
          }

          const hasVcd = Boolean(vcdContent);
          res.json({
            success: !mainErr || hasVcd,
            stage: 'simulation',
            stdout: (prepStdout ? prepStdout + '\n' : '') + (mainStdout || 'SEQUEL Simulation completed.'),
            stderr: (prepStderr ? prepStderr + '\n' : '') + (mainStderr || ''),
            vcdContent,
            hasVcd,
            executionTimeMs
          });
        });
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        stage: 'sequel_error',
        error: e.message,
        executionTimeMs: Date.now() - startTime
      });
    }
    return;
  }

  // --- SYSTEMVERILOG & VHDL SIMULATION ENGINES ---
  const designName = designFileName || (isVHDL ? 'design.vhd' : 'design.sv');
  const tbName = testbenchFileName || (isVHDL ? 'testbench.vhd' : 'testbench.sv');

  const designFile = path.join(simDir, designName);
  const tbFile = path.join(simDir, tbName);
  const simvFile = path.join(simDir, 'simv');
  const defaultVcdFile = path.join(simDir, 'dump.vcd');

  try {
    if (!isVHDL && !testbench.includes('$dumpfile')) {
      if (testbench.includes('initial begin')) {
        testbench = testbench.replace('initial begin', 'initial begin\n        $dumpfile("dump.vcd");\n        $dumpvars(0);');
      } else {
        testbench += `\nmodule __auto_dumper;\n  initial begin\n    $dumpfile("dump.vcd");\n    $dumpvars(0);\n  end\nendmodule\n`;
      }
    }

    if (fs.existsSync(simvFile)) fs.unlinkSync(simvFile);
    try {
      const oldFiles = fs.readdirSync(simDir);
      oldFiles.filter(f => f.endsWith('.vcd')).forEach(f => {
        try { fs.unlinkSync(path.join(simDir, f)); } catch (e) {}
      });
    } catch (e) {}

    fs.writeFileSync(designFile, design, 'utf8');
    fs.writeFileSync(tbFile, testbench, 'utf8');

    if (isVHDL) {
      let topEntity = 'testbench';
      const entityMatch = testbench.match(/entity\s+([a-zA-Z0-9_]+)\s+is/i);
      if (entityMatch && entityMatch[1]) {
        topEntity = entityMatch[1];
      }

      const ghdlCmd = `ghdl -a --std=08 "${designFile}" "${tbFile}" && ghdl -e --std=08 ${topEntity} && ghdl -r --std=08 ${topEntity} --vcd="${defaultVcdFile}" --stop-time=1000ns`;

      exec(ghdlCmd, { cwd: simDir, env: process.env, timeout: 10000 }, (err, stdout, stderr) => {
        const executionTimeMs = Date.now() - startTime;
        const foundVcd = findVcdFile(simDir, testbench);
        let vcdContent = foundVcd && fs.existsSync(foundVcd) ? fs.readFileSync(foundVcd, 'utf8') : '';

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
      const compileCmd = `iverilog -g2012 -I "${simDir}" -o "${simvFile}" "${designFile}" "${tbFile}"`;
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
          const foundVcd = findVcdFile(simDir, testbench);
          let vcdContent = foundVcd && fs.existsSync(foundVcd) ? fs.readFileSync(foundVcd, 'utf8') : '';

          res.json({
            success: !simErr || Boolean(vcdContent),
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
  const vcdPath = findVcdFile(simDir);

  if (!vcdPath || !fs.existsSync(vcdPath)) {
    return res.status(404).json({ success: false, error: 'No .vcd waveform file found. Please run a simulation first.' });
  }

  const cmd = `(gtkwave_light "${vcdPath}" || gtkwave "${vcdPath}") >/dev/null 2>&1 &`;
  exec(cmd, { env: process.env }, (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: `GTKWave launched with ${path.basename(vcdPath)}` });
  });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HDL EDA Studio with SEQUEL Engine running at: http://localhost:${PORT}`);
  });
}

module.exports = app;
