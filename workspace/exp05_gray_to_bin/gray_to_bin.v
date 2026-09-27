// Experiment 5: 4-bit Gray to Binary Code Converter
// bin[3] = gray[3]
// bin[2] = gray[3] ^ gray[2]
// bin[1] = gray[3] ^ gray[2] ^ gray[1]
// bin[0] = gray[3] ^ gray[2] ^ gray[1] ^ gray[0]
module gray_to_bin (
    input  wire [3:0] gray,
    output wire [3:0] bin
);
    assign bin[3] = gray[3];
    assign bin[2] = bin[3] ^ gray[2];
    assign bin[1] = bin[2] ^ gray[1];
    assign bin[0] = bin[1] ^ gray[0];
endmodule
