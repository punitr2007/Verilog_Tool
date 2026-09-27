library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity basic_gates is
    Port ( 
        a         : in  STD_LOGIC;
        b         : in  STD_LOGIC;
        c         : in  STD_LOGIC;
        y_and     : out STD_LOGIC;
        y_or      : out STD_LOGIC;
        y_nand    : out STD_LOGIC;
        y_nor     : out STD_LOGIC;
        y_xor     : out STD_LOGIC;
        y_xnor    : out STD_LOGIC;
        y_complex : out STD_LOGIC
    );
end basic_gates;

architecture Dataflow of basic_gates is
begin
    y_and     <= a and b;
    y_or      <= a or b;
    y_nand    <= not (a and b);
    y_nor     <= not (a or b);
    y_xor     <= a xor b;
    y_xnor    <= not (a xor b);
    y_complex <= (a and b) or (not c);
end Dataflow;
