{
  description = "bubble-ai - AI/ML utilities for Bubble Goods";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js
            nodejs_20

            # PostgreSQL client (psql)
            postgresql_16

            # Supabase CLI
            supabase-cli

            # Git (modern version)
            git
          ];

          shellHook = ''
            echo "bubble-ai dev environment"
            echo "  node: $(node --version)"
            echo "  psql: $(psql --version)"
            echo "  supabase: $(supabase --version)"
          '';
        };
      }
    );
}
