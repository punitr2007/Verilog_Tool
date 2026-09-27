// Power Electronics: 3-Phase Space Vector PWM (SVPWM) Modulator
module svpwm_generator (
    input  logic        clk,
    input  logic        rst_n,
    input  logic [7:0]  v_alpha,
    input  logic [7:0]  v_beta,
    output logic [2:0]  sector,
    output logic        pwm_a,
    output logic        pwm_b,
    output logic        pwm_c
);

    logic [7:0] carrier_cnt;
    logic       carrier_dir;
    logic [7:0] cmp_a, cmp_b, cmp_c;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            carrier_cnt <= 8'd0;
            carrier_dir <= 1'b0;
        end else begin
            if (carrier_dir == 1'b0) begin
                if (carrier_cnt == 8'd250) carrier_dir <= 1'b1;
                else carrier_cnt <= carrier_cnt + 1'b1;
            end else begin
                if (carrier_cnt == 8'd0) carrier_dir <= 1'b0;
                else carrier_cnt <= carrier_cnt - 1'b1;
            end
        end
    end

    always_comb begin
        if (v_beta[7] == 1'b0) begin
            if (v_alpha[7] == 1'b0) sector = 3'd1;
            else sector = 3'd2;
        end else begin
            if (v_alpha[7] == 1'b0) sector = 3'd6;
            else sector = 3'd4;
        end

        cmp_a = 8'd128 + (v_alpha >>> 1);
        cmp_b = 8'd128 - (v_alpha >>> 2) + (v_beta >>> 1);
        cmp_c = 8'd128 - (v_alpha >>> 2) - (v_beta >>> 1);

        pwm_a = (carrier_cnt < cmp_a);
        pwm_b = (carrier_cnt < cmp_b);
        pwm_c = (carrier_cnt < cmp_c);
    end

endmodule
