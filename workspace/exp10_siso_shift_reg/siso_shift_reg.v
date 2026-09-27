// Experiment 10: 4-bit Serial-In Serial-Out (SISO) Shift Register
// Inputs: clk, rst_n, serial_in
// Outputs: serial_out (and parallel monitor q)
module siso_shift_reg (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       serial_in,
    output wire       serial_out,
    output wire [3:0] q
);
    reg [3:0] shift_reg;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            shift_reg <= 4'b0000;
        end else begin
            // Shift right: new bit enters at MSB, LSB exits
            shift_reg <= {serial_in, shift_reg[3:1]};
        end
    end

    assign serial_out = shift_reg[0];
    assign q          = shift_reg;

endmodule
