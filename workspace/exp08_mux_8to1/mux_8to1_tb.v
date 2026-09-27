`timescale 1ns/1ps

// Experiment 8: 8x1 Multiplexor Testbench
module mux_8to1_tb;
    reg  [7:0] in;
    reg  [2:0] sel;
    wire       out;

    mux_8to1 uut (
        .in(in),
        .sel(sel),
        .out(out)
    );

    integer i;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, mux_8to1_tb);

        $display("=== 8x1 Multiplexor Verification ===");
        $display("Time |    IN    | SEL | OUT (in[sel])");
        $display("-----------------------------------");
        $monitor("%4t | %b | %b |   %b", $time, in, sel, out);

        // Test pattern with alternating bits: 8'b10101010
        in = 8'b10101010;
        for (i = 0; i < 8; i = i + 1) begin
            sel = i;
            #10;
        end

        // Test pattern with walking 1: 8'b00000001
        in = 8'b00010000;
        for (i = 0; i < 8; i = i + 1) begin
            sel = i;
            #10;
        end

        $finish;
    end
endmodule
