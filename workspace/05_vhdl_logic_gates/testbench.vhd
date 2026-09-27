library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity testbench is
end testbench;

architecture Behavioral of testbench is
    signal a         : STD_LOGIC := '0';
    signal b         : STD_LOGIC := '0';
    signal c         : STD_LOGIC := '0';
    signal y_and     : STD_LOGIC;
    signal y_or      : STD_LOGIC;
    signal y_nand    : STD_LOGIC;
    signal y_nor     : STD_LOGIC;
    signal y_xor     : STD_LOGIC;
    signal y_xnor    : STD_LOGIC;
    signal y_complex : STD_LOGIC;
begin
    dut: entity work.basic_gates
        port map (
            a         => a,
            b         => b,
            c         => c,
            y_and     => y_and,
            y_or      => y_or,
            y_nand    => y_nand,
            y_nor     => y_nor,
            y_xor     => y_xor,
            y_xnor    => y_xnor,
            y_complex => y_complex
        );

    stim_proc: process
    begin
        a <= '0'; b <= '0'; c <= '0'; wait for 10 ns;
        a <= '0'; b <= '1'; c <= '1'; wait for 10 ns;
        a <= '1'; b <= '0'; c <= '0'; wait for 10 ns;
        a <= '1'; b <= '1'; c <= '1'; wait for 10 ns;
        report "VHDL Simulation Finished Successfully!";
        wait;
    end process;
end Behavioral;
