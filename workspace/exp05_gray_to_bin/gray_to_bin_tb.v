`timescale 1ns/1ps

// Experiment 5: 4-bit Gray to Binary Code Converter Testbench
module gray_to_bin_tb;
    reg  [3:0] gray;
    wire [3:0] bin;

    gray_to_bin uut (
        .gray(gray),
        .bin(bin)
    );

    // Standard 4-bit Gray code sequence
    reg [3:0] gray_seq [0:15];
    integer i;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, gray_to_bin_tb);

        gray_seq[0]  = 4'b0000; gray_seq[1]  = 4'b0001;
        gray_seq[2]  = 4'b0011; gray_seq[3]  = 4'b0010;
        gray_seq[4]  = 4'b0110; gray_seq[5]  = 4'b0111;
        gray_seq[6]  = 4'b0101; gray_seq[7]  = 4'b0100;
        gray_seq[8]  = 4'b1100; gray_seq[9]  = 4'b1101;
        gray_seq[10] = 4'b1111; gray_seq[11] = 4'b1110;
        gray_seq[12] = 4'b1010; gray_seq[13] = 4'b1011;
        gray_seq[14] = 4'b1001; gray_seq[15] = 4'b1000;

        $display("=== Gray to Binary Code Converter Verification ===");
        $display("Time | GRAY | BINARY | DEC");
        $display("--------------------------");
        $monitor("%4t | %b |  %b  |  %0d", $time, gray, bin, bin);

        for (i = 0; i < 16; i = i + 1) begin
            gray = gray_seq[i];
            #10;
        end

        $finish;
    end
endmodule
