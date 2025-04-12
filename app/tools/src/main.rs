mod commands;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::authenticate,
            commands::get_transfers,
            commands::get_kubernetes_pods,
            commands::create_kubernetes_resource
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use kube::{Api, Client};
use k8s_openapi::api::core::v1::Pod;

async fn get_kubernetes_pods(token: String) -> Result<Vec<Pod>, String> {
    let claims = decode_token(&token)?;
    let client = Client::try_default().await.map_err(|e| e.to_string())?;
    let pods: Api<Pod> = Api::namespaced(client, &format!("user-{}", claims.sub));
    let pod_list = pods.list(&Default::default()).await.map_err(|e| e.to_string())?;
    Ok(pod_list.items.into_iter().map(|pod| Pod {
        name: pod.metadata.name.unwrap_or_default(),
        namespace: pod.metadata.namespace.unwrap_or_default(),
        status: pod.status.unwrap_or_default().phase.unwrap_or_default(),
    }).collect())
}