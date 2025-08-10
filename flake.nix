# run commands for this file:
# nix develop
# file inspiration: https://pyproject-nix.github.io/uv2nix/usage/hello-world.html
{
  description = "Development shell for NostraDavid Hugo";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
    ...
  }: let
    pkgs = nixpkgs.legacyPackages.x86_64-linux;

    serve = pkgs.writeShellApplication {
      name = "serve";
      runtimeInputs = [ pkgs.hugo ];
      text = ''
        set -eu
        hugo server --buildDrafts --port 1313 --noHTTPCache --disableFastRender "$@"
      '';
    };

    format-public = pkgs.writeShellApplication {
      name = "format-public";
      # nodePackages.prettier includes the Node runtime
      runtimeInputs = [ pkgs.nodePackages.prettier ];
      text = ''
        set -eu
        prettier --ignore-path .prettierignore --write "public/**/*"
      '';
    };
  in {
    apps.x86_64-linux = {
      serve = {
        type = "app";
        program = "${self.packages.x86_64-linux.serve}/bin/serve";
      };

      format-public = {
        type = "app";
        program = "${self.packages.x86_64-linux.format-public}/bin/format-public";
      };
    };

    packages.x86_64-linux = {
      # provide a default so the example app keeps working
      default = pkgs.hello;
      serve = serve;
      format-public = format-public;
    };

    devShells.x86_64-linux = {
      default = pkgs.mkShell {
        packages = with pkgs; [
          hugo
          nodePackages.prettier
          pre-commit
        ];

        shellHook = ''
          alias serve='${self.packages.x86_64-linux.serve}/bin/serve'
          alias fmt-public='${self.packages.x86_64-linux.format-public}/bin/format-public'
          echo "Aliases available: serve, fmt-public"
        '';
      };
    };
  };
}
