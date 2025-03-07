{ pkgs ? import <nixpkgs> {} }:

let
  nodejs = pkgs.nodejs-18_x;
in
pkgs.stdenv.mkDerivation {
  name = "pyprayer";
  src = ./.;  # Assumes this file is in the root of your project

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
    description = "PyPrayer - Islamic Prayer Times Application";
    license = licenses.mit;
    platforms = platforms.linux;
  };
}

