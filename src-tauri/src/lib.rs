use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize)]
pub struct SimulationResult {
    pub success: bool,
    pub stage: String,
    pub stdout: String,
    pub stderr: String,
    pub vcd_content: String,
    pub has_vcd: bool,
    pub execution_time_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoadProjectResult {
    pub success: bool,
    pub dir_path: String,
    pub design: String,
    pub testbench: String,
    pub has_vcd: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveProjectResult {
    pub success: bool,
    pub message: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolsStatus {
    pub iverilog_installed: bool,
    pub vvp_installed: bool,
    pub ghdl_installed: bool,
    pub gtkwave_installed: bool,
}

fn get_enhanced_path() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/punit".to_string());
    let current_path = std::env::var("PATH").unwrap_or_default();
    format!("{}/.local/bin:{}/.local/ghdl/bin:{}", home, home, current_path)
}

fn get_runtime_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let dir = PathBuf::from(home).join(".hdl_eda_studio_runtime");
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    dir
}

#[tauri::command]
fn check_tools() -> ToolsStatus {
    let env_path = get_enhanced_path();
    std::env::set_var("PATH", &env_path);

    ToolsStatus {
        iverilog_installed: which::which("iverilog").is_ok(),
        vvp_installed: which::which("vvp").is_ok(),
        ghdl_installed: which::which("ghdl").is_ok(),
        gtkwave_installed: which::which("gtkwave").is_ok() || which::which("gtkwave_light").is_ok(),
    }
}

#[tauri::command]
fn select_folder() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Select HDL Project Folder")
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn load_project(dir_path: Option<String>, lang: String) -> LoadProjectResult {
    let is_vhdl = lang == "vhdl";
    let default_dir = if is_vhdl {
        "/home/punit/xilinx_projects/VHDL_Basics/Lab_Acts/01_logic_gates"
    } else {
        "/home/punit/xilinx_projects/eda_playgrounds_acts"
    };

    let target_dir = dir_path.unwrap_or_else(|| default_dir.to_string());
    let p = Path::new(&target_dir);

    let design_name = if is_vhdl {
        if p.join("01_logic_gates.vhd").exists() { "01_logic_gates.vhd" } else { "design.vhd" }
    } else {
        "design.sv"
    };
    let tb_name = if is_vhdl { "testbench.vhd" } else { "testbench.sv" };

    let design_path = p.join(design_name);
    let tb_path = p.join(tb_name);
    let vcd_path = p.join("dump.vcd");

    let design = fs::read_to_string(&design_path).unwrap_or_default();
    let testbench = fs::read_to_string(&tb_path).unwrap_or_default();
    let has_vcd = vcd_path.exists();

    LoadProjectResult {
        success: true,
        dir_path: target_dir,
        design,
        testbench,
        has_vcd,
        error: None,
    }
}

#[tauri::command]
fn save_project(dir_path: Option<String>, design: String, testbench: String, lang: String) -> SaveProjectResult {
    let is_vhdl = lang == "vhdl";
    let default_dir = if is_vhdl {
        "/home/punit/xilinx_projects/VHDL_Basics/Lab_Acts/01_logic_gates"
    } else {
        "/home/punit/xilinx_projects/eda_playgrounds_acts"
    };

    let target_dir = dir_path.unwrap_or_else(|| default_dir.to_string());
    let p = Path::new(&target_dir);

    if !p.exists() {
        if let Err(e) = fs::create_dir_all(p) {
            return SaveProjectResult {
                success: false,
                message: String::new(),
                error: Some(format!("Failed to create folder: {}", e)),
            };
        }
    }

    let design_file = p.join(if is_vhdl { "design.vhd" } else { "design.sv" });
    let tb_file = p.join(if is_vhdl { "testbench.vhd" } else { "testbench.sv" });

    if let Err(e) = fs::write(&design_file, design) {
        return SaveProjectResult {
            success: false,
            message: String::new(),
            error: Some(format!("Failed to save design file: {}", e)),
        };
    }

    if let Err(e) = fs::write(&tb_file, testbench) {
        return SaveProjectResult {
            success: false,
            message: String::new(),
            error: Some(format!("Failed to save testbench file: {}", e)),
        };
    }

    SaveProjectResult {
        success: true,
        message: format!("Saved successfully to {}", target_dir),
        error: None,
    }
}

fn find_vcd_file(sim_dir: &Path, testbench: &str) -> Option<PathBuf> {
    if !sim_dir.exists() {
        return None;
    }

    // 1. Try finding $dumpfile("...") in testbench
    if let Some(start) = testbench.find("$dumpfile") {
        let after = &testbench[start..];
        if let Some(open_quote) = after.find('"').or_else(|| after.find('\'')) {
            let after_quote = &after[open_quote + 1..];
            if let Some(close_quote) = after_quote.find('"').or_else(|| after_quote.find('\'')) {
                let filename = &after_quote[..close_quote];
                let custom_path = if Path::new(filename).is_absolute() {
                    PathBuf::from(filename)
                } else {
                    sim_dir.join(filename)
                };
                if custom_path.exists() {
                    return Some(custom_path);
                }
            }
        }
    }

    // 2. Try default dump.vcd
    let default_vcd = sim_dir.join("dump.vcd");
    if default_vcd.exists() {
        return Some(default_vcd);
    }

    // 3. Scan directory for any .vcd file
    if let Ok(entries) = fs::read_dir(sim_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().map_or(false, |ext| ext == "vcd") {
                return Some(p);
            }
        }
    }

    None
}

#[tauri::command]
fn launch_gtkwave(target_dir: Option<String>) -> Result<String, String> {
    let sim_dir = target_dir
        .filter(|d| Path::new(d).exists())
        .map(PathBuf::from)
        .unwrap_or_else(get_runtime_dir);

    let vcd_file = find_vcd_file(&sim_dir, "");
    let vcd_file = match vcd_file {
        Some(f) => f,
        None => return Err("No .vcd waveform file found. Please run a simulation first.".to_string()),
    };

    let env_path = get_enhanced_path();
    let vcd_str = vcd_file.to_string_lossy().to_string();

    let spawn_res = Command::new("gtkwave_light")
        .arg(&vcd_str)
        .env("PATH", &env_path)
        .spawn()
        .or_else(|_| {
            Command::new("gtkwave")
                .arg(&vcd_str)
                .env("PATH", &env_path)
                .spawn()
        });

    match spawn_res {
        Ok(_) => Ok(format!("GTKWave launched with {}", vcd_file.file_name().unwrap_or_default().to_string_lossy())),
        Err(e) => Err(format!("Failed to launch GTKWave: {}", e)),
    }
}

#[tauri::command]
fn run_simulation(
    design: String,
    mut testbench: String,
    target_dir: Option<String>,
    lang: String,
) -> SimulationResult {
    let start_time = Instant::now();
    let is_vhdl = lang == "vhdl";
    let env_path = get_enhanced_path();

    let sim_dir = target_dir
        .filter(|d| Path::new(d).exists())
        .map(PathBuf::from)
        .unwrap_or_else(get_runtime_dir);

    let design_file = sim_dir.join(if is_vhdl { "design.vhd" } else { "design.sv" });
    let tb_file = sim_dir.join(if is_vhdl { "testbench.vhd" } else { "testbench.sv" });
    let simv_file = sim_dir.join("simv");
    let default_vcd_file = sim_dir.join("dump.vcd");

    // Auto-inject $dumpfile if missing in Verilog testbench
    if !is_vhdl && !testbench.contains("$dumpfile") {
        if testbench.contains("initial begin") {
            testbench = testbench.replace(
                "initial begin",
                "initial begin\n        $dumpfile(\"dump.vcd\");\n        $dumpvars(0);",
            );
        } else {
            testbench.push_str("\nmodule __auto_dumper;\n  initial begin\n    $dumpfile(\"dump.vcd\");\n    $dumpvars(0);\n  end\nendmodule\n");
        }
    }

    // Clean old simv and *.vcd files in sim_dir
    let _ = fs::remove_file(&simv_file);
    if let Ok(entries) = fs::read_dir(&sim_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().map_or(false, |ext| ext == "vcd") {
                let _ = fs::remove_file(p);
            }
        }
    }

    if let Err(e) = fs::write(&design_file, &design) {
        return SimulationResult {
            success: false,
            stage: "io_error".to_string(),
            stdout: String::new(),
            stderr: format!("Failed to write design file: {}", e),
            vcd_content: String::new(),
            has_vcd: false,
            execution_time_ms: start_time.elapsed().as_millis() as u64,
        };
    }

    if let Err(e) = fs::write(&tb_file, &testbench) {
        return SimulationResult {
            success: false,
            stage: "io_error".to_string(),
            stdout: String::new(),
            stderr: format!("Failed to write testbench file: {}", e),
            vcd_content: String::new(),
            has_vcd: false,
            execution_time_ms: start_time.elapsed().as_millis() as u64,
        };
    }

    if is_vhdl {
        let top_entity = "testbench";
        let ghdl_cmd = format!(
            "ghdl -a --std=08 \"{}\" \"{}\" && ghdl -e --std=08 {} && ghdl -r --std=08 {} --vcd=\"{}\" --stop-time=1000ns",
            design_file.display(),
            tb_file.display(),
            top_entity,
            top_entity,
            default_vcd_file.display()
        );

        let output = Command::new("sh")
            .arg("-c")
            .arg(&ghdl_cmd)
            .current_dir(&sim_dir)
            .env("PATH", &env_path)
            .output();

        let execution_time_ms = start_time.elapsed().as_millis() as u64;
        let found_vcd = find_vcd_file(&sim_dir, &testbench);
        let vcd_content = found_vcd
            .as_ref()
            .and_then(|p| fs::read_to_string(p).ok())
            .unwrap_or_default();
        let has_vcd = !vcd_content.is_empty();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                let success = out.status.success() || has_vcd;

                SimulationResult {
                    success,
                    stage: if success { "simulation".to_string() } else { "ghdl_compilation".to_string() },
                    stdout,
                    stderr,
                    vcd_content,
                    has_vcd,
                    execution_time_ms,
                }
            }
            Err(e) => SimulationResult {
                success: false,
                stage: "process_spawn_error".to_string(),
                stdout: String::new(),
                stderr: format!("Failed to execute GHDL: {}", e),
                vcd_content: String::new(),
                has_vcd: false,
                execution_time_ms,
            },
        }
    } else {
        // Verilog with Icarus
        let compile_out = Command::new("iverilog")
            .arg("-g2012")
            .arg("-o")
            .arg(&simv_file)
            .arg(&design_file)
            .arg(&tb_file)
            .current_dir(&sim_dir)
            .env("PATH", &env_path)
            .output();

        match compile_out {
            Ok(c_out) if !c_out.status.success() => {
                let stdout = String::from_utf8_lossy(&c_out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&c_out.stderr).to_string();
                SimulationResult {
                    success: false,
                    stage: "compilation".to_string(),
                    stdout,
                    stderr,
                    vcd_content: String::new(),
                    has_vcd: false,
                    execution_time_ms: start_time.elapsed().as_millis() as u64,
                }
            }
            Ok(_) => {
                let sim_out = Command::new("vvp")
                    .arg(&simv_file)
                    .current_dir(&sim_dir)
                    .env("PATH", &env_path)
                    .output();

                let execution_time_ms = start_time.elapsed().as_millis() as u64;
                let found_vcd = find_vcd_file(&sim_dir, &testbench);
                let vcd_content = found_vcd
                    .as_ref()
                    .and_then(|p| fs::read_to_string(p).ok())
                    .unwrap_or_default();
                let has_vcd = !vcd_content.is_empty();

                match sim_out {
                    Ok(s_out) => {
                        let stdout = String::from_utf8_lossy(&s_out.stdout).to_string();
                        let stderr = String::from_utf8_lossy(&s_out.stderr).to_string();
                        SimulationResult {
                            success: s_out.status.success() || has_vcd,
                            stage: "simulation".to_string(),
                            stdout,
                            stderr,
                            vcd_content,
                            has_vcd,
                            execution_time_ms,
                        }
                    }
                    Err(e) => SimulationResult {
                        success: false,
                        stage: "simulation_spawn_error".to_string(),
                        stdout: String::new(),
                        stderr: format!("Failed to execute vvp simulator: {}", e),
                        vcd_content: String::new(),
                        has_vcd: false,
                        execution_time_ms,
                    },
                }
            }
            Err(e) => SimulationResult {
                success: false,
                stage: "compiler_not_found".to_string(),
                stdout: String::new(),
                stderr: format!("Failed to invoke iverilog compiler: {}. Please check installation.", e),
                vcd_content: String::new(),
                has_vcd: false,
                execution_time_ms: start_time.elapsed().as_millis() as u64,
            },
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            check_tools,
            select_folder,
            load_project,
            save_project,
            launch_gtkwave,
            run_simulation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running HDL EDA Studio desktop application");
}
