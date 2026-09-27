// Experiment 11A: 4-Bit Synchronous Binary Up-Counter
// Inputs: clk, rst_n, enable
// Outputs: count[3:0], tc (Terminal Count at 15)
module binary_counter_4bit (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       enable,
    output reg  [3:0] count,
    output wire       tc
);
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            count <= 4'b0000;
        end else if (enable) begin
            count <= count + 1'b1;
        end
    end

    assign tc = (count == 4'b1111) && enable;

endmodule
