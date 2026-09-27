// Power Electronics: Complementary PWM Generator with Configurable Dead-Time
module deadtime_pwm #(
    parameter int DEAD_TIME_TICKS = 4
)(
    input  logic clk,
    input  logic rst_n,
    input  logic pwm_in,
    output logic pwm_high,
    output logic pwm_low
);

    logic [3:0] dt_cnt_high, dt_cnt_low;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            pwm_high    <= 1'b0;
            pwm_low     <= 1'b0;
            dt_cnt_high <= '0;
            dt_cnt_low  <= '0;
        end else begin
            if (pwm_in) begin
                pwm_low    <= 1'b0;
                dt_cnt_low <= '0;
                if (dt_cnt_high < DEAD_TIME_TICKS) begin
                    dt_cnt_high <= dt_cnt_high + 1'b1;
                    pwm_high    <= 1'b0;
                end else begin
                    pwm_high    <= 1'b1;
                end
            end else begin
                pwm_high    <= 1'b0;
                dt_cnt_high <= '0;
                if (dt_cnt_low < DEAD_TIME_TICKS) begin
                    dt_cnt_low <= dt_cnt_low + 1'b1;
                    pwm_low    <= 1'b0;
                end else begin
                    pwm_low    <= 1'b1;
                end
            end
        end
    end

endmodule
