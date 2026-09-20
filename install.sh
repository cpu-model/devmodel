#!/bin/sh

set -eu

repository=${CPU_MODEL_REPOSITORY:-cpu-model/devmodel}
ref=${CPU_MODEL_REF:-main}
target=${1:-.}

if [ ! -d "$target" ]; then
  printf 'Target directory does not exist: %s\n' "$target" >&2
  exit 1
fi

target=$(cd "$target" && pwd)
if [ ! -d "$target/.git" ]; then
  printf 'Target is not a Git repository root: %s\n' "$target" >&2
  exit 1
fi

temporary=$(mktemp -d "${TMPDIR:-/tmp}/cpu-model-install.XXXXXX")
trap 'rm -rf "$temporary"' EXIT HUP INT TERM

if [ -n "${CPU_MODEL_SOURCE_DIR:-}" ]; then
  source_root=$(cd "$CPU_MODEL_SOURCE_DIR" && pwd)
else
  archive="$temporary/cpu-model.tar.gz"
  url="https://github.com/$repository/archive/$ref.tar.gz"
  printf 'Fetching CPU model from %s at %s...\n' "$repository" "$ref"
  curl -fsSL "$url" -o "$archive"
  mkdir "$temporary/source"
  tar -xzf "$archive" -C "$temporary/source" --strip-components=1
  source_root="$temporary/source"
fi

for required in AGENTS.md SPEC.md README.md package.json package-lock.json CPU/PROCESS tools tests examples/model; do
  if [ ! -e "$source_root/$required" ]; then
    printf 'CPU source is incomplete; missing %s\n' "$required" >&2
    exit 1
  fi
done

cpu_dir="$target/CPU"
mkdir -p "$cpu_dir/PROCESS" "$cpu_dir/tools" "$cpu_dir/tests" "$cpu_dir/examples/model"

cp "$source_root/AGENTS.md" "$cpu_dir/AGENTS.md"
cp "$source_root/SPEC.md" "$cpu_dir/SPEC.md"
sed 's#CPU/PROCESS/#PROCESS/#g' "$source_root/README.md" > "$cpu_dir/README.md"
cp "$source_root/package.json" "$cpu_dir/package.json"
cp "$source_root/package-lock.json" "$cpu_dir/package-lock.json"
cp "$source_root/CPU/PROCESS/CPU-Artifact-Formats-v1.md" "$cpu_dir/PROCESS/CPU-Artifact-Formats-v1.md"
cp "$source_root/CPU/PROCESS/CPU-Visual-Language-v1.md" "$cpu_dir/PROCESS/CPU-Visual-Language-v1.md"
cp "$source_root/tools/render_model.mjs" "$cpu_dir/tools/render_model.mjs"
cp "$source_root/tools/finish_model.mjs" "$cpu_dir/tools/finish_model.mjs"
cp "$source_root/tools/serve_model.mjs" "$cpu_dir/tools/serve_model.mjs"
cp "$source_root/tests/all.mjs" "$cpu_dir/tests/all.mjs"
cp "$source_root/tests/validate_naming.mjs" "$cpu_dir/tests/validate_naming.mjs"
cp "$source_root/tests/deployment_validation.mjs" "$cpu_dir/tests/deployment_validation.mjs"
cp "$source_root/tests/artifact_validation.mjs" "$cpu_dir/tests/artifact_validation.mjs"
cp "$source_root/examples/model/context.yaml" "$cpu_dir/examples/model/context.yaml"
cp "$source_root/examples/model/pulse.yaml" "$cpu_dir/examples/model/pulse.yaml"
cp "$source_root/examples/model/ui.yaml" "$cpu_dir/examples/model/ui.yaml"
cp "$source_root/examples/model/deployment.yaml" "$cpu_dir/examples/model/deployment.yaml"
cp "$source_root/examples/model/requirements.yaml" "$cpu_dir/examples/model/requirements.yaml"

agents="$target/AGENTS.md"
begin='<!-- cpu-model:begin -->'
end='<!-- cpu-model:end -->'
managed="$temporary/managed-agents.md"
cat > "$managed" <<'EOF'
<!-- cpu-model:begin -->
## CPU model workflow

This repository contains an installed, pinned copy of the Context-Pulse-UI methodology and tools under `CPU/`. The `cpu-model/devmodel` repository is the normative source for the general CPU methodology; this project repository is the source of truth for its concrete semantic model and project-specific instructions.

Before creating, interpreting, validating, rendering, or changing a CPU model, read and follow the complete workflow in `CPU/AGENTS.md`, together with `CPU/SPEC.md` and both specifications under `CPU/PROCESS/`.

The default branch is the normal line for incremental development. Codex is used for local repository execution and may use `git pull` when it can safely synchronize the current project state, then performs local implementation, testing, validation, and model review as relevant. After Codex reports the verified result, the user normally commits and pushes it. Branches, pull requests, and merges are used only when the user explicitly requests them.

Codex may edit semantic YAML when delegated. Project-specific instructions outside this managed block complement the installed methodology. Follow `CPU/AGENTS.md` for the complete incremental workflow, safe synchronization, tests, strict validation, rendering, and interactive review.
<!-- cpu-model:end -->
EOF

if [ -f "$agents" ]; then
  if grep -Fq "$begin" "$agents"; then
    awk -v begin="$begin" -v end="$end" -v managed="$managed" '
      $0 == begin {
        while ((getline line < managed) > 0) print line
        close(managed)
        replacing = 1
        next
      }
      replacing && $0 == end { replacing = 0; next }
      !replacing { print }
      END { if (replacing) exit 42 }
    ' "$agents" > "$temporary/AGENTS.md" || {
      status=$?
      if [ "$status" -eq 42 ]; then
        printf 'Existing CPU instruction block has no closing marker in %s\n' "$agents" >&2
      fi
      exit "$status"
    }
    mv "$temporary/AGENTS.md" "$agents"
  else
    printf '\n' >> "$agents"
    cat "$managed" >> "$agents"
  fi
else
  cp "$managed" "$agents"
fi

printf 'CPU model installed in %s\n' "$cpu_dir"
printf 'Project instructions updated in %s\n' "$agents"
printf 'Install dependencies with: cd "%s" && npm install\n' "$cpu_dir"
