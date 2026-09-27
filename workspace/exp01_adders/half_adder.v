// Experiment 1A: Half Adder
// Sum = a ^ b, Carry = a & b
module half_adder (
    input  wire a,
    input  wire b,
    output wire sum,
    output wire carry
);
    assign sum   = a ^ b;
    assign carry = a & b;
endmodule
