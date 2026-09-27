// Experiment 11B: Decimal (BCD / Modulo-10) Counter
// Counts from 0 to 9 and wraps to 0
// Inputs: clk, rst_n, enable
// Outputs: count[3:0], tc (Terminal Count at 9)
module bcd_counter (
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
            if (count == 4'd9) begin
                count <= 4'b0000;
            end else begin
                count <= count + 1'b1;
            end
        end
    end

    assign tc = (count == 4'd9) && enable;

endmodule
