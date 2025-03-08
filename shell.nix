{pkgs ? import <nixpkgs> {}}: let
  nodejs = pkgs.nodejs-18_x;
  yarn = pkgs.yarn;
in
  pkgs.mkShell {
    buildInputs = [
      nodejs
      yarn
    ];

    shellHook = ''
      export HOME=$PWD
      echo "Starting development server..."
      yarn install --frozen-lockfile
      yarn dev
    '';
  }
