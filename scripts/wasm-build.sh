#!/bin/bash

# Function to run pnpm build:wasm in the plugin-filecoin directory
build_wasm_plugin() {
    local plugin_dir="packages/plugin-filecoin"
    
    # Check if the directory exists
    if [ -d "$plugin_dir" ]; then
        cd "$plugin_dir" || { log_error "Failed to change directory to $plugin_dir"; return 1; }
        
        # Run pnpm build:wasm
        log_info "Running pnpm build:wasm in $plugin_dir"
        if ! pnpm build:wasm; then
            log_error "Failed to run pnpm build:wasm in $plugin_dir"
            return 1
        fi
        
        log_success "pnpm build:wasm completed successfully in $plugin_dir"
        
        # Return to the original directory
        cd - || { log_error "Failed to change back to the original directory"; return 1; }
    else
        log_error "Directory $plugin_dir does not exist"
        return 1
    fi
}



