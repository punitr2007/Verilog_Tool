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
pub struct HdlFileInfo {
    pub name: String,
    pub is_testbench: bool,
    pub lang: String,
    pub size: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoadProjectResult {
    pub success: bool,
    pub dir_path: String,
    pub design: String,
    pub testbench: String,
    pub files: Vec<HdlFileInfo>,
    pub active_design_file: String,
    pub active_testbench_file: String,
    pub lang: String,
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
    format!("{}/.local/ghdl/bin:{}/.local/bin:{}", home, home, current_path)
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
fn load_project(
    dir_path: Option<String>,
    lang: String,
    design_file: Option<String>,
    testbench_file: Option<String>,
) -> LoadProjectResult {
    let is_vhdl_init = lang == "vhdl";
    let default_dir = if is_vhdl_init {
        "/home/punit/Local_Codebase/Projects/Verilog_Tool/workspace/05_vhdl_logic_gates"
    } else {
        "/home/punit/Local_Codebase/Projects/Verilog_Tool/workspace/01_basic_gates"
    };

    let target_dir = dir_path.unwrap_or_else(|| default_dir.to_string());
    let p = Path::new(&target_dir);

    if !p.exists() {
        return LoadProjectResult {
            success: false,
            dir_path: target_dir,
            design: String::new(),
            testbench: String::new(),
            files: vec![],
            active_design_file: String::new(),
            active_testbench_file: String::new(),
            lang,
            has_vcd: false,
            error: Some(format!("Directory not found: {}", p.display())),
        };
    }

    let mut files: Vec<HdlFileInfo> = Vec::new();
    let mut all_file_contents: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    if let Ok(entries) = fs::read_dir(p) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if ["v", "sv", "vhd", "vhdl"].contains(&ext_lower.as_str()) {
                        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        let content = fs::read_to_string(&path).unwrap_or_default();
                        let is_vhd = ext_lower == "vhd" || ext_lower == "vhdl";
                        let name_lower = name.to_lowercase();
                        let content_lower = content.to_lowercase();

                        let is_tb = name_lower.contains("_tb")
                            || name_lower.starts_with("tb_")
                            || name_lower.contains("testbench")
                            || content_lower.contains("$dumpfile")
                            || content_lower.contains("stim_proc")
                            || (is_vhd && content_lower.contains("entity testbench"));

                        files.push(HdlFileInfo {
                            name: name.clone(),
                            is_testbench: is_tb,
                            lang: if is_vhd { "vhdl".to_string() } else { "verilog".to_string() },
                            size: content.len(),
                        });
                        all_file_contents.insert(name, content);
                    }
                }
            }
        }
    }

    let mut detected_lang = lang;
    let vhd_count = files.iter().filter(|f| f.lang == "vhdl").count();
    let sv_count = files.iter().filter(|f| f.lang == "verilog").count();
    if vhd_count > 0 && sv_count == 0 {
        detected_lang = "vhdl".to_string();
    } else if sv_count > 0 && vhd_count == 0 {
        detected_lang = "verilog".to_string();
    }

    let active_des_name = if let Some(req_d) = design_file {
        req_d
    } else if let Some(d) = files.iter().find(|f| !f.is_testbench) {
        d.name.clone()
    } else if let Some(first) = files.first() {
        first.name.clone()
    } else if detected_lang == "vhdl" {
        "design.vhd".to_string()
    } else {
        "design.sv".to_string()
    };

    let active_tb_name = if let Some(req_tb) = testbench_file {
        req_tb
    } else if let Some(tb) = files.iter().find(|f| f.is_testbench) {
        tb.name.clone()
    } else if detected_lang == "vhdl" {
        "testbench.vhd".to_string()
    } else {
        "testbench.sv".to_string()
    };

    let design = all_file_contents.get(&active_des_name).cloned().unwrap_or_default();
    let testbench = all_file_contents.get(&active_tb_name).cloned().unwrap_or_default();
    let has_vcd = find_vcd_file(p, &testbench).is_some();

    LoadProjectResult {
        success: true,
        dir_path: target_dir,
        design,
        testbench,
        files,
        active_design_file: active_des_name,
        active_testbench_file: active_tb_name,
        lang: detected_lang,
        has_vcd,
        error: None,
    }
}

#[tauri::command]
fn save_project(
    dir_path: Option<String>,
    design: String,
    testbench: String,
    lang: String,
    design_file_name: Option<String>,
    testbench_file_name: Option<String>,
) -> SaveProjectResult {
    let is_vhdl = lang == "vhdl";
    let default_dir = if is_vhdl {
        "/home/punit/Local_Codebase/Projects/Verilog_Tool/workspace/05_vhdl_logic_gates"
    } else {
        "/home/punit/Local_Codebase/Projects/Verilog_Tool/workspace/01_basic_gates"
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

    let d_name = design_file_name.unwrap_or_else(|| if is_vhdl { "design.vhd".to_string() } else { "design.sv".to_string() });
    let tb_name = testbench_file_name.unwrap_or_else(|| if is_vhdl { "testbench.vhd".to_string() } else { "testbench.sv".to_string() });

    let design_file = p.join(&d_name);
    let tb_file = p.join(&tb_name);

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
        message: format!("Saved {} and {} successfully to {}", d_name, tb_name, target_dir),
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
    design_file_name: Option<String>,
    testbench_file_name: Option<String>,
) -> SimulationResult {
    let start_time = Instant::now();
    let is_vhdl = lang == "vhdl";
    let env_path = get_enhanced_path();

    let sim_dir = target_dir
        .filter(|d| Path::new(d).exists())
        .map(PathBuf::from)
        .unwrap_or_else(get_runtime_dir);

    let d_name = design_file_name.unwrap_or_else(|| if is_vhdl { "design.vhd".to_string() } else { "design.sv".to_string() });
    let tb_name = testbench_file_name.unwrap_or_else(|| if is_vhdl { "testbench.vhd".to_string() } else { "testbench.sv".to_string() });

    let design_file = sim_dir.join(&d_name);
    let tb_file = sim_dir.join(&tb_name);
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
        let mut top_entity = "testbench".to_string();
        if let Some(start) = testbench.find("entity") {
            let after = &testbench[start + 6..].trim_start();
            if let Some(space_idx) = after.find(|c: char| c.is_whitespace()) {
                let ent = &after[..space_idx];
                if !ent.is_empty() && ent.to_lowercase() != "is" {
                    top_entity = ent.to_string();
                }
            }
        }

        let mut other_vhd_files = Vec::new();
        if let Ok(entries) = fs::read_dir(&sim_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if (ext_lower == "vhd" || ext_lower == "vhdl") && p != design_file && p != tb_file {
                        other_vhd_files.push(format!("\"{}\"", p.display()));
                    }
                }
            }
        }

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
        let mut compile_cmd = Command::new("iverilog");
        compile_cmd.arg("-g2012")
            .arg("-I")
            .arg(&sim_dir)
            .arg("-o")
            .arg(&simv_file)
            .arg(&design_file)
            .arg(&tb_file);

        let compile_out = compile_cmd
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
