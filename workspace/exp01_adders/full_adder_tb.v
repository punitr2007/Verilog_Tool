`timescale 1ns/1ps

// Experiment 1B: Full Adder Testbench
module full_adder_tb;
    reg a, b, cin;
    wire sum, cout;

    full_adder uut (
        .a(a),
        .b(b),
        .cin(cin),
        .sum(sum),
        .cout(cout)
    );

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, full_adder_tb);

        $display("=== Full Adder Verification ===");
        $display("Time | A B CIN | SUM COUT");
        $display("--------------------------");
        $monitor("%4t | %b %b  %b  |  %b    %b", $time, a, b, cin, sum, cout);

        a = 0; b = 0; cin = 0; #10;
        a = 0; b = 0; cin = 1; #10;
        a = 0; b = 1; cin = 0; #10;
        a = 0; b = 1; cin = 1; #10;
        a = 1; b = 0; cin = 0; #10;
        a = 1; b = 0; cin = 1; #10;
        a = 1; b = 1; cin = 0; #10;
        a = 1; b = 1; cin = 1; #10;
        $finish;
    end
endmodule
