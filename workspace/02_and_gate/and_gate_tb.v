`timescale 1ns / 1ps

module and_gate_tb;
    reg test_A;
    reg test_B;
    wire test_Y;

    and_gate uut (
        .A(test_A),
        .B(test_B),
        .Y(test_Y)
    );

    initial begin
        $dumpfile("and_gate.vcd");
        $dumpvars(0, and_gate_tb);

        $display("Time | A | B | Y");
        $display("----------------");
        $monitor("%4t | %b | %b | %b", $time, test_A, test_B, test_Y);

        test_A = 0; test_B = 0; #10;
        test_A = 0; test_B = 1; #10;
        test_A = 1; test_B = 0; #10;
        test_A = 1; test_B = 1; #10;
        $finish;
    end
endmodule
