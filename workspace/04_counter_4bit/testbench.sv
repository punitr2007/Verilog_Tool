`timescale 1ns/1ps

module testbench;
    logic       clk;
    logic       rst_n;
    logic       enable;
    logic [3:0] count;
    logic       tc;

    counter_4bit dut (
        .clk(clk),
        .rst_n(rst_n),
        .enable(enable),
        .count(count),
        .tc(tc)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, testbench);

        clk = 0; rst_n = 0; enable = 0;
        #12 rst_n = 1;
        #10 enable = 1;
        #180;
        enable = 0; #20;
        enable = 1; #40;
        $finish;
    end
endmodule
