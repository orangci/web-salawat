{pkgs ? import <nixpkgs> {}}: let
  nodejs = pkgs.nodejs-18_x;
in
  pkgs.stdenv.mkDerivation {
    name = "salawat";
    src = ./.;

    buildInputs = [
      nodejs
      pkgs.yarn
    ];

    buildPhase = ''
      export HOME=$PWD
      yarn install --frozen-lockfile
      yarn build
    '';

    installPhase = ''
      mkdir -p $out
      cp -r .next $out/
      cp -r public $out/
      cp package.json $out/
      cp yarn.lock $out/
      cp next.config.js $out/
    '';

    meta = with pkgs.lib; {
      description = "web-salawāt — Islāmic prayer times webapp";
      license = licenses.mit;
      platforms = platforms.linux;
    };
  }
