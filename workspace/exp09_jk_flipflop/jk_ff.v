// Experiment 9: J-K Flip-Flop with Active-Low Asynchronous Reset
// Inputs: clk, rst_n, j, k
// Outputs: q, q_bar
module jk_ff (
    input  wire clk,
    input  wire rst_n,
    input  wire j,
    input  wire k,
    output reg  q,
    output wire q_bar
);
    assign q_bar = ~q;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            q <= 1'b0;
        end else begin
            case ({j, k})
                2'b00: q <= q;     // No Change / Hold
                2'b01: q <= 1'b0;  // Reset
                2'b10: q <= 1'b1;  // Set
                2'b11: q <= ~q;    // Toggle
            endcase
        end
    end
endmodule
