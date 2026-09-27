`timescale 1ns/1ps

// Experiment 4: 4-bit Binary to Gray Code Converter Testbench
module bin_to_gray_tb;
    reg  [3:0] bin;
    wire [3:0] gray;

    bin_to_gray uut (
        .bin(bin),
        .gray(gray)
    );

    integer i;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, bin_to_gray_tb);

        $display("=== Binary to Gray Code Converter Verification ===");
        $display("Time | BINARY | GRAY");
        $display("--------------------");
        $monitor("%4t |  %b  | %b", $time, bin, gray);

        for (i = 0; i < 16; i = i + 1) begin
            bin = i;
            #10;
        end

        $finish;
    end
endmodule
