// Experiment 3: 2-bit Binary Comparator using Basic Gates
// Inputs: A[1:0], B[1:0]
// Outputs: A_gt_B (A > B), A_eq_B (A == B), A_lt_B (A < B)
module comparator_2bit (
    input  wire [1:0] a,
    input  wire [1:0] b,
    output wire       a_gt_b,
    output wire       a_eq_b,
    output wire       a_lt_b
);
    wire x1, x0;

    // Bit-wise equivalence using XNOR
    assign x1 = ~(a[1] ^ b[1]);
    assign x0 = ~(a[0] ^ b[0]);

    // Equality: both bit pairs are equal
    assign a_eq_b = x1 & x0;

    // Greater Than: MSB is greater OR (MSBs equal AND LSB is greater)
    assign a_gt_b = (a[1] & ~b[1]) | (x1 & a[0] & ~b[0]);

    // Less Than: MSB is smaller OR (MSBs equal AND LSB is smaller)
    assign a_lt_b = (~a[1] & b[1]) | (x1 & ~a[0] & b[0]);

endmodule
