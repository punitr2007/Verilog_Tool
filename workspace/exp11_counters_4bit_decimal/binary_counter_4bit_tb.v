`timescale 1ns/1ps

// Experiment 11A: 4-Bit Binary Counter Testbench
module binary_counter_4bit_tb;
    reg        clk;
    reg        rst_n;
    reg        enable;
    wire [3:0] count;
    wire       tc;

    binary_counter_4bit uut (
        .clk(clk),
        .rst_n(rst_n),
        .enable(enable),
        .count(count),
        .tc(tc)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, binary_counter_4bit_tb);

        $display("=== 4-Bit Binary Counter Verification ===");
        $display("Time | CLK | RST_N | EN | COUNT (BIN) | COUNT (DEC) | TC");
        $display("---------------------------------------------------------");
        $monitor("%4t |  %b  |   %b   |  %b |     %b    |      %2d     | %b", 
                 $time, clk, rst_n, enable, count, count, tc);

        clk = 0; rst_n = 0; enable = 0;
        #12 rst_n = 1; enable = 1;

        // Count through full 16 cycles and rollover
        #180;

        // Test enable toggle
        enable = 0;
        #20;
        enable = 1;
        #30;

        $finish;
    end
endmodule
