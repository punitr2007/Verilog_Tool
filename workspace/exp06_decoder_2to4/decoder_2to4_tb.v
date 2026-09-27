`timescale 1ns/1ps

// Experiment 6: 2 to 4 Decoder Testbench
module decoder_2to4_tb;
    reg        en;
    reg  [1:0] in;
    wire [3:0] out;

    decoder_2to4 uut (
        .en(en),
        .in(in),
        .out(out)
    );

    integer i;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, decoder_2to4_tb);

        $display("=== 2 to 4 Decoder Verification ===");
        $display("Time | EN | IN(bin) | OUT[3:0]");
        $display("------------------------------");
        $monitor("%4t |  %b |    %b   |   %b", $time, en, in, out);

        // Disabled state
        en = 0; in = 2'b00; #10;
        in = 2'b11; #10;

        // Enabled states
        en = 1;
        for (i = 0; i < 4; i = i + 1) begin
            in = i;
            #10;
        end

        $finish;
    end
endmodule
