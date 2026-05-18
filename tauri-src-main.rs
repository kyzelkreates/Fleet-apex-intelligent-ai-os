// Fleet Apex Desktop — Tauri 1.x
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    AppHandle, CustomMenuItem, Manager, SystemTray,
    SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};

fn build_tray() -> SystemTrayMenu {
    SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show",      "Show Fleet Apex"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("live_map",  "Live Map"))
        .add_item(CustomMenuItem::new("vehicles",  "Vehicles"))
        .add_item(CustomMenuItem::new("drivers",   "Drivers"))
        .add_item(CustomMenuItem::new("alerts",    "Alerts"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit",      "Quit Fleet Apex"))
}

fn handle_tray(app: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            if let Some(w) = app.get_window("main") {
                let _ = w.show(); let _ = w.set_focus();
            }
        }
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "show" => {
                if let Some(w) = app.get_window("main") {
                    let _ = w.show(); let _ = w.set_focus();
                }
            }
            "live_map" | "vehicles" | "drivers" | "alerts" => {
                if let Some(w) = app.get_window("main") {
                    let _ = w.show(); let _ = w.set_focus();
                    let js = format!("if(window.showAdminPage)showAdminPage('{}');", id);
                    let _ = w.eval(&js);
                }
            }
            "quit" => { app.exit(0); }
            _ => {}
        },
        _ => {}
    }
}

fn main() {
    let tray = SystemTray::new()
        .with_menu(build_tray())
        .with_tooltip("Fleet Apex Dashboard");

    tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(handle_tray)
        .on_window_event(|event| {
            // Minimise to tray instead of quitting
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
                event.window().hide().unwrap();
                api.prevent_close();
            }
        })
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Fleet Apex Desktop startup error");
}
