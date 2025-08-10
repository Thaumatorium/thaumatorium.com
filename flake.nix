# 
# run commands for this file:
# nix develop .#impure
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
    # This example is only using x86_64-linux
    pkgs = nixpkgs.legacyPackages.x86_64-linux;
  in {
    # Make hello runnable with `nix run`
    apps.x86_64-linux = {
      default = {
        type = "app";
        program = "${self.packages.x86_64-linux.default}/bin/hello";
      };
    };

    # This example provides two different modes of development:
    # - Impurely using uv to manage virtual environments
    # - Pure development using uv2nix to manage virtual environments
    devShells.x86_64-linux = {
      # It is of course perfectly OK to keep using an impure virtualenv workflow and only use uv2nix to build packages.
      # This devShell simply adds Python and undoes the dependency leakage done by Nixpkgs Python infrastructure.
      impure = pkgs.mkShell {
        SOME_VAR = "some val";

        packages = [
          pkgs.hugo
        ];
        shellHook = ''
        '';
      };
    };
  };
}
