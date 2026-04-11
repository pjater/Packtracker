use serde_json::json;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn pick_mods_folder(app: tauri::AppHandle) -> Option<String> {
  app.dialog()
    .file()
    .pick_folder()
    .blocking_pick()
    .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
async fn read_jar_files_in_folder(folder_path: String, extensions: Vec<String>) -> Vec<serde_json::Value> {
  let mut results = Vec::new();
  let normalized_extensions: std::collections::HashSet<String> = extensions
    .into_iter()
    .map(|extension| extension.trim_start_matches('.').to_ascii_lowercase())
    .filter(|extension| !extension.is_empty())
    .collect();

  if let Ok(entries) = std::fs::read_dir(&folder_path) {
    for entry in entries.flatten() {
      let path = entry.path();
      let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase());

      let allowed = extension
        .as_deref()
        .map(|value| normalized_extensions.contains(value))
        .unwrap_or(false);

      if !allowed {
        continue;
      }

      let file_name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();

      results.push(json!({
        "name": file_name,
        "path": path.to_string_lossy().to_string(),
      }));
    }
  }

  results
}

#[tauri::command]
async fn download_file_to_folder(
  url: String,
  folder_path: String,
  filename: String,
) -> Result<String, String> {
  let response = reqwest::get(&url).await.map_err(|error| error.to_string())?;
  let bytes = response.bytes().await.map_err(|error| error.to_string())?;
  std::fs::create_dir_all(&folder_path).map_err(|error| error.to_string())?;
  let destination = std::path::Path::new(&folder_path).join(&filename);
  std::fs::write(&destination, &bytes).map_err(|error| error.to_string())?;
  Ok(destination.to_string_lossy().to_string())
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
      pick_mods_folder,
      read_jar_files_in_folder,
      download_file_to_folder
    ])
    .run(tauri::generate_context!())
    .expect("error while running PackTracker");
}
