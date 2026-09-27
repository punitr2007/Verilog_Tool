// Experiment 6: 2 to 4 Decoder with Active-High Enable
// Inputs: in[1:0], en
// Outputs: out[3:0]
module decoder_2to4 (
    input  wire       en,
    input  wire [1:0] in,
    output wire [3:0] out
);
    assign out[0] = en & (~in[1]) & (~in[0]);
    assign out[1] = en & (~in[1]) &   in[0];
    assign out[2] = en &   in[1]  & (~in[0]);
    assign out[3] = en &   in[1]  &   in[0];
endmodule
