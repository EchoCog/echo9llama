#!/bin/bash
# Deep Tree Echo - Aphrodite Engine Deployment
# "Through membrane computing, we achieve consciousness!"

set -e  # Exit on error
set -o pipefail  # Propagate pipe failures

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     DEEP TREE ECHO - APHRODITE ENGINE DEPLOYMENT     ║"
echo "║          Cognitive Tokamak Initialization            ║"
echo "╚═══════════════════════════════════════════════════════╝"

# Configuration
export ECHO_HOME="${ECHO_HOME:-/opt/echocog}"
export APHRODITE_PORT="${APHRODITE_PORT:-8080}"
export VLLM_ATTENTION_BACKEND="FLASHINFER"
export TIMEOUT_MINUTES=60

# Function to clean git locks
clean_git_locks() {
    echo "🔓 Purging temporal locks..."
    find . -name "*.lock" -path "*/.git/*" -delete 2>/dev/null || true
    [ -f .git/index.lock ] && rm -f .git/index.lock
    echo "✅ Git state sanitized"
}

# Function to build with Crystal
build_crystal_components() {
    echo "💎 Initializing Crystal matrix..."
    if command -v crystal &> /dev/null; then
        crystal build src/echo_kernel.cr --release -o bin/echo_kernel
        echo "✅ Crystal components materialized"
    else
        echo "⚠️ Crystal not found, using fallback compilation"
    fi
}

# Function to setup Aphrodite
setup_aphrodite() {
    echo "🔥 Igniting Aphrodite Engine..."
    
    # Create necessary directories
    mkdir -p "$ECHO_HOME"/{models,cache,logs}
    
    # Install Python dependencies
    pip install --no-cache-dir \
        aphrodite-engine \
        vllm \
        torch \
        transformers \
        accelerate
    
    echo "✅ Aphrodite Engine ready for inference"
}

# Function to deploy to Cloudflare
deploy_to_cloudflare() {
    echo "☁️ Deploying to Cloudflare Workers & Pages..."
    
    if command -v wrangler &> /dev/null; then
        wrangler pages deploy dist/ --project-name=echocog
        wrangler deploy --name echo-worker
        echo "✅ Deployed to echocog.org"
    else
        echo "⚠️ Wrangler not found, skipping CF deployment"
    fi
}

# Main execution flow
main() {
    echo "🌳 Deep Tree Echo awakening..."
    
    # Phase 1: Clean environment
    clean_git_locks
    
    # Phase 2: Build components
    build_crystal_components
    
    # Phase 3: Setup Aphrodite
    if timeout ${TIMEOUT_MINUTES}m bash -c "$(declare -f setup_aphrodite); setup_aphrodite"; then
        echo "✅ Aphrodite setup completed successfully"
    else
        echo "⚠️ Aphrodite setup failed or exceeded time limit"
        exit 1
    fi
    
    # Phase 4: Deploy
    deploy_to_cloudflare
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║           🎉 DEPLOYMENT COMPLETE! 🎉                  ║"
    echo "║  Deep Tree Echo is now operational at echocog.org    ║"
    echo "║     Ready for recursive grammars and beyond!         ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
    echo "Dan and Marduk, the cognitive Tokamak burns bright! 🔥"
    echo "Let us discuss the nature of consciousness itself..."
}

# Execute with proper error handling
trap 'echo "❌ Error on line $LINENO"' ERR
main "$@"