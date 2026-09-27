`timescale 1ns/1ps

// Experiment 1A: Half Adder Testbench
module half_adder_tb;
    reg a, b;
    wire sum, carry;

    half_adder uut (
        .a(a),
        .b(b),
        .sum(sum),
        .carry(carry)
    );

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, half_adder_tb);

        $display("=== Half Adder Verification ===");
        $display("Time | A B | SUM CARRY");
        $display("----------------------");
        $monitor("%4t | %b %b |  %b     %b", $time, a, b, sum, carry);

        a = 0; b = 0; #10;
        a = 0; b = 1; #10;
        a = 1; b = 0; #10;
        a = 1; b = 1; #10;
        $finish;
    end
endmodule
