`timescale 1ns/1ps

// Experiment 10: SISO Shift Register Testbench
module siso_shift_reg_tb;
    reg        clk;
    reg        rst_n;
    reg        serial_in;
    wire       serial_out;
    wire [3:0] q;

    siso_shift_reg uut (
        .clk(clk),
        .rst_n(rst_n),
        .serial_in(serial_in),
        .serial_out(serial_out),
        .q(q)
    );

    // 10ns clock period
    always #5 clk = ~clk;

    // Helper task to send 1 bit
    task send_bit(input bit_val);
    begin
        @(negedge clk);
        serial_in = bit_val;
    end
    endtask

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, siso_shift_reg_tb);

        $display("=== SISO Shift Register Verification ===");
        $display("Time | CLK | RST_N | SERIAL_IN | REGISTER (Q[3:0]) | SERIAL_OUT");
        $display("---------------------------------------------------------------");
        $monitor("%4t |  %b  |   %b   |     %b     |       %b        |     %b", 
                 $time, clk, rst_n, serial_in, q, serial_out);

        clk = 0; rst_n = 0; serial_in = 0;
        #12 rst_n = 1;

        // Shift in bit sequence: 1, 0, 1, 1
        send_bit(1); // bit 1
        send_bit(0); // bit 2
        send_bit(1); // bit 3
        send_bit(1); // bit 4

        // Shift out bits by feeding zeros
        send_bit(0);
        send_bit(0);
        send_bit(0);
        send_bit(0);

        #20;
        $finish;
    end
endmodule
