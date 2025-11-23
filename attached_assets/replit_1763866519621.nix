{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.typescript-language-server
    pkgs.nodePackages.prettier
    pkgs.yarn
    pkgs.replitPackages.jest
    pkgs.postgresql
  ];
}
