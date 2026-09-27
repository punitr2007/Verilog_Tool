`timescale 1ns/1ps

// Experiment 3: 2-bit Binary Comparator Testbench
module comparator_2bit_tb;
    reg  [1:0] a;
    reg  [1:0] b;
    wire       a_gt_b;
    wire       a_eq_b;
    wire       a_lt_b;

    comparator_2bit uut (
        .a(a),
        .b(b),
        .a_gt_b(a_gt_b),
        .a_eq_b(a_eq_b),
        .a_lt_b(a_lt_b)
    );

    integer i, j;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, comparator_2bit_tb);

        $display("=== 2-Bit Binary Comparator Verification ===");
        $display("Time | A(dec) B(dec) | A>B A==B A<B");
        $display("-----------------------------------");
        $monitor("%4t |   %0d      %0d    |  %b    %b    %b", $time, a, b, a_gt_b, a_eq_b, a_lt_b);

        for (i = 0; i < 4; i = i + 1) begin
            for (j = 0; j < 4; j = j + 1) begin
                a = i;
                b = j;
                #10;
            end
        end

        $finish;
    end
endmodule
