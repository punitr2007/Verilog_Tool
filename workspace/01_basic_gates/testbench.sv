`timescale 1ns/1ps

module tb_basic_gates;
    logic a, b;
    logic yAND, yOR, yNOT, yNAND, yNOR, yXOR, yXNOR;

    basic_gates uut (
        .a(a), .b(b),
        .yAND(yAND), .yOR(yOR), .yNOT(yNOT),
        .yNAND(yNAND), .yNOR(yNOR), .yXOR(yXOR), .yXNOR(yXNOR)
    );

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, tb_basic_gates);
        $monitor("Time=%0t | a=%b b=%b | AND=%b OR=%b NOT=%b NAND=%b NOR=%b XOR=%b XNOR=%b", 
                 $time, a, b, yAND, yOR, yNOT, yNAND, yNOR, yXOR, yXNOR);
        a = 0; b = 0; #10;
        a = 0; b = 1; #10;
        a = 1; b = 0; #10;
        a = 1; b = 1; #10;
        $finish;
    end
endmodule
