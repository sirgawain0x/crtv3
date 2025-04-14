use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Serialize, Deserialize)]
struct Transfer {
    action: String,
    cid: String,
    size: u64,
    timestamp: String,
}

#[derive(Serialize, Deserialize)]
struct Pod {
    name: String,
    namespace: String,
    status: String,
}

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    role: String,
    exp: usize,
}

#[command]
async fn authenticate(cid: String) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }

    let claims = Claims {
        sub: cid,
        role: "user".to_string(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("your-secret-key".as_ref()),
    )
    .map_err(|e| e.to_string())?;

    Ok(token)
}

#[command]
async fn get_transfers(token: String) -> Result<Vec<Transfer>, String> {
    let claims = decode_token(&token)?;
    
    let transfers = vec![
        Transfer {
            action: "Upload".to_string(),
            cid: format!("{}/file1", claims.sub),
            size: 1024,
            timestamp: "2025-04-11T12:00:00Z".to_string(),
        },
        Transfer {
            action: "Download".to_string(),
            cid: format!("{}/file2", claims.sub),
            size: 2048,
            timestamp: "2025-04-11T12:01:00Z".to_string(),
        },
    ];

    Ok(transfers)
}

#[command]
async fn get_kubernetes_pods(token: String) -> Result<Vec<Pod>, String> {
    let claims = decode_token(&token)?;

    let pods = vec![
        Pod {
            name: format!("wp-{}", claims.sub),
            namespace: format!("user-{}", claims.sub),
            status: "Running".to_string(),
        },
        Pod {
            name: format!("static-{}", claims.sub),
            namespace: format!("user-{}", claims.sub),
            status: "Pending".to_string(),
        },
    ];

    Ok(pods)
}

#[command]
async fn create_kubernetes_resource(token: String, resource_type: String) -> Result<String, String> {
    let claims = decode_token(&token)?;

    if claims.role != "admin" && resource_type != "static-site" {
        return Err("Unauthorized: Only admins can create non-static resources".to_string());
    }

    Ok(format!("Created {} for CID: {}", resource_type, claims.sub))
}

fn decode_token(token: &str) -> Result<Claims, String> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret("your-secret-key".as_ref()),
        &Validation::default(),
    )
    .map_err(|e| e.to_string())?;

    Ok(token_data.claims)
}