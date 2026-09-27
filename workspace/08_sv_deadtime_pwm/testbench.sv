`timescale 1ns/1ps

module testbench;
    logic clk, rst_n, pwm_in;
    logic pwm_high, pwm_low;

    deadtime_pwm #(.DEAD_TIME_TICKS(3)) uut (
        .clk(clk),
        .rst_n(rst_n),
        .pwm_in(pwm_in),
        .pwm_high(pwm_high),
        .pwm_low(pwm_low)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, testbench);

        clk = 0; rst_n = 0; pwm_in = 0;
        #15 rst_n = 1;

        #10 pwm_in = 1;
        #50 pwm_in = 0;
        #60 pwm_in = 1;
        #70 pwm_in = 0;
        #50;
        $finish;
    end
endmodule
