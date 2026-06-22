{ pkgs, ... }:

{
  cachix.enable = false;

  packages = with pkgs; [
    hugo
    just
    nodejs
    oxfmt
    prek
  ];

  enterShell = ''
    echo "Environment ready. Use 'just' to see project commands."
  '';
}
