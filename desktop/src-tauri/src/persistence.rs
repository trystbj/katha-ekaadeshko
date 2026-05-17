use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectStateJson {
  pub id: String,
  pub title: String,
  pub status: String,
  pub createdAt: String,
  pub updatedAt: String,
  pub bible: serde_json::Value,
  pub episodes: serde_json::Value,
  pub memorySummary: String,
  pub contentFingerprints: serde_json::Value,
  pub continuityNotes: serde_json::Value,
  pub assets: serde_json::Value,
  pub fontMode: String,
  pub qualityMerge: bool,
  pub lastRenderVideoUrl: Option<String>,
  pub videoStudio: serde_json::Value,
  pub narration: serde_json::Value,
  pub uiLanguage: Option<String>,
  pub translateContentToUiLanguage: Option<bool>,
  pub characterReference: serde_json::Value
}

fn projects_dir(base: &Path) -> PathBuf {
  base.join("projects")
}

pub fn ensure_dirs(base: &Path) -> Result<(), String> {
  let p = projects_dir(base);
  fs::create_dir_all(&p).map_err(|e| e.to_string())?;
  Ok(())
}

pub fn save_project(base: &Path, project: &ProjectStateJson) -> Result<(), String> {
  ensure_dirs(base)?;
  let path = projects_dir(base).join(format!("{}.json", project.id));
  let body = serde_json::to_string_pretty(project).map_err(|e| e.to_string())?;
  fs::write(path, body).map_err(|e| e.to_string())?;
  Ok(())
}

