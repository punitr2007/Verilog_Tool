`timescale 1ns/1ps

module testbench;
    logic clk, rst_n;
    logic [7:0] v_alpha, v_beta;
    logic [2:0] sector;
    logic pwm_a, pwm_b, pwm_c;

    svpwm_generator dut (
        .clk(clk),
        .rst_n(rst_n),
        .v_alpha(v_alpha),
        .v_beta(v_beta),
        .sector(sector),
        .pwm_a(pwm_a),
        .pwm_b(pwm_b),
        .pwm_c(pwm_c)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, testbench);

        clk = 0; rst_n = 0; v_alpha = 8'd60; v_beta = 8'd30;
        #15 rst_n = 1;

        #500 v_alpha = 8'd20; v_beta = 8'd80;
        #500 v_alpha = -8'd50; v_beta = 8'd50;
        #500 v_alpha = -8'd60; v_beta = -8'd30;
        #500;
        $finish;
    end
endmodule
