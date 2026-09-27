// Experiment 12: MOD-12 Synchronous Up-Counter
// Counts from 0 to 11 (4'b0000 to 4'b1011) and rolls over to 0
// Inputs: clk, rst_n, enable
// Outputs: count[3:0], tc (Terminal Count at 11)
module mod12_counter (
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
            if (count == 4'd11) begin
                count <= 4'b0000;
            end else begin
                count <= count + 1'b1;
            end
        end
    end

    assign tc = (count == 4'd11) && enable;

endmodule
