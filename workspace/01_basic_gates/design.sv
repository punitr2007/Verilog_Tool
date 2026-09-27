// SystemVerilog: Basic Logic Gates
module basic_gates (
    input  logic a, 
    input  logic b,
    output logic yAND,
    output logic yOR,
    output logic yNOT,
    output logic yNAND,
    output logic yNOR,
    output logic yXOR,
    output logic yXNOR
);
    assign yAND  = a & b;
    assign yOR   = a | b;
    assign yNOT  = ~a;
    assign yNAND = ~(a & b);
    assign yNOR  = ~(a | b);
    assign yXOR  = a ^ b;
    assign yXNOR = ~(a ^ b);
endmodule
