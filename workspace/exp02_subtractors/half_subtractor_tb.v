`timescale 1ns/1ps

// Experiment 2A: Half Subtractor Testbench
module half_subtractor_tb;
    reg a, b;
    wire diff, borrow;

    half_subtractor uut (
        .a(a),
        .b(b),
        .diff(diff),
        .borrow(borrow)
    );

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, half_subtractor_tb);

        $display("=== Half Subtractor Verification ===");
        $display("Time | A B | DIFF BORROW");
        $display("-------------------------");
        $monitor("%4t | %b %b |   %b     %b", $time, a, b, diff, borrow);

        a = 0; b = 0; #10;
        a = 0; b = 1; #10;
        a = 1; b = 0; #10;
        a = 1; b = 1; #10;
        $finish;
    end
endmodule
