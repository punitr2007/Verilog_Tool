`timescale 1ns/1ps

// Experiment 9: J-K Flip-Flop Testbench
module jk_ff_tb;
    reg clk;
    reg rst_n;
    reg j;
    reg k;
    wire q;
    wire q_bar;

    jk_ff uut (
        .clk(clk),
        .rst_n(rst_n),
        .j(j),
        .k(k),
        .q(q),
        .q_bar(q_bar)
    );

    // 10ns clock period (100MHz)
    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, jk_ff_tb);

        $display("=== J-K Flip-Flop Verification ===");
        $display("Time | CLK | RST_N | J K | Q Q_BAR");
        $display("---------------------------------");
        $monitor("%4t |  %b  |   %b   | %b %b | %b   %b", $time, clk, rst_n, j, k, q, q_bar);

        // Initial setup
        clk = 0; rst_n = 0; j = 0; k = 0;
        #12 rst_n = 1;

        // Test SET (J=1, K=0)
        #10 j = 1; k = 0;
        
        // Test HOLD (J=0, K=0)
        #10 j = 0; k = 0;

        // Test RESET (J=0, K=1)
        #10 j = 0; k = 1;

        // Test TOGGLE (J=1, K=1) for several clock cycles
        #10 j = 1; k = 1;
        #40;

        // Test Async Reset during toggle
        #2 rst_n = 0;
        #5 rst_n = 1;
        #20;

        $finish;
    end
endmodule
