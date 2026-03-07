{ pkgs, ... }:

{
  cachix.enable = false;

  packages = with pkgs; [
    hugo
    just
    nodePackages.prettier
    pre-commit
  ];

  scripts.serve.exec = ''
    set -eu
    exec hugo server --buildDrafts --port 1313 --noHTTPCache --disableFastRender "$@"
  '';

  scripts.fmt-public.exec = ''
    set -eu
    exec prettier --ignore-path .prettierignore --write "public/**/*"
  '';

  enterShell = ''
    echo "Commands available: serve, fmt-public"
  '';
}
