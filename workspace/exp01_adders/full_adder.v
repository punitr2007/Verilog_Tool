// Experiment 1B: Full Adder
// Sum = a ^ b ^ cin, Cout = (a & b) | (b & cin) | (a & cin)
module full_adder (
    input  wire a,
    input  wire b,
    input  wire cin,
    output wire sum,
    output wire cout
);
    assign sum  = a ^ b ^ cin;
    assign cout = (a & b) | (b & cin) | (a & cin);
endmodule
