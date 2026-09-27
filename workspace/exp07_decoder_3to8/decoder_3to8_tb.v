`timescale 1ns/1ps

// Experiment 7: 3 to 8 Decoder Testbench
module decoder_3to8_tb;
    reg        en;
    reg  [2:0] in;
    wire [7:0] out;

    decoder_3to8 uut (
        .en(en),
        .in(in),
        .out(out)
    );

    integer i;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, decoder_3to8_tb);

        $display("=== 3 to 8 Decoder Verification ===");
        $display("Time | EN | IN(bin) | OUT[7:0]");
        $display("--------------------------------");
        $monitor("%4t |  %b |   %b   | %b", $time, en, in, out);

        // Disabled state
        en = 0; in = 3'b000; #10;
        in = 3'b111; #10;

        // Enabled states
        en = 1;
        for (i = 0; i < 8; i = i + 1) begin
            in = i;
            #10;
        end

        $finish;
    end
endmodule
