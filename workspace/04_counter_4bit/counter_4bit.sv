module counter_4bit (
    input  logic       clk,
    input  logic       rst_n,
    input  logic       enable,
    output logic [3:0] count,
    output logic       tc
);
    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            count <= 4'b0000;
        end else if (enable) begin
            count <= count + 1'b1;
        end
    end
    assign tc = (count == 4'b1111) && enable;
endmodule
