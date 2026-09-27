`timescale 1ns/1ps

// Experiment 2B: Full Subtractor Testbench
module full_subtractor_tb;
    reg a, b, bin;
    wire diff, bout;

    full_subtractor uut (
        .a(a),
        .b(b),
        .bin(bin),
        .diff(diff),
        .bout(bout)
    );

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, full_subtractor_tb);

        $display("=== Full Subtractor Verification ===");
        $display("Time | A B BIN | DIFF BOUT");
        $display("--------------------------");
        $monitor("%4t | %b %b  %b  |   %b    %b", $time, a, b, bin, diff, bout);

        a = 0; b = 0; bin = 0; #10;
        a = 0; b = 0; bin = 1; #10;
        a = 0; b = 1; bin = 0; #10;
        a = 0; b = 1; bin = 1; #10;
        a = 1; b = 0; bin = 0; #10;
        a = 1; b = 0; bin = 1; #10;
        a = 1; b = 1; bin = 0; #10;
        a = 1; b = 1; bin = 1; #10;
        $finish;
    end
endmodule
