`timescale 1ns/1ps

// Experiment 12: MOD-12 Up-Counter Testbench
module mod12_counter_tb;
    reg        clk;
    reg        rst_n;
    reg        enable;
    wire [3:0] count;
    wire       tc;

    mod12_counter uut (
        .clk(clk),
        .rst_n(rst_n),
        .enable(enable),
        .count(count),
        .tc(tc)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, mod12_counter_tb);

        $display("=== MOD-12 Up-Counter Verification ===");
        $display("Time | CLK | RST_N | EN | COUNT (BIN) | COUNT (DEC) | TC");
        $display("---------------------------------------------------------");
        $monitor("%4t |  %b  |   %b   |  %b |     %b    |      %2d     | %b", 
                 $time, clk, rst_n, enable, count, count, tc);

        clk = 0; rst_n = 0; enable = 0;
        #12 rst_n = 1; enable = 1;

        // Count through more than 2 full cycles (0 to 11, 0 to 11, ...)
        #180;

        $finish;
    end
endmodule
